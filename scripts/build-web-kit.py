"""Deterministically package the original, offline web-defense examples."""
from pathlib import Path
from hashlib import sha256
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'public/labs/kairon-web'
files = sorted(p for p in KIT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
if not files:
    raise RuntimeError('Web exercise files are missing')
target = ROOT / 'public/downloads/kairon-web.zip'
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        if path.suffix not in {'.md', '.txt', '.py', '.html'}:
            raise ValueError('Unexpected exercise file: ' + path.name)
        path.read_text(encoding='utf-8')
        info = zipfile.ZipInfo('kairon-web/' + path.relative_to(KIT).as_posix(), (2026, 10, 29, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, path.read_bytes())
manifest = {'file': target.name, 'version': 1, 'files': len(files), 'sha256': sha256(target.read_bytes()).hexdigest()}
target.with_suffix('.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(manifest))
