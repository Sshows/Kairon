"""Разбирает сохранённый ответ. Не обращается к сайтам."""
from pathlib import Path

folder = Path(__file__).resolve().parent
text = (folder / "samples" / "response.txt").read_text(encoding="utf-8")
headers = {}
for line in text.splitlines()[1:]:
    if not line.strip():
        break
    name, value = line.split(":", 1)
    headers[name.lower()] = value.strip()
for name in ["content-security-policy", "x-content-type-options"]:
    if name in headers:
        print(name + ": есть")
    else:
        print(name + ": нет в образце")
