"""Считает ошибки в своей искусственной таблице входов."""
import csv
from collections import Counter
from pathlib import Path

folder = Path(__file__).resolve().parent
failures = Counter()
with (folder / "samples" / "logins.csv").open(encoding="utf-8", newline="") as source:
    for event in csv.DictReader(source):
        if event["result"] == "fail":
            failures[event["ip"]] += 1
for address, count in sorted(failures.items()):
    print(address, "ошибок:", count)
