#!/usr/bin/env python3
"""Local process checks; no provider requests. Only synthetic configuration."""
import os,pathlib,subprocess,time,urllib.request,urllib.error
root=pathlib.Path(__file__).resolve().parents[2]
env=os.environ.copy();env.update(NODE_ENV='production')
p=subprocess.run(['node','server/index.js'],cwd=root,env=env,capture_output=True,text=True)
assert p.returncode!=0 and 'not yet verified for deployment' in p.stderr
print('PASS NODE_ENV=production refuses startup, nonzero exit.')
env.update(NODE_ENV='development',SUPABASE_URL='https://isolated-test.supabase.co',SUPABASE_PUBLISHABLE_KEY='sb_publishable_ISOLATED_TEST_ONLY',ALLOWED_ORIGIN='https://staff.example.test',CSRF_SECRET='ISOLATED_TEST_ONLY_NOT_A_REAL_SECRET')
p=subprocess.Popen(['node','server/index.js'],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
 observed=False
 for _ in range(40):
  assert p.poll() is None,'Startup process exited unexpectedly'
  try:urllib.request.urlopen('http://127.0.0.1:3001/staff',timeout=1)
  except urllib.error.HTTPError as e:
   assert e.code==503 and e.read()==b'{"error":"Staff service unavailable"}';observed=True;break
  except urllib.error.URLError:time.sleep(.1)
 assert observed,'No expected fail-closed response'
 print('PASS development entrypoint remains 503 even with syntactically complete synthetic configuration.')
finally:
 p.terminate();p.wait(timeout=5)
