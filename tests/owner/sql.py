#!/usr/bin/env python3
"""Real, isolated PostgreSQL. Synthetic claims, NO Supabase Auth/PostgREST."""
import concurrent.futures,hashlib,json,os,pathlib,secrets,subprocess,sys,time,unittest,uuid
ROOT=pathlib.Path(__file__).resolve().parents[2]
C=os.environ.get('TEST_PG_CONTAINER','mc-p3-owner'); DB='owner_'+uuid.uuid4().hex[:10]
M=(ROOT/'supabase/migrations/20261113231743_staff_foundation.sql').read_text()
def sql(q,ok=True,db=DB):
 p=subprocess.run(['docker','exec','-i',C,'psql','-XqAt','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True)
 if ok and p.returncode:raise AssertionError(p.stderr)
 if not ok and not p.returncode:raise AssertionError('expected SQL denial')
 return p.stdout.strip() if ok else p.stderr.strip()
def quote(s):return "'"+s.replace("'","''")+"'"
def call(role,q,c=None,ok=True):
 settings='' if c is None else 'set local request.jwt.claims='+quote(json.dumps(c))+';'
 return sql('begin;set local role '+role+';'+settings+q+';commit;',ok=ok)
def shape(u,s):
 n=int(time.time());return dict(sub=u,session_id=s,role='authenticated',aal='aal2',aud='authenticated',iss='https://isolated-test.supabase.co/auth/v1',iat=n-1,exp=n+299,amr=[dict(method='password',timestamp=n-20),dict(method='totp',timestamp=n-10)])
def digest(v):return hashlib.sha256(v.encode()).hexdigest()
class Tests(unittest.TestCase):
 def setUp(self):
  sql('truncate mc_owner_private.audit,mc_owner_private.records,mc_owner_private.permits,mc_owner_private.sessions,mc_owner_private.binding')
  self.u,self.other,self.sid,self.id=[str(uuid.uuid4()) for _ in range(4)]
  self.cap=secrets.token_hex(32);self.c=shape(self.u,self.sid)
 def operator(self,fn,args,ok=True):return call('mc_owner_operator','select mc_owner_private.'+fn+'('+args+')',ok=ok)
 def provision(self):return self.operator('provision_owner',quote(self.u)+",'isolated approval','isolated test only'")
 def begin(self,c=None,cap=None,id=None,ok=True):
  args=','.join([quote(id or self.id),quote(cap or self.cap),quote(json.dumps(c or self.c)),"'encrypted-isolated-fixture'"])
  return call('mc_owner_gateway','select mc_owner_private.gateway_begin('+args+')',ok=ok)
 def permit(self,action='status',note='',c=None,ok=True):
  nonce=secrets.token_hex(32)
  q='select mc_owner_private.gateway_permit('+','.join([quote(self.cap),quote(json.dumps(c or self.c)),quote(action),quote(digest(note)),quote(nonce)])+')'
  r=call('mc_owner_gateway',q,ok=ok);return nonce if ok else r
 def action(self,nonce,action='status',note=None,c=None,id=None,role='authenticated',ok=True):
  return call(role,'select public.owner_action('+','.join([quote(id or self.id),quote(nonce),quote(action),'null' if note is None else quote(note)])+')',c or self.c,ok)
 def active(self):self.provision();self.begin();self.action(self.permit('enter'),'enter')
 def close(self):return call('mc_owner_gateway','select mc_owner_private.gateway_close('+quote(self.cap)+')')
 def test_01_zero_owner_denies_and_no_managed_dependencies(self):
  self.assertIn('access denied',self.begin(ok=False));self.assertEqual(sql('select count(*) from mc_owner_private.binding'),'0')
  self.assertEqual(sql("select to_regnamespace('auth') is null"),'t')
  for forbidden in ['auth.sessions','auth.users','wallet_admin']:self.assertNotIn(forbidden,M)
 def test_02_singleton_and_provision_audit_atomicity(self):
  self.assertIn('check constraint',self.operator('provision_owner',quote(self.u)+",null,'no approval'",ok=False))
  self.assertEqual(sql('select count(*) from mc_owner_private.binding'),'0')
  self.provision();self.assertIn('duplicate key',self.operator('provision_owner',quote(self.other)+",'test','test'",ok=False))
  self.assertEqual(sql('select count(*) from mc_owner_private.binding'),'1')
  self.assertEqual(sql("select count(*) from mc_owner_private.audit where action='owner.provision'"),'1')
  self.assertIn('check constraint',sql("insert into mc_owner_private.binding values(2,'"+self.other+"',true,1,clock_timestamp())",ok=False))
 def test_03_no_browser_or_gateway_provisioning(self):
  for role in ['anon','authenticated','service_role','mc_owner_gateway']:
   self.assertIn('permission denied',call(role,"select mc_owner_private.provision_owner('"+self.u+"','test','test')",self.c,ok=False))
 def test_04_nonowner_anonymous_and_missing_mfa(self):
  self.provision();non=self.c|{'sub':self.other,'user_metadata':{'role':'owner'}}
  self.assertIn('access denied',self.begin(c=non,ok=False))
  self.assertIn('permission denied',self.action('a'*64,role='anon',ok=False))
  self.begin()
  for aal in ['aal1',None]:self.assertIn('MFA required',self.permit('enter',c=self.c|{'aal':aal},ok=False))
 def test_05_owner_entry_records_and_audit(self):
  self.active();nonce=self.permit('record.create','demo')
  self.assertIn('record',self.action(nonce,'record.create','demo'))
  self.assertIn('demo',self.action(self.permit('records.read'),'records.read'))
  self.assertEqual(sql("select count(*) from mc_owner_private.audit where action='record.create' and owner_id='"+self.u+"'"),'1')
 def test_06_direct_rpc_without_bff_permit(self):
  self.active()
  for c in [self.c,self.c|{'user_metadata':{'owner':True}},self.c|{'sub':self.other}]:
   self.assertIn('ERROR',self.action(secrets.token_hex(32),c=c,ok=False))
  self.assertIn('permission denied',call('authenticated',"select mc_owner_private.gateway_permit('"+self.cap+"','{}','status','"+digest('')+"','"+'a'*64+"')",self.c,ok=False))
  self.assertIn('permission denied',call('mc_owner_gateway',"select public.owner_action('"+self.id+"','"+'a'*64+"','status',null)",self.c,ok=False))
 def test_07_permit_bound_to_payload_action_claims_session(self):
  self.active();n=self.permit('record.create','safe')
  for kwargs in [dict(action='record.create',note='safe',c=self.c|{'aal':'aal1'}),dict(action='record.create',note='safe',c=self.c|{'sub':self.other}),dict(note='changed',action='record.create'),dict(action='records.read'),dict(action='record.create',note='safe',c=self.c|{'iat':self.c['iat']+1}),dict(action='record.create',note='safe',id=str(uuid.uuid4()))]:
   self.assertIn('ERROR',self.action(n,ok=False,**kwargs))
  self.assertIn('record',self.action(n,'record.create','safe'))
  self.assertIn('used permit',self.action(n,'record.create','safe',ok=False))
 def test_08_idle_expiry_no_revival_or_activity(self):
  self.active();n=self.permit()
  sql("update mc_owner_private.sessions set last_seen=clock_timestamp()-interval '30 minutes' where id='"+self.id+"'")
  before=sql('select last_seen from mc_owner_private.sessions')
  self.assertIn('expired',self.action(n,ok=False));self.assertEqual(sql('select last_seen from mc_owner_private.sessions'),before)
  self.assertIn('expired',self.permit(ok=False));self.assertIn('duplicate key',self.begin(cap=secrets.token_hex(32),id=str(uuid.uuid4()),ok=False))
 def test_09_activity_does_not_extend_absolute_lifetime(self):
  self.active();before=sql('select absolute_until from mc_owner_private.sessions')
  sql("update mc_owner_private.sessions set last_seen=clock_timestamp()-interval '29 minutes'")
  self.action(self.permit());self.assertEqual(sql('select absolute_until from mc_owner_private.sessions'),before)
  self.assertEqual(sql("select last_seen>clock_timestamp()-interval '10 seconds' from mc_owner_private.sessions"),'t')
 def test_10_absolute_expiry_even_with_new_provider_token(self):
  self.active();n=self.permit()
  sql("update mc_owner_private.sessions set absolute_until=clock_timestamp()-interval '1 second'")
  self.assertIn('expired',self.action(n,ok=False));self.assertIn('expired',self.permit(c=shape(self.u,self.sid),ok=False))
 def test_11_provider_token_expiry_and_overlong_ttl(self):
  self.active();n=self.permit()
  for c in [self.c|{'aud':'different-api'},self.c|{'aud':None},self.c|{'exp':int(time.time())-1},self.c|{'exp':self.c['iat']+3600}]:self.assertIn('sign in required',self.action(n,c=c,ok=False))
 def test_12_disablement_invalidates_existing_permits(self):
  self.active();n=self.permit()
  self.operator('disable_owner',quote(self.u)+",'test approval','disable test'")
  self.assertIn('access denied',self.action(n,ok=False));self.assertEqual(sql('select revoked_at is not null from mc_owner_private.sessions'),'t')
  self.close() # logout remains available, even after disablement
 def test_13_operator_recovery_preserves_history_revokes_old_sessions(self):
  self.active();self.action(self.permit('record.create','old owner'),'record.create','old owner')
  args=quote(self.u)+','+quote(self.other)+",'test approval','recover test'"
  self.assertIn('disable and verify',self.operator('recover_owner',args,ok=False))
  self.operator('disable_owner',quote(self.u)+",'test','test'");self.operator('recover_owner',args)
  self.assertEqual(sql('select user_id from mc_owner_private.binding'),self.other)
  self.assertEqual(sql('select count(*) from mc_owner_private.records'),'1')
  self.assertIn('access denied',self.begin(ok=False))
  self.assertEqual(sql("select count(*) from mc_owner_private.audit where action='owner.recover' and previous_owner='"+self.u+"'"),'1')
 def test_14_revocation_and_old_capability_identity_reuse(self):
  self.active();n=self.permit();self.close();self.close()
  self.assertIn('expired or revoked',self.action(n,ok=False))
  self.assertIn('duplicate key',self.begin(id=str(uuid.uuid4()),cap=secrets.token_hex(32),ok=False))
  self.assertEqual(sql("select count(*) from mc_owner_private.audit where action='session.close'"),'1')
 def test_15_logout_during_pending_entry(self):
  self.provision();self.begin();n=self.permit('enter');self.close()
  self.assertIn('revoked',self.action(n,'enter',ok=False))
 def test_16_sensitive_actions_require_recent_totp(self):
  self.active();old=self.c|{'amr':[dict(method='password',timestamp=int(time.time())-1000),dict(method='totp',timestamp=int(time.time())-400)]}
  # Real Auth keeps the initial password timestamp. Move test fixture consistently.
  sql("update mc_owner_private.sessions set auth_time=to_timestamp("+str(old['amr'][0]['timestamp'])+"),absolute_until=to_timestamp("+str(old['amr'][0]['timestamp'])+")+interval '8 hours'")
  self.action(self.permit(c=old),c=old)
  n=self.permit('record.create','stepup',c=old)
  self.assertIn('fresh MFA required',self.action(n,'record.create','stepup',c=old,ok=False))
  fresh=old|{'amr':[old['amr'][0],dict(method='totp',timestamp=int(time.time()))]}
  self.assertIn('record',self.action(self.permit('record.create','stepup',c=fresh),'record.create','stepup',c=fresh))
 def test_17_permit_expires_during_auth_outage_residual(self):
  self.active();n=self.permit();self.action(n)
  # A previously verified permit has a documented <=10s in-flight residual,
  # not a guarantee of continuous Auth availability. No new permit can be
  # minted by direct RPC callers, even if their external JWT remains valid.
  n=self.permit();sql("update mc_owner_private.permits set expires_at=clock_timestamp()-interval '1 second' where permit_hash='"+digest(n)+"'")
  self.assertIn('invalid or used',self.action(n,ok=False))
 def test_18_concurrent_replay_exactly_one_success(self):
  self.active();n=self.permit('record.create','once')
  def attempt():
   try:self.action(n,'record.create','once');return True
   except AssertionError as e:self.assertIn('used permit',str(e));return False
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:self.assertEqual(sum(pool.map(lambda _:attempt(),range(2))),1)
  self.assertEqual(sql('select count(*) from mc_owner_private.records'),'1')
 def test_19_concurrent_activity_logout_and_disable(self):
  self.active();n=self.permit('record.create','racing')
  def write():
   try:self.action(n,'record.create','racing')
   except AssertionError as e:self.assertTrue('expired or revoked' in str(e) or 'access denied' in str(e))
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
   futures=[pool.submit(write),pool.submit(self.close),pool.submit(self.operator,'disable_owner',quote(self.u)+",'test','test'")]
   for f in futures:f.result()
  self.assertIn('access denied',self.action(n,'record.create','racing',ok=False))
 def test_20_refresh_state_survives_independent_connections(self):
  self.active()
  # This real transaction is the lock used by the BFF around network refresh.
  call('mc_owner_gateway',"select mc_owner_private.gateway_lock('"+self.cap+"');select mc_owner_private.gateway_save('"+self.cap+"',"+quote(json.dumps(self.c))+",'rotated-encrypted-fixture')")
  self.assertIn('rotated-encrypted-fixture',call('mc_owner_gateway',"select mc_owner_private.gateway_lock('"+self.cap+"')"))
  self.action(self.permit('record.create','persistent'),'record.create','persistent')
  self.assertIn('persistent',self.action(self.permit('records.read'),'records.read'));self.close()
  self.assertIn('revoked',self.permit(ok=False))
 def test_21_rls_and_grants(self):
  self.active();self.action(self.permit('record.create','private'),'record.create','private')
  for role in ['anon','authenticated','service_role','mc_owner_gateway']:
   for table in ['binding','sessions','permits','records','audit']:
    self.assertIn('permission denied',call(role,'select * from mc_owner_private.'+table,self.c,ok=False))
  self.assertEqual(call('mc_owner_executor',"select set_config('mc_owner.user_id','"+self.other+"',true);select count(*) from mc_owner_private.records").splitlines()[-1],'0')
  self.assertIn('permission denied',call('mc_owner_executor','delete from mc_owner_private.audit',ok=False))
 def test_22_audit_failure_rolls_back_record_activity_and_permit(self):
  self.active();n=self.permit('record.create','rollback');before=sql('select last_seen from mc_owner_private.sessions')
  sql('revoke insert on mc_owner_private.audit from mc_owner_executor')
  try:self.assertIn('permission denied',self.action(n,'record.create','rollback',ok=False))
  finally:sql('grant insert on mc_owner_private.audit to mc_owner_executor')
  self.assertEqual(sql('select count(*) from mc_owner_private.records'),'0');self.assertEqual(sql('select last_seen from mc_owner_private.sessions'),before)
  self.assertEqual(sql("select used_at is null from mc_owner_private.permits where permit_hash='"+digest(n)+"'"),'t')
 def test_23_executor_not_owner_or_bypass_and_no_public_execute(self):
  self.assertEqual(sql("select count(*) from pg_class where relowner in ('mc_owner_executor'::regrole,'mc_owner_operator'::regrole,'mc_owner_gateway'::regrole)"),'0')
  self.assertEqual(sql("select count(*) from pg_roles where rolname like 'mc_owner_%' and (rolcanlogin or rolsuper or rolbypassrls or rolinherit or rolcreaterole)"),'0')
  self.assertEqual(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(proacl,acldefault('f',proowner))) a where (n.nspname='mc_owner_private' or (n.nspname='public' and proname='owner_action')) and a.grantee=0"),'0')
  self.assertEqual(sql("select count(*) from pg_auth_members where member in ('mc_owner_executor'::regrole,'mc_owner_operator'::regrole,'mc_owner_gateway'::regrole) or (roleid in ('mc_owner_executor'::regrole,'mc_owner_operator'::regrole,'mc_owner_gateway'::regrole) and not(member='mc_migrator'::regrole and admin_option and not inherit_option and not set_option))"),'0')
 def test_24_repeat_migration_conflict_is_atomic(self):
  self.active();self.assertIn('foundation conflict',sql(M,ok=False));self.action(self.permit())
 def test_25_transaction_start_is_not_wall_clock(self):
  self.active();n=self.permit();sql("update mc_owner_private.sessions set last_seen=clock_timestamp()-interval '30 minutes'+interval '1 second'")
  q="select pg_sleep(1.2);select public.owner_action('"+self.id+"','"+n+"','status',null)"
  self.assertIn('expired',call('authenticated',q,self.c,ok=False))
 def test_26_cross_session_capabilities_and_long_lived_identity_immutable(self):
  self.active()
  self.assertIn('sign in required',call('mc_owner_gateway',"select mc_owner_private.gateway_lock('"+secrets.token_hex(32)+"')",ok=False))
  changed=self.c|{'session_id':str(uuid.uuid4())}
  self.assertIn('identity changed',call('mc_owner_gateway',"select mc_owner_private.gateway_save('"+self.cap+"',"+quote(json.dumps(changed))+",'replacement')",ok=False))
  for column in ['auth_time','absolute_until','provider_session_id','cap_hash']:
   self.assertIn('permission denied',call('mc_owner_executor','update mc_owner_private.sessions set '+column+'='+column,ok=False))
 def test_27_recovery_rollback_and_forged_audit_actor(self):
  self.active()
  cleanup=(ROOT/'tests/owner/recovery.sql').read_text()
  sql('begin;'+cleanup+'rollback;');self.action(self.permit())
  q="select set_config('mc_owner.user_id','"+self.u+"',true);select set_config('mc_owner.cap_hash','"+digest(self.cap)+"',true);insert into mc_owner_private.audit(owner_id,actor_kind,action,session_id) values('"+self.other+"','owner','session.close','"+self.id+"')"
  self.assertIn('row-level security',call('mc_owner_executor',q,ok=False))
 def test_28_owner_binding_fields_cannot_be_changed_by_executor(self):
  self.provision()
  for col in ['user_id','enabled','generation']:
   self.assertIn('permission denied',call('mc_owner_executor','update mc_owner_private.binding set '+col+'='+col,ok=False))
 def test_29_gateway_attests_claims_but_cannot_mint_provider_identity(self):
  # Deliberately unverified JSON: gateway is a trusted BFF attestor, not an Auth
  # verifier. It CAN create pending state/permits for the already-bound owner.
  # This power cannot substitute for PostgREST's independent signed user JWT.
  self.provision();self.begin();n=self.permit('enter')
  self.assertEqual(sql("select count(*) from mc_owner_private.audit where action='session.pending'"),'1')
  self.assertIn('permission denied',self.action(n,'enter',role='mc_owner_gateway',ok=False))
  self.assertIn('access denied',self.action(n,'enter',c=self.c|{'sub':self.other},ok=False))
  self.assertIn('permission denied',self.operator_attempt_as_gateway())
  self.assertEqual(sql('select count(*) from mc_owner_private.sessions where activated_at is not null'),'0')
 def operator_attempt_as_gateway(self):
  return call('mc_owner_gateway',"select mc_owner_private.recover_owner('"+self.u+"','"+self.other+"','forged approval','isolated adversarial test')",ok=False)
if __name__=='__main__':
 print('Real isolated PostgreSQL; synthetic gateway/PostgREST principals and claims. No Auth service, provider network or real identities.',flush=True)
 print('Container',C,'database',DB,flush=True);print(sql('select version()',db='postgres'),flush=True)
 print('Migration SHA256',hashlib.sha256(M.encode()).hexdigest(),flush=True)
 sql('create database '+DB,db='postgres')
 sql("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role mc_migrator nologin createrole;end if;end $$;grant create on database "+DB+" to mc_migrator;grant create,usage on schema public to mc_migrator with grant option;")
 sql('set role mc_migrator;'+M)
 print('Applied as non-superuser mc_migrator, no managed Auth schema.',flush=True)
 result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests))
 if result.wasSuccessful():
  sql('begin;'+(ROOT/'tests/owner/recovery.sql').read_text()+'commit;')
  assert sql("select to_regnamespace('mc_owner_private') is null")=='t'
  sql('set role mc_migrator;'+M)
  print('Disposable cleanup / clean reapply: PASS',flush=True)
 sys.exit(not result.wasSuccessful())
