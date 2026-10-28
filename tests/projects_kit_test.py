"""Execute only Kairon's own small offline programs on copied synthetic data."""
from pathlib import Path
from hashlib import sha256
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "public/labs/kairon-projects"


def run(folder, name):
    result = subprocess.run([sys.executable, "-B", "-X", "utf8", str(folder / name)], cwd=folder, capture_output=True, text=True, encoding="utf-8", timeout=10, check=True)
    return result.stdout


class ProjectsKit(unittest.TestCase):
    def test_archive_reproduces_every_utf8_source_file(self):
        archive = ROOT / "public/downloads/kairon-projects.zip"
        manifest = json.loads(archive.with_suffix(".json").read_text(encoding="utf-8"))
        self.assertEqual(sha256(archive.read_bytes()).hexdigest(), manifest["sha256"])
        files = sorted(path for path in KIT.rglob("*") if path.is_file())
        self.assertEqual(len(files), 15)
        self.assertEqual(len(files), manifest["files"])
        with zipfile.ZipFile(archive) as zipped:
            self.assertEqual(set(zipped.namelist()), {"kairon-projects/" + file.relative_to(KIT).as_posix() for file in files})
            for file in files:
                self.assertEqual(file.read_bytes(), zipped.read("kairon-projects/" + file.relative_to(KIT).as_posix()))
                file.read_text(encoding="utf-8")

    def test_hello_hash_encoding_and_toy_cipher(self):
        self.assertEqual(run(KIT, "hello.py").strip(), "PROJECTS-READY-28")
        output = run(KIT, "hash_lab.py")
        self.assertIn("Длина: 64", output)
        self.assertIn(sha256((KIT / "samples/original.txt").read_bytes()).hexdigest(), output)
        self.assertIn("Вернули: Учебная записка", run(KIT, "base64_lab.py"))
        self.assertIn("Пароль понадобился: нет", run(KIT, "base64_lab.py"))
        self.assertIn("Стало: NDOL", run(KIT, "cipher_lab.py"))

    def test_headers_stop_at_body_and_ignore_case(self):
        self.assertIn("content-security-policy: нет в образце", run(KIT, "headers_lab.py"))
        self.assertIn("x-content-type-options: есть", run(KIT, "headers_lab.py"))
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / "samples").mkdir()
            (folder / "headers_lab.py").write_bytes((KIT / "headers_lab.py").read_bytes())
            (folder / "samples/response.txt").write_text("HTTP/1.1 200 OK\nCoNtEnT-SeCuRiTy-PoLiCy: default-src 'self'\n\nX-Content-Type-Options: body text\n", encoding="utf-8")
            output = run(folder, "headers_lab.py")
            self.assertIn("content-security-policy: есть", output)
            self.assertIn("x-content-type-options: нет в образце", output)

    def test_counts_exclude_success_and_detects_changed_copy(self):
        output = run(KIT, "log_lab.py")
        self.assertIn("192.0.2.44 ошибок: 4", output)
        self.assertIn("198.51.100.8 ошибок: 1", output)
        self.assertIn("copy-a.txt: совпадает", run(KIT, "integrity_lab.py"))
        self.assertIn("copy-b.txt: изменён", run(KIT, "integrity_lab.py"))
        before = {p.relative_to(KIT).as_posix(): p.read_bytes() for p in KIT.rglob("*") if p.is_file()}
        for program in KIT.glob("*.py"):
            run(KIT, program.name)
        after = {p.relative_to(KIT).as_posix(): p.read_bytes() for p in KIT.rglob("*") if p.is_file()}
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
