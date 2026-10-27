"""Package only original inert company-case files, deterministically."""
from hashlib import sha256
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "public/labs/kairon-company-lab"


def main():
    target = ROOT / "public/downloads/kairon-company-lab.zip"
    target.parent.mkdir(exist_ok=True)
    files = sorted(path for path in KIT.rglob("*") if path.is_file())
    if not files:
        raise RuntimeError("Company exercise files missing")
    for path in files:
        if path.suffix not in {".txt", ".md", ".csv", ".json", ".jsonl", ".log", ".demo", ".sha256"}:
            raise RuntimeError("Only inert lesson files may be packaged: " + path.name)
        path.read_text(encoding="utf-8")  # No opaque binaries in this kit.
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            info = zipfile.ZipInfo("kairon-company-lab/" + path.relative_to(KIT).as_posix(), date_time=(2026, 10, 27, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())
    manifest = {"file": target.name, "version": 1, "files": len(files), "sha256": sha256(target.read_bytes()).hexdigest()}
    target.with_suffix(".json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
