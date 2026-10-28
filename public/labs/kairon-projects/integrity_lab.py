"""Сравнивает копии в samples с учебным эталоном. Только чтение."""
import json
from hashlib import sha256
from pathlib import Path

folder = Path(__file__).resolve().parent / "samples"
baseline = json.loads((folder / "baseline.json").read_text(encoding="utf-8"))
for name, expected in sorted(baseline.items()):
    actual = sha256((folder / name).read_bytes()).hexdigest()
    if actual == expected:
        print(name + ": совпадает")
    else:
        print(name + ": изменён")
