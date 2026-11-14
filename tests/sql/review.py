#!/usr/bin/env python3
"""Historical pre-redesign SQL tests pinned to their preserved migration snapshot.
Prerequisite: disposable --network none postgres:17 container named below.
No project URL, connection string, key or credentials are accepted by this runner.
"""
import concurrent.futures, hashlib, json, pathlib, subprocess, sys, time, unittest, uuid
ROOT = pathlib.Path(__file__).resolve().parents[2]
CONTAINER = 'mc-p3-sql-review'
DB = 'mc_p3_' + uuid.uuid4().hex[:10]
MIGRATION = (ROOT/'docs/evidence/prompt-03/auth-redesign/previous-migration.sql.txt').read_text()
FIXTURE = (ROOT/'tests/sql/auth-fixture.sql').read_text()

def sql(text, db=DB, ok=True):
    p = subprocess.run(['docker','exec','-i',CONTAINER,'psql','-X','-qAt','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'], input=text, text=True, capture_output=True)
    if ok and p.returncode: raise AssertionError(p.stderr)
    if not ok and not p.returncode: raise AssertionError('Expected SQL denial/failure')
    return (p.stdout.strip() if ok else p.stderr.strip())

def quote(value): return "'" + value.replace("'", "''") + "'"
def claims(u,s,aal='aal2',**extra):
    return dict(sub=u,session_id=s,aal=aal,role='authenticated',exp=int(time.time())+3600,**extra)
def as_user(q,c,role='authenticated'):
    return 'begin; set local role '+role+'; set local request.jwt.claims='+quote(json.dumps(c))+'; '+q+'; commit;'

def new_db():
    name='mc_p3_'+uuid.uuid4().hex[:10]; sql('create database '+name,db='postgres'); sql(FIXTURE,db=name); return name

class Review(unittest.TestCase):
    def setUp(self):
        self.u,self.v,self.s,self.t,self.vs=[str(uuid.uuid4()) for _ in range(5)]
        sql(f"insert into auth.users values ('{self.u}'),('{self.v}'); insert into mc_staff_private.roles(user_id,role,active) values ('{self.u}','wallet_admin',true),('{self.v}','wallet_admin',true); insert into auth.sessions(id,user_id,created_at) values ('{self.s}','{self.u}',clock_timestamp()-interval '1 hour'),('{self.t}','{self.u}',clock_timestamp()-interval '1 hour'),('{self.vs}','{self.v}',clock_timestamp()-interval '1 hour')")
        self.c=claims(self.u,self.s)
    def gate(self,c=None): return sql(as_user('select public.staff_gate()',self.c if c is None else c))
    def seen(self): return sql(f"select last_seen::text from mc_staff_private.sessions where session_id='{self.s}'")
    def age(self,minutes): sql(f"update mc_staff_private.sessions set first_seen=clock_timestamp()-interval '{minutes+1} minutes',last_seen=clock_timestamp()-interval '{minutes} minutes' where session_id='{self.s}'")
    def test_01_first_use_auth_age_over_30_minutes(self):
        self.assertEqual(self.gate(),'allowed')
        self.assertEqual(sql(f"select first_seen > clock_timestamp()-interval '5 seconds' and last_seen>=first_seen from mc_staff_private.sessions where session_id='{self.s}'"),'t')
    def test_02_absolute_expiry_no_initialization(self):
        sql(f"update auth.sessions set created_at=clock_timestamp()-interval '8 hours' where id='{self.s}'")
        self.assertEqual(self.gate(),'unauthenticated'); self.assertEqual(self.seen(),'')
    def test_03_activity_before_idle_extends_monotonically(self):
        self.gate(); self.age(29); before=self.seen(); self.assertEqual(self.gate(),'allowed'); self.assertGreater(self.seen(),before)
    def test_04_idle_expiry_never_revives(self):
        self.gate(); self.age(31); before=self.seen()
        self.assertEqual(self.gate(),'unauthenticated'); self.assertEqual(self.gate(),'unauthenticated'); self.assertEqual(self.seen(),before)
    def test_05_denied_role_aal_and_invalid_input_do_not_touch(self):
        self.gate(); before=self.seen()
        self.assertEqual(self.gate(claims(self.u,self.s,aal='aal1')),'forbidden')
        sql(f"update mc_staff_private.roles set active=false where user_id='{self.u}'")
        self.assertEqual(self.gate(),'forbidden'); self.assertEqual(self.seen(),before)
        sql(f"update mc_staff_private.roles set active=true where user_id='{self.u}'")
        self.assertIn('invalid note',sql(as_user("select public.staff_record_create('')",self.c),ok=False)); self.assertEqual(self.seen(),before)
    def test_06_concurrent_first_and_existing_requests(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(lambda _:self.gate(),range(4)))
        self.assertEqual(results,['allowed']*4)
        self.assertEqual(sql(f"select count(*) from mc_staff_private.sessions where session_id='{self.s}'"),'1')
    def test_07_refresh_same_session_does_not_reset_idle(self):
        self.gate(); self.age(31); before=self.seen(); c=self.c|{'exp':int(time.time())+7200}
        self.assertEqual(self.gate(c),'unauthenticated'); self.assertEqual(self.seen(),before)
        self.assertEqual(self.gate(claims(self.u,self.t)),'allowed')
    def test_08_modeled_logout_deletes_auth_session(self):
        self.gate(); sql(f"delete from auth.sessions where id='{self.s}'")
        self.assertEqual(self.gate(),'unauthenticated'); self.assertEqual(self.seen(),'')
    def test_09_cross_user_and_session_claims(self):
        self.assertEqual(self.gate(claims(self.v,self.s)),'unauthenticated')
        self.assertEqual(self.gate(claims(self.u,self.vs)),'unauthenticated')
        self.assertEqual(self.gate(claims(self.u,self.t)),'allowed')
    def test_10_jwt_and_provider_not_after_expiry(self):
        for c in [self.c|{'exp':int(time.time())-1},self.c|{'exp':'broken'},self.c|{'session_id':'broken'},self.c|{'aal':None},self.c|{'role':'service_role'},{}]:
            self.assertIn(self.gate(c),['forbidden','unauthenticated'])
        sql(f"update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id='{self.s}'")
        self.assertEqual(self.gate(),'unauthenticated'); self.assertEqual(self.seen(),'')
    def test_11_anon_nonstaff_and_forged_metadata(self):
        self.assertIn('permission denied',sql(as_user('select public.staff_gate()',{},role='anon'),ok=False))
        sql(f"delete from mc_staff_private.roles where user_id='{self.v}'")
        self.assertEqual(self.gate(claims(self.v,self.vs)|{'user_metadata':{'role':'wallet_admin'},'app_metadata':{'role':'wallet_admin'}}),'forbidden')
        for q in ['select public.staff_records_list()',"select public.staff_record_create('demo')"]:
            self.assertIn('access denied',sql(as_user(q,claims(self.v,self.vs)),ok=False))
    def test_12_direct_access_and_private_helper_denied(self):
        for role in ['anon','authenticated','service_role']:
            for q in ['select * from mc_staff_private.roles','select * from auth.sessions',"insert into mc_staff_private.roles(user_id,role,active) values ('"+self.u+"','wallet_admin',true)",'select mc_staff_private.gate()']:
                self.assertIn('permission denied',sql(as_user(q,self.c,role=role),ok=False))
    def test_13_function_owner_scope_and_immutable_permissions(self):
        self.gate()
        self.assertEqual(sql(as_user('select count(*) from auth.sessions',self.c,role='mc_staff_executor')),'1')
        self.assertEqual(sql(as_user('select count(*) from mc_staff_private.sessions',claims(self.u,self.t),role='mc_staff_executor')),'0')
        for q in ["update mc_staff_private.roles set active=true",'delete from mc_staff_private.sessions','delete from mc_staff_private.records','update mc_staff_private.audit set action=action']:
            self.assertIn('permission denied',sql(as_user(q,self.c,role='mc_staff_executor'),ok=False))
        self.assertIn('row-level security',sql(as_user(f"insert into mc_staff_private.records(note,created_by) values ('forged','{self.v}')",self.c,role='mc_staff_executor'),ok=False))
    def test_14_record_isolation_and_atomic_audit(self):
        result=sql(as_user("select public.staff_record_create('isolated note')",self.c))
        self.assertEqual(sql(f"select count(*) from mc_staff_private.audit where record_id='{result}' and actor='{self.u}'"),'1')
        self.assertEqual(sql(as_user('select count(*) from public.staff_records_list()',claims(self.v,self.vs))),'0')
        self.assertEqual(sql(as_user('select count(*) from public.staff_records_list()',self.c)),'1')
        self.assertIn('permission denied',sql(as_user('delete from mc_staff_private.audit',self.c),ok=False))
    def test_15_audit_failure_rolls_back_record_and_activity(self):
        self.gate(); before=self.seen()
        sql('revoke insert on mc_staff_private.audit from mc_staff_executor')
        try: self.assertIn('permission denied',sql(as_user("select public.staff_record_create('must rollback')",self.c),ok=False))
        finally: sql('grant insert on mc_staff_private.audit to mc_staff_executor')
        self.assertEqual(sql(f"select count(*) from mc_staff_private.records where created_by='{self.u}'"),'0'); self.assertEqual(self.seen(),before)
    def test_16_catalog_privilege_invariants(self):
        self.assertEqual(sql("select not rolcanlogin and not rolinherit and not rolbypassrls and not rolsuper and not rolcreaterole from pg_roles where rolname='mc_staff_executor'"),'t')
        self.assertEqual(sql("select count(*) from pg_auth_members where roleid='mc_staff_executor'::regrole or member='mc_staff_executor'::regrole"),'0')
        self.assertEqual(sql("select count(*) from pg_class where relowner='mc_staff_executor'::regrole"),'0')
        self.assertEqual(sql("select bool_and(relrowsecurity and relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mc_staff_private' and c.relkind='r'"),'t')
        self.assertEqual(sql("select bool_and(p.prosecdef and p.proowner='mc_staff_executor'::regrole and p.proconfig=array['search_path=\"\"']) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='mc_staff_private' or (n.nspname='public' and p.proname like 'staff_%')"),'t')
        self.assertEqual(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where (n.nspname='mc_staff_private' or (n.nspname='public' and p.proname like 'staff_%')) and a.grantee=0"),'0')
        self.assertEqual(sql("select has_schema_privilege('mc_staff_executor','public','CREATE') or has_table_privilege('mc_staff_executor','auth.sessions','SELECT')"),'f')
    def test_17_repeat_migration_is_atomic_conflict(self):
        self.gate(); before=self.seen(); self.assertIn('object conflict',sql(MIGRATION,ok=False)); self.assertEqual(self.seen(),before)
    def test_18_expiry_during_lock_wait(self):
        self.gate(); self.age(29)
        # Wait until another transaction owns the row, then force it idle-expired.
        marker='mc_p3_hold_'+uuid.uuid4().hex[:6]
        locksql=f"begin; set application_name='{marker}'; update mc_staff_private.sessions set first_seen=clock_timestamp()-interval '32 minutes',last_seen=clock_timestamp()-interval '31 minutes' where session_id='{self.s}'; select pg_sleep(2); commit;"
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            hold=pool.submit(sql,locksql)
            deadline=time.monotonic()+5
            while sql(f"select count(*) from pg_stat_activity where application_name='{marker}' and wait_event='PgSleep'")!='1':
                if time.monotonic()>deadline: self.fail('lock holder not observed')
                time.sleep(.03)
            queued=pool.submit(self.gate)
            hold.result(); self.assertEqual(queued.result(),'unauthenticated')
    def test_19_owner_bypass_semantics_real_postgres(self):
        # Proof that NOLOGIN alone is irrelevant to table-owner RLS bypass.
        sql('create role mc_test_owner nologin; create table public.mc_test_owner_probe(v int); insert into public.mc_test_owner_probe values(1); alter table public.mc_test_owner_probe enable row level security; alter table public.mc_test_owner_probe owner to mc_test_owner')
        try: self.assertEqual(sql('set role mc_test_owner; select count(*) from public.mc_test_owner_probe'),'1')
        finally: sql('drop table public.mc_test_owner_probe; drop role mc_test_owner')
    def test_20_permissive_auth_policy_cannot_widen_scope(self):
        sql('create policy test_public_allow on auth.sessions for select to public using (true)')
        try: self.assertEqual(sql(as_user('select count(*) from auth.sessions',self.c,role='mc_staff_executor')),'1')
        finally: sql('drop policy test_public_allow on auth.sessions')
    def test_21_modeled_logout_during_first_use(self):
        marker='mc_p3_delete_'+uuid.uuid4().hex[:6]
        holdsql=f"begin; set application_name='{marker}'; delete from auth.sessions where id='{self.s}'; select pg_sleep(2); commit;"
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            hold=pool.submit(sql,holdsql)
            deadline=time.monotonic()+5
            while sql(f"select count(*) from pg_stat_activity where application_name='{marker}' and wait_event='PgSleep'")!='1':
                if time.monotonic()>deadline: self.fail('delete transaction not observed')
                time.sleep(.03)
            queued=pool.submit(self.gate); hold.result()
            self.assertEqual(queued.result(),'unauthenticated'); self.assertEqual(self.seen(),'')
    def test_22_noinherit_does_not_prevent_set_role(self):
        sql('create role mc_test_owner nologin; create role mc_test_member nologin noinherit; grant mc_test_owner to mc_test_member')
        try: self.assertEqual(sql("select pg_has_role('mc_test_member','mc_test_owner','SET')"),'t')
        finally: sql('drop role mc_test_member; drop role mc_test_owner')

    def test_23_stale_snapshot_isolation_denied(self):
        self.gate(); before=self.seen()
        for isolation in ['repeatable read','serializable']:
            q=as_user('select public.staff_gate()',self.c).replace('begin;',f'begin isolation level {isolation};')
            self.assertEqual(sql(q),'unauthenticated')
        self.assertEqual(self.seen(),before)
    def test_24_managed_table_owner_permissions_required(self):
        sql('create role mc_test_migrator nologin createrole; grant usage on schema auth to mc_test_migrator')
        try:
            self.assertIn('must be owner',sql('set role mc_test_migrator; create policy test_migrator_policy on auth.sessions for select using (true)',ok=False))
        finally: sql('revoke usage on schema auth from mc_test_migrator; drop role mc_test_migrator')

if __name__=='__main__':
    print('REAL PostgreSQL; synthetic Auth schema and claims; no Supabase provider calls.',flush=True)
    print('Container:',CONTAINER,'Database:',DB,flush=True)
    print(sql('select version()',db='postgres'),flush=True)
    print('Migration SHA256:',hashlib.sha256(MIGRATION.encode()).hexdigest(),flush=True)
    sql('create database '+DB,db='postgres'); sql(FIXTURE); sql(MIGRATION)
    print('Migration applied in isolated DB as PostgreSQL superuser; managed-role permissions remain unverified.',flush=True)
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Review))
    if not result.wasSuccessful(): sys.exit(1)
    # Cluster-wide role names require recovery before another migration application.
    auth_before=sql('select count(*) from auth.users; select count(*) from auth.sessions')
    sql((ROOT/'tests/sql/rollback.sql').read_text())
    assert sql("select to_regnamespace('mc_staff_private') is null")=='t'
    assert auth_before==sql('select count(*) from auth.users; select count(*) from auth.sessions')
    print('PASS: isolated destructive recovery removes staff objects and preserves Auth fixture rows.',flush=True)
    sql(MIGRATION); sql((ROOT/'tests/sql/rollback.sql').read_text())
    print('PASS: corrected migration reapplies after isolated recovery.',flush=True)
    # Existing-object and ambient-privilege conflicts must roll back all changes.
    sql('grant create on schema public to public')
    err=sql(MIGRATION,ok=False)
    assert 'unsafe executor' in err and sql("select to_regnamespace('mc_staff_private') is null")=='t'
    sql('revoke create on schema public from public')
    print('PASS: ambient PUBLIC CREATE privilege causes atomic migration failure.',flush=True)
    sql('alter table auth.sessions drop column not_after')
    err=sql(MIGRATION,ok=False)
    assert 'not_after' in err and sql("select to_regnamespace('mc_staff_private') is null")=='t'
    print('PASS: incompatible managed-schema column causes atomic migration failure.',flush=True)
