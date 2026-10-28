"""Package Kairon's own offline teaching examples, never upstream programs."""
from pathlib import Path
from hashlib import sha256
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "public/labs/kairon-projects"
baseline_hash = sha256((KIT / "samples/original.txt").read_bytes()).hexdigest()
(KIT / "samples/baseline.json").write_text(json.dumps({"copy-a.txt": baseline_hash, "copy-b.txt": baseline_hash}, indent=2) + "\n", encoding="utf-8", newline="\n")
files = sorted(path for path in KIT.rglob("*") if path.is_file() and "__pycache__" not in path.parts)
target = ROOT / "public/downloads/kairon-projects.zip"
with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        if path.suffix not in {".py", ".md", ".txt", ".csv", ".json"}:
            raise ValueError("Unexpected kit file: " + path.name)
        path.read_text(encoding="utf-8")
        info = zipfile.ZipInfo("kairon-projects/" + path.relative_to(KIT).as_posix(), (2026, 10, 28, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, path.read_bytes())
manifest = {"file": target.name, "version": 1, "files": len(files), "sha256": sha256(target.read_bytes()).hexdigest()}
target.with_suffix(".json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps(manifest))
