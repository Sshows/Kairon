"""Считает SHA256 собственного учебного файла. Ничего не изменяет."""
from hashlib import sha256
from pathlib import Path

folder = Path(__file__).resolve().parent
content = (folder / "samples" / "original.txt").read_bytes()
fingerprint = sha256(content).hexdigest()
print("Алгоритм: SHA256")
print("Длина:", len(fingerprint))
print("Отпечаток:", fingerprint)
