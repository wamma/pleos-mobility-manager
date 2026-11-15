"""Verify release manifests, signatures and bundled source without exposing signing secrets."""
from pathlib import Path
from zipfile import ZipFile
import subprocess,hashlib,json,os
root=Path(__file__).resolve().parents[1]
sdk=Path(os.environ.get('ANDROID_HOME',Path.home()/'Library/Android/sdk'))
bt=sdk/'build-tools/35.0.0'; evidence=root/'submission/evidence';evidence.mkdir(parents=True,exist_ok=True)
rows=[]
for idea,name in [('mobility','내이동매니저')]:
 apk=root/'apk/더 많은 사이_내이동매니저_release.apk'; package=f'local.pleos.idealab.{idea}'
 signature=subprocess.check_output([str(bt/'apksigner'),'verify','--verbose','--print-certs',str(apk)],text=True)
 manifest=subprocess.check_output([str(bt/'aapt'),'dump','badging',str(apk)],text=True)
 assert f"name='{package}'" in manifest
 assert "sdkVersion:'28'" in manifest and 'application-debuggable' not in manifest
 assets={}
 with ZipFile(apk) as z:
  for source in [root/'index.html',root/'styles.css',*sorted((root/'src').glob('*.js'))]:
   path=source.relative_to(root).as_posix();data=source.read_bytes()
   assert z.read('assets/'+path)==data,path
   assets[path]=hashlib.sha256(data).hexdigest()
 (evidence/f'{idea}-signature.txt').write_text(signature)
 (evidence/f'{idea}-manifest.txt').write_text(manifest)
 rows.append(dict(idea=idea,path=apk.relative_to(root).as_posix(),sha256=hashlib.sha256(apk.read_bytes()).hexdigest(),packageId=package,version='0.1.0',versionCode=1,minSdk=28,debuggable=False,sourceAssets=assets))
(evidence/'apk-manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Verified release APK signatures, IDs, minSdk, non-debuggable manifests, and exact source assets.')
