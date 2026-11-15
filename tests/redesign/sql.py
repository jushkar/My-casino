#!/usr/bin/env python3
"""Real PostgreSQL, synthetic PostgREST claims, no Auth schema or remote access."""
import concurrent.futures, hashlib, json, os, pathlib, subprocess, sys, time, unittest, uuid
ROOT=pathlib.Path(__file__).resolve().parents[2]
C=os.environ.get('TEST_PG_CONTAINER','mc-p3-auth-redesign'); DB='redesign_'+uuid.uuid4().hex[:10]
M=(ROOT/'docs/evidence/prompt-03/owner-refactor/previous/migration.sql.txt').read_text()
def sql(q,ok=True,db=DB):
 p=subprocess.run(['docker','exec','-i',C,'psql','-XqAt','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True)
 if ok and p.returncode: raise AssertionError(p.stderr)
 if not ok and not p.returncode: raise AssertionError('expected SQL denial')
 return p.stdout.strip() if ok else p.stderr.strip()
def quote(s):return "'"+s.replace("'","''")+"'"
def user(q,c,role='authenticated'):
 return 'begin; set local role '+role+'; set local request.jwt.claims='+quote(json.dumps(c))+'; '+q+'; commit;'
def claims(u,s):return {'sub':u,'session_id':s,'role':'authenticated','aal':'aal2','exp':int(time.time())+3600,'amr':[{'method':'password','timestamp':int(time.time())-20}]}
class SQLTests(unittest.TestCase):
 def setUp(self):
  self.u,self.v,self.s,self.t=[str(uuid.uuid4()) for _ in range(4)];self.cap='a'*64;self.c=claims(self.u,self.s)
  sql(f"insert into mc_staff_private.roles(user_id,role,active) values('{self.u}','wallet_admin',true),('{self.v}','wallet_admin',true)")
 def call(self,name,args='',c=None):return sql(user('select public.'+name+'('+args+')',self.c if c is None else c))
 def open(self):return self.call('staff_session_open',quote(self.cap))
 def gate(self,c=None,cap=None):return self.call('staff_gate',quote(cap or self.cap),c)
 def test_01_no_managed_schema_or_dependencies(self):
  self.assertEqual(sql("select to_regnamespace('auth') is null"),'t')
  self.assertNotIn('auth.sessions',M);self.assertNotIn('auth.users',M)
 def test_02_anonymous_and_nonstaff(self):
  self.assertIn('permission denied',sql(user("select public.staff_gate('"+self.cap+"')",{},'anon'),ok=False))
  sql(f"update mc_staff_private.roles set active=false where user_id='{self.u}'")
  self.assertEqual(self.open(),'forbidden');self.assertEqual(self.gate(),'forbidden')
 def test_03_no_mfa(self):
  self.assertEqual(self.call('staff_session_open',quote(self.cap),self.c|{'aal':'aal1'}),'forbidden')
  self.assertEqual(self.gate(self.c|{'aal':None}),'forbidden')
 def test_04_authorized_open_read_write_audit(self):
  self.assertEqual(self.open(),'allowed');self.assertEqual(self.gate(),'allowed')
  rid=self.call('staff_record_create',quote(self.cap)+",'demo'")
  self.assertEqual(sql(f"select count(*) from mc_staff_private.audit where record_id='{rid}' and actor='{self.u}'"),'1')
  self.assertEqual(sql(user("select note from public.staff_records_list('"+self.cap+"')",self.c)),'demo')
 def test_05_forged_roles_sessions_capabilities(self):
  self.open()
  for c in [self.c|{'session_id':self.t},self.c|{'sub':self.v},self.c|{'role':'admin'}]:self.assertNotEqual(self.gate(c),'allowed')
  self.assertNotEqual(self.gate(cap='b'*64),'allowed')
  sql(f"update mc_staff_private.roles set active=false where user_id='{self.u}'")
  self.assertEqual(self.gate(self.c|{'user_metadata':{'role':'wallet_admin'}}),'forbidden')
 def test_06_expired_provider_token(self):
  self.open();self.assertEqual(self.gate(self.c|{'exp':int(time.time())-1}),'unauthenticated')
 def test_07_primary_auth_bound_and_no_refresh_extension(self):
  self.open();old=self.c|{'amr':[{'method':'password','timestamp':int(time.time())-301}]}
  self.assertNotEqual(self.gate(old),'allowed')
  # A hypothetical freshly issued token cannot extend the saved registry expiry.
  sql(f"update mc_staff_private.sessions set auth_time=statement_timestamp()-interval '6 minutes',expires_at=statement_timestamp()-interval '1 minute' where session_id='{self.s}'")
  refreshed=self.c|{'amr':[{'method':'password','timestamp':int(time.time())}], 'exp':int(time.time())+7200}
  self.assertEqual(self.gate(refreshed),'unauthenticated');self.assertNotEqual(self.open(),'allowed')
 def test_08_logout_tombstone_before_mfa_open(self):
  self.assertEqual(self.call('staff_session_close',c=self.c|{'aal':'aal1'}),'revoked')
  self.assertNotEqual(self.open(),'allowed');self.assertEqual(self.gate(),'unauthenticated')
 def test_09_logout_and_replay(self):
  self.open();self.assertEqual(self.call('staff_session_close'),'revoked')
  self.assertEqual(self.gate(),'unauthenticated');self.assertNotEqual(self.open(),'allowed')
  self.assertEqual(self.call('staff_session_close'),'revoked')
  self.assertEqual(sql(f"select count(*) from mc_staff_private.audit where session_id='{self.s}' and action='session.close'"),'1')
 def test_10_external_logout_residual_is_explicit(self):
  self.open()
  # External revocation is not observable in this DB. Simulate still-valid JWT.
  self.assertEqual(self.gate(),'allowed')
  expired=self.c|{'amr':[{'method':'password','timestamp':int(time.time())-300}]}
  self.assertEqual(self.gate(expired),'unauthenticated')
 def test_11_concurrent_open_close_refresh_replay(self):
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as p:
   tasks=[p.submit(self.open),p.submit(self.call,'staff_session_close'),p.submit(self.open)]
   for t in tasks:t.result()
  self.assertEqual(self.gate(),'unauthenticated')
  self.assertNotEqual(self.gate(self.c|{'exp':int(time.time())+7200}),'allowed')
 def test_12_persistence_across_independent_processes(self):
  self.open();self.call('staff_record_create',quote(self.cap)+",'persistent demo'")
  # Every call is a separate psql process/connection; nothing is in Python memory.
  self.assertEqual(self.gate(),'allowed')
  self.assertIn('persistent demo',self.call('staff_records_list',quote(self.cap)))
  self.call('staff_session_close');self.assertEqual(self.gate(),'unauthenticated')
 def test_13_cross_user_rls_and_no_direct_grants(self):
  self.open();self.call('staff_record_create',quote(self.cap)+",'private'")
  c=claims(self.v,self.t);self.call('staff_session_open',quote('b'*64),c)
  self.assertEqual(self.call('staff_records_list',quote('b'*64),c),'')
  for role in ['anon','authenticated','service_role']:
   for q in ['select * from mc_staff_private.roles','select * from mc_staff_private.sessions','delete from mc_staff_private.audit']:
    self.assertIn('permission denied',sql(user(q,self.c,role),ok=False))
 def test_14_audit_failure_rolls_back(self):
  self.open();sql('revoke insert on mc_staff_private.audit from mc_staff_executor')
  try:self.assertIn('permission denied',sql(user("select public.staff_record_create('"+self.cap+"','rollback')",self.c),ok=False))
  finally:sql('grant insert on mc_staff_private.audit to mc_staff_executor')
  self.assertEqual(sql(f"select count(*) from mc_staff_private.records where created_by='{self.u}'"),'0')
 def test_15_catalog_privileges(self):
  self.assertEqual(sql("select count(*) from pg_auth_members where member='mc_staff_executor'::regrole or (roleid='mc_staff_executor'::regrole and not (member='mc_migrator'::regrole and admin_option and not inherit_option and not set_option))"),'0')
  self.assertEqual(sql("select count(*) from pg_class where relowner='mc_staff_executor'::regrole"),'0')
  self.assertEqual(sql("select not rolcanlogin and not rolinherit and not rolbypassrls and not rolsuper from pg_roles where rolname='mc_staff_executor'"),'t')
  self.assertEqual(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(proacl,acldefault('f',proowner))) a where (n.nspname='mc_staff_private' or (n.nspname='public' and proname like 'staff_%')) and a.grantee=0"),'0')
 def test_16_fixation_cannot_replace_existing_cap(self):
  self.open();self.assertNotEqual(self.call('staff_session_open',quote('b'*64)),'allowed');self.assertEqual(self.gate(),'allowed')
 def test_17_repeat_migration_fails_atomically(self):
  self.open();self.assertIn('object conflict',sql(M,ok=False));self.assertEqual(self.gate(),'allowed')
 def test_18_disabled_staff_can_logout(self):
  self.open();sql(f"update mc_staff_private.roles set active=false where user_id='{self.u}'")
  self.assertEqual(self.call('staff_session_close'),'revoked')
 def test_19_executor_cannot_delete_or_extend_session(self):
  self.open()
  for q in ['delete from mc_staff_private.sessions',"update mc_staff_private.sessions set expires_at=clock_timestamp()+interval '1 day'"]:
   self.assertIn('permission denied',sql(user(q,self.c,'mc_staff_executor'),ok=False))
 def test_20_no_password_auth_claim_fails_closed(self):
  for amr in [[],None,[{'method':'totp','timestamp':int(time.time())}]]:
   self.assertNotEqual(self.call('staff_session_open',quote(self.cap),self.c|{'amr':amr}),'allowed')
 def test_21_rls_under_executor_and_audit_forgery(self):
  self.open();rid=self.call('staff_record_create',quote(self.cap)+",'owned'")
  other=claims(self.v,self.t)
  self.assertEqual(sql(user('select count(*) from mc_staff_private.records',other,'mc_staff_executor')),'0')
  for values in [f"'{self.v}','record.create','{self.s}','{rid}'",f"'{self.u}','record.create','{self.t}','{rid}'"]:
   self.assertIn('row-level security',sql(user('insert into mc_staff_private.audit(actor,action,session_id,record_id) values('+values+')',self.c,'mc_staff_executor'),ok=False))
  self.assertEqual(sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mc_staff_private' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity"),'4')
 def test_22_close_races_with_write(self):
  self.open()
  def write():return sql(user("select public.staff_record_create('"+self.cap+"','racing')",self.c),ok=True)
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   w=pool.submit(write);c=pool.submit(self.call,'staff_session_close')
   try:w.result()
   except AssertionError as e:self.assertIn('access denied',str(e))
   self.assertEqual(c.result(),'revoked')
  self.assertIn('access denied',sql(user("select public.staff_record_create('"+self.cap+"','after close')",self.c),ok=False))
 def test_23_first_use_requires_fresh_password(self):
  # Deliberate replacement of the old 30m idle/8h absolute proposal, not an idle bug.
  old=self.c|{'amr':[{'method':'password','timestamp':int(time.time())-1801}]}
  self.assertNotEqual(self.call('staff_session_open',quote(self.cap),old),'allowed')
  self.assertEqual(sql(f"select count(*) from mc_staff_private.sessions where session_id='{self.s}'"),'0')
 def test_24_recovery_transaction_can_be_rolled_back(self):
  self.open()
  recovery=(ROOT/'tests/redesign/recovery.sql').read_text()
  sql('begin;'+recovery+'rollback;')
  self.assertEqual(self.gate(),'allowed')
if __name__=='__main__':
 print('Real PostgreSQL, no Auth schema; synthetic PostgREST claims. No live provider calls.',flush=True)
 print('Isolated container',C,'database',DB,flush=True)
 print(sql('select version()',db='postgres'),flush=True);print('Migration SHA256',hashlib.sha256(M.encode()).hexdigest(),flush=True)
 sql('create database '+DB,db='postgres')
 sql("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role mc_migrator nologin createrole; end if; end $$; grant create on database "+DB+' to mc_migrator; grant create,usage on schema public to mc_migrator with grant option;')
 # Exercise a non-superuser owner of application objects, not an Auth owner.
 sql('set role mc_migrator; '+M)
 print('Migration applied as non-superuser CREATEROLE mc_migrator; no Auth schema.',flush=True)
 result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(SQLTests))
 if result.wasSuccessful():
  # Destructive recovery only in this disposable, network-isolated test database.
  sql('begin;'+(ROOT/'tests/redesign/recovery.sql').read_text()+'commit;')
  assert sql("select to_regnamespace('mc_staff_private') is null")=='t'
  sql('set role mc_migrator; '+M)
  print('Disposable recovery and clean reapply: PASS',flush=True)
 sys.exit(not result.wasSuccessful())
