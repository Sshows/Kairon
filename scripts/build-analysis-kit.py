"""Package only Kairon's original inert evidence; no binary samples or programs."""
from pathlib import Path
from hashlib import sha256
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
KIT=ROOT/'public/labs/kairon-analysis'
files=sorted(path for path in KIT.rglob('*') if path.is_file())
if not files: raise RuntimeError('Analysis teaching files missing')
target=ROOT/'public/downloads/kairon-analysis.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        if path.suffix not in {'.md','.txt','.csv','.json','.jsonl','.log'}: raise ValueError('Unexpected sample type: '+path.name)
        path.read_text(encoding='utf-8')
        if path.read_bytes().startswith((b'MZ',b'\x7fELF')): raise ValueError('Executable headers not allowed')
        info=zipfile.ZipInfo('kairon-analysis/'+path.relative_to(KIT).as_posix(),(2026,10,28,0,0,0))
        info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(info,path.read_bytes())
manifest={'file':target.name,'version':1,'files':len(files),'sha256':sha256(target.read_bytes()).hexdigest()}
target.with_suffix('.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(manifest))
