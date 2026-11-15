#!/usr/bin/env python3
"""Selected credential-pattern / server-canary scan. Never prints matching values."""
import pathlib,re,subprocess
root=pathlib.Path(__file__).resolve().parents[2]
canary='ISOLATED_SERVER_BUILD_CANARY_NOT_A_SECRET'
patterns=[r'sb_secret_[A-Za-z0-9_-]{16,}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',r'postgres(?:ql)?://[^\s:/]+:[^\s@]+@',r'gh[pousr]_[A-Za-z0-9]{30,}']
files=list((root/'dist').rglob('*'))
paths=subprocess.check_output(['git','diff','--name-only'],cwd=root,text=True).splitlines()+subprocess.check_output(['git','diff','--cached','--name-only'],cwd=root,text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=root,text=True).splitlines()
files+= [root/p for p in paths]
count=0
for p in set(files):
 if not p.is_file() or p.suffix in ['.png','.jpg','.webp','.pyc']:continue
 text=p.read_text(errors='replace');count+=1
 if root/'dist' in p.parents:
  assert canary not in text, 'Server-only canary in client build'
  for name in ['SUPABASE_SERVICE_ROLE','CSRF_SECRET','mc_staff_private','__Host-mc-auth','__Host-mc-staff','mc_owner_private','__Host-mc-owner','OWNER_DATABASE_URL','OWNER_TOKEN_KEY']:
   assert name not in text,'Privileged implementation identifier in client build'
 for pat in patterns:
  assert not re.search(pat,text),'Potential credential pattern in '+str(p.relative_to(root))
print('PASS selected credential patterns in',count,'source/evidence/build files; no matching values printed.')
print('PASS client bundle server-only synthetic canary and privileged identifiers absent.')
print('Scope: selected patterns only; not a comprehensive secret audit. No provider credentials configured.')
