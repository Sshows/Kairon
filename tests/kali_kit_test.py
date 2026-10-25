"""Check actual downloadable fixtures, the loopback server, and PCAP checksums."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
from hashlib import sha256
import http.client
import json
import os
import shutil
import signal
import struct
import subprocess
import tempfile
import time
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "public/labs/kairon-kali-lab"


def internet_checksum(data):
    if len(data) % 2:
        data += b"\0"
    total = sum(struct.unpack("!" + "H" * (len(data) // 2), data))
    while total >> 16:
        total = (total & 65535) + (total >> 16)
    return (~total) & 65535


class KaliKitTest(unittest.TestCase):
    def test_archive_and_manifest_match_every_source(self):
        target = ROOT / "public/downloads/kairon-kali-lab.zip"
        manifest = json.loads((target.parent / "kairon-kali-lab.json").read_text())
        self.assertEqual(manifest["sha256"], sha256(target.read_bytes()).hexdigest())
        with zipfile.ZipFile(target) as archive:
            self.assertEqual(len(archive.infolist()), manifest["files"])
            for item in archive.infolist():
                name = Path(item.filename)
                self.assertFalse(name.is_absolute())
                self.assertNotIn("..", name.parts)
                self.assertEqual(name.parts[0], "kairon-kali-lab")
                source = KIT.joinpath(*name.parts[1:])
                self.assertEqual(archive.read(item), source.read_bytes())
                self.assertNotIn("runtime", name.parts)
                self.assertNotIn("__pycache__", name.parts)
                self.assertFalse(item.filename.endswith((".exe", ".com", ".sh")))

    def test_practice_observations_are_present_in_real_files(self):
        self.assertIn("KLR-READY-2026", (KIT / "READY.txt").read_text(encoding="utf-8"))
        log = (KIT / "logs/auth.log").read_text()
        self.assertEqual(log.count("Failed password"), 5)
        self.assertIn("Accepted password for learner from 198.51.100.23", log)
        final_log = (KIT / "case-final/auth.log").read_text()
        self.assertEqual(final_log.count("Failed password"), 4)
        self.assertIn("Accepted password for learner from 203.0.113.44", final_log)
        clean = (KIT / "integrity/clean.txt").read_bytes()
        self.assertNotEqual(clean, (KIT / "integrity/received.txt").read_bytes())
        self.assertEqual((KIT / "integrity/SHA256SUMS").read_text().split()[0], sha256(clean).hexdigest())
        self.assertIn("RESTORE-OK-42", (KIT / "recovery/backup/plan.txt").read_text(encoding="utf-8"))
        self.assertIn("@office-payments.invalid", (KIT / "mail/payment-request.eml").read_text(encoding="utf-8"))

    def test_synthetic_pcap_has_valid_packets_and_complete_http(self):
        data = (KIT / "traffic/local-http.pcap").read_bytes()
        magic, major, minor, _, _, snaplen, link = struct.unpack("<IHHIIII", data[:24])
        self.assertEqual((magic, major, minor, snaplen, link), (0xA1B2C3D4, 2, 4, 65535, 1))
        offset, count, payloads = 24, 0, []
        while offset < len(data):
            _, _, length, original = struct.unpack("<IIII", data[offset:offset+16])
            self.assertEqual(length, original)
            packet = data[offset+16:offset+16+length]
            self.assertEqual(packet[12:14], b"\x08\x00")
            ip, tcp = packet[14:34], packet[34:]
            self.assertEqual(internet_checksum(ip), 0)
            self.assertEqual(ip[12:20], b"\x7f\0\0\x01\x7f\0\0\x01")
            pseudo = ip[12:20] + struct.pack("!BBH", 0, 6, len(tcp))
            self.assertEqual(internet_checksum(pseudo + tcp), 0)
            payloads.append(tcp[20:])
            count += 1
            offset += 16 + length
        self.assertEqual(count, 8)
        self.assertIn(b"GET /lesson HTTP/1.1", b"".join(payloads))
        response = next(payload for payload in payloads if payload.startswith(b"HTTP/"))
        header, body = response.split(b"\r\n\r\n", 1)
        self.assertIn(f"Content-Length: {len(body)}".encode(), header)

    def test_local_server_serves_only_owned_pages_and_logs_requests(self):
        with tempfile.TemporaryDirectory(prefix="kairon-owned-kit-") as directory:
            copy = Path(directory) / "kit"
            shutil.copytree(KIT, copy)
            process = subprocess.Popen([sys.executable, str(copy / "serve.py")], cwd=copy, stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            try:
                for _ in range(80):
                    if process.poll() is not None:
                        self.fail(process.stderr.read().decode())
                    try:
                        connection = http.client.HTTPConnection("127.0.0.1", 8000, timeout=1)
                        connection.request("GET", "/")
                        response = connection.getresponse()
                        self.assertEqual(response.status, 200)
                        self.assertIn("учебный сервер", response.read().decode("utf-8"))
                        connection.close()
                        break
                    except (ConnectionError, OSError):
                        time.sleep(0.05)
                else:
                    self.fail("Local fixture server did not start")
                for route, status in [("/lesson", 200), ("/missing-page", 404), ("/../../README.txt", 404), ("/evidence/private-note.txt", 404)]:
                    connection = http.client.HTTPConnection("127.0.0.1", 8000, timeout=2)
                    connection.request("GET", route)
                    response = connection.getresponse()
                    self.assertEqual(response.status, status, route)
                    body = response.read()
                    self.assertNotIn(b"DEMO-ONLY-731", body)
                    connection.close()
                logs = (copy / "runtime/access.log").read_text()
                self.assertIn("missing-page", logs)
                self.assertIn("127.0.0.1", logs)
            finally:
                if process.poll() is None:
                    process.send_signal(signal.SIGINT if os.name != "nt" else signal.SIGTERM)
                process.communicate(timeout=5)

    def test_benign_worker_starts_and_stops_without_file_changes(self):
        with tempfile.TemporaryDirectory(prefix="kairon-owned-worker-") as directory:
            copy = Path(directory) / "lab-worker.py"
            shutil.copyfile(KIT / "lab-worker.py", copy)
            process = subprocess.Popen([sys.executable, str(copy)], cwd=directory, stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            try:
                self.assertIn(f"PID={process.pid}", process.stdout.readline().decode())
                self.assertIsNone(process.poll())
                self.assertEqual(sorted(path.name for path in Path(directory).iterdir()), ["lab-worker.py"])
            finally:
                process.send_signal(signal.SIGINT if os.name != "nt" else signal.SIGTERM)
                process.communicate(timeout=5)
            self.assertIsNotNone(process.poll())


if __name__ == "__main__":
    unittest.main()
