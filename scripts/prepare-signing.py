"""Create a local prototype release identity OUTSIDE the repository; never print secrets."""
import os
import secrets
import subprocess
from pathlib import Path

root = Path.home() / 'Library/Application Support/PleosIdeaLabSigning'
root.mkdir(parents=True, exist_ok=True)
root.chmod(0o700)
props = root / 'release.properties'
if not props.exists():
    key = root / 'prototype-release.jks'
    if key.exists():
        raise SystemExit('Existing key found without properties; preserve it and recover credentials manually.')
    password = secrets.token_urlsafe(32)
    env = {**os.environ, 'PLEOS_KEY_PASSWORD': password}
    subprocess.run(['keytool','-genkeypair','-keystore',str(key),'-storetype','PKCS12','-alias','pleos-prototype','-keyalg','RSA','-keysize','3072','-validity','3650','-storepass:env','PLEOS_KEY_PASSWORD','-keypass:env','PLEOS_KEY_PASSWORD','-dname','CN=Pleos Idea Lab Prototype'], env=env,check=True,stdout=subprocess.DEVNULL)
    key.chmod(0o600)
    props.write_text(f'storeFile={key}\nstorePassword={password}\nkeyAlias=pleos-prototype\nkeyPassword={password}\n')
    props.chmod(0o600)
print(f'Local signing properties: {props} (contents not printed)')
