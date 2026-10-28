"""Execute the original practice against loopback and disposable files only."""
import sys
sys.dont_write_bytecode = True
from base64 import b64encode
from hashlib import sha256
from pathlib import Path
import csv
import hmac
import http.client
import json
import os
import shutil
import subprocess
import tempfile
import time
import unittest
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'public/labs/kairon-toolbox'
LINUX = sys.platform.startswith('linux')


def run(args, cwd, input=None, timeout=30, check=True):
    options = {'umask': 0o077} if LINUX else {}
    return subprocess.run(args, cwd=cwd, input=input, capture_output=True,
                          timeout=timeout, check=check, **options)


class ToolboxKit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = subprocess.Popen([sys.executable, '-B', str(KIT / 'service.py')],
                                      cwd=KIT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for _ in range(50):
            try:
                status, _, body = cls.request('/health')
                if status == 200 and body == b'KAIRON-LOCAL-28\n':
                    return
            except (OSError, http.client.HTTPException):
                pass
            if cls.server.poll() is not None:
                raise RuntimeError('Training service did not start: ' + cls.server.stderr.read().decode())
            time.sleep(0.1)
        cls.server.terminate()
        cls.server.wait(timeout=5)
        raise RuntimeError('Training loopback service did not become ready')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.communicate(timeout=5)

    @staticmethod
    def request(path, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', 8765, timeout=5)
        try:
            conn.request('GET', path, headers=headers or {})
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            conn.close()

    def test_archive_contains_sixteen_original_files_and_no_generated_secrets(self):
        expected = {'README.md', 'READY.txt', 'service.py', 'web/index.html',
                    'data/order.txt', 'data/order-changed.txt', 'data/message.txt',
                    'data/message-changed.txt', 'data/wordlist.txt', 'data/demo.sha256',
                    'data/netcat-note.txt', 'data/hmac-message.txt',
                    'data/hmac-message-changed.txt', 'reference/tool-notes.txt',
                    'reference/report-options.csv', 'reports/template.md'}
        files = {p.relative_to(KIT).as_posix(): p for p in KIT.rglob('*')
                 if p.is_file() and '__pycache__' not in p.parts}
        self.assertEqual(set(files), expected)
        target = ROOT / 'public/downloads/kairon-toolbox.zip'
        manifest = json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['files'], 16)
        self.assertEqual(manifest['sha256'], sha256(target.read_bytes()).hexdigest())
        with zipfile.ZipFile(target) as archive:
            self.assertEqual(set(archive.namelist()), {'kairon-toolbox/' + name for name in expected})
            for name, path in files.items():
                path.read_text(encoding='utf-8')
                self.assertEqual(archive.read('kairon-toolbox/' + name), path.read_bytes())
        self.assertNotIn('PRIVATE KEY', '\n'.join(p.read_text(encoding='utf-8') for p in files.values()))

    def test_owned_data_answers_and_final_report_match_the_evidence(self):
        self.assertEqual((KIT / 'data/order.txt').read_bytes(), 'Заказ: 28 коробок\n'.encode())
        self.assertNotEqual((KIT / 'data/order.txt').read_bytes(), (KIT / 'data/order-changed.txt').read_bytes())
        self.assertEqual((KIT / 'data/demo.sha256').read_text().strip(), sha256(b'kairon28').hexdigest())
        self.assertEqual(len((KIT / 'data/wordlist.txt').read_text().splitlines()), 4)
        lessons = []
        for name in ['network', 'crypto']:
            lessons += json.loads((ROOT / f'content/lessons/kali-practice-{name}.json').read_text(encoding='utf-8'))
        by_id = {lesson['id']: lesson for lesson in lessons}
        self.assertEqual(by_id['tools-hash']['answers'], [sha256((KIT / 'data/order.txt').read_bytes()).hexdigest()])
        self.assertIn(by_id['tools-encrypt']['answers'][0].upper(), (KIT / 'data/message.txt').read_text(encoding='utf-8'))
        self.assertEqual(by_id['tools-netcat']['answers'][0].upper(), (KIT / 'data/netcat-note.txt').read_text().strip())
        with (KIT / 'reference/report-options.csv').open(encoding='utf-8', newline='') as file:
            reports = {row['report_id']: row for row in csv.DictReader(file)}
        selected = reports[by_id['tools-report']['answers'][0]]
        self.assertIn('127.0.0.1:8765', selected['conclusion'])
        self.assertIn('не проверены', selected['limit'])

    def test_http_routes_basic_auth_challenge_and_unknown_path(self):
        self.assertEqual(self.request('/')[0], 200)
        code, headers, _ = self.request('/private')
        self.assertEqual(code, 401)
        self.assertIn('Basic', headers['WWW-Authenticate'])
        auth = lambda value: {'Authorization': 'Basic ' + b64encode(value).decode()}
        self.assertEqual(self.request('/private', auth(b'trainee:wrong'))[0], 401)
        code, _, body = self.request('/private', auth(b'trainee:kairon28'))
        self.assertEqual((code, body), (200, b'PRIVATE-ORDERS-28\n'))
        self.assertEqual(self.request('/missing')[0], 404)

    @unittest.skipUnless(LINUX, 'Native Kali-compatible binaries run in the Ubuntu CI job')
    def test_nmap_performs_tcp_connect_and_writes_readable_xml(self):
        self.assertIsNotNone(shutil.which('nmap'))
        with tempfile.TemporaryDirectory(prefix='kairon-nmap-') as folder:
            xml = Path(folder) / 'scan.xml'
            result = run(['nmap', '-sT', '-Pn', '-n', '-p', '8765', '-oX', str(xml), '127.0.0.1'], folder)
            self.assertIn(b'8765/tcp open', result.stdout)
            tree = ET.parse(xml)
            self.assertEqual(tree.find('.//host/address').get('addr'), '127.0.0.1')
            port = tree.find('.//port')
            self.assertEqual((port.get('portid'), port.find('state').get('state')), ('8765', 'open'))

    @unittest.skipUnless(LINUX, 'Native Kali-compatible binaries run in the Ubuntu CI job')
    def test_netcat_transfers_the_exact_note_through_a_loopback_listener(self):
        self.assertIsNotNone(shutil.which('nc.openbsd'))
        listener = subprocess.Popen(['nc.openbsd', '-l', '127.0.0.1', '8766'],
                                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            time.sleep(0.2)
            note = (KIT / 'data/netcat-note.txt').read_bytes()
            run(['nc.openbsd', '-N', '127.0.0.1', '8766'], KIT, input=note, timeout=10)
            output, _ = listener.communicate(timeout=10)
            self.assertEqual(output, note)
        finally:
            if listener.poll() is None:
                listener.terminate()
                listener.communicate(timeout=5)

    @unittest.skipUnless(LINUX, 'Native Kali-compatible binaries run in the Ubuntu CI job')
    def test_hydra_finds_only_the_owned_training_password_over_http_basic(self):
        self.assertIsNotNone(shutil.which('hydra'))
        with tempfile.TemporaryDirectory(prefix='kairon-hydra-') as folder:
            result = run(['hydra', '-I', '-l', 'trainee', '-P', str(KIT / 'data/wordlist.txt'),
                          '-s', '8765', '-t', '1', '-f', '127.0.0.1', 'http-get', '/private'], folder, timeout=45)
            self.assertIn(b'login: trainee', result.stdout)
            self.assertIn(b'password: kairon28', result.stdout)

    @unittest.skipUnless(LINUX, 'CPU OpenCL and hashcat are installed in the Ubuntu CI job')
    def test_hashcat_recovers_the_owned_sha256_from_only_four_words(self):
        self.assertIsNotNone(shutil.which('hashcat'))
        with tempfile.TemporaryDirectory(prefix='kairon-hashcat-') as folder:
            output = Path(folder) / 'found.txt'
            run(['hashcat', '-m', '1400', '-a', '0', '-D', '1', '-w', '1',
                 '--potfile-path', str(Path(folder) / 'demo.pot'), '--outfile', str(output),
                 '--outfile-format', '2', str(KIT / 'data/demo.sha256'), str(KIT / 'data/wordlist.txt')],
                folder, timeout=180)
            self.assertEqual(output.read_text().strip(), 'kairon28')

    @unittest.skipUnless(LINUX, 'The OpenSSL exercise runs with the Linux binary in CI')
    def test_openssl_encrypts_signs_checks_a_certificate_and_computes_hmac(self):
        self.assertIsNotNone(shutil.which('openssl'))
        with tempfile.TemporaryDirectory(prefix='kairon-openssl-') as folder:
            work = Path(folder)
            plain = KIT / 'data/message.txt'
            changed = KIT / 'data/message-changed.txt'
            run(['openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-iter', '100000', '-salt',
                 '-in', str(plain), '-out', 'message.enc', '-pass', 'stdin'], work, input=b'Training-Only-28\n')
            self.assertNotEqual((work / 'message.enc').read_bytes(), plain.read_bytes())
            run(['openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '100000',
                 '-in', 'message.enc', '-out', 'restored.txt', '-pass', 'stdin'], work, input=b'Training-Only-28\n')
            self.assertEqual((work / 'restored.txt').read_bytes(), plain.read_bytes())
            run(['openssl', 'genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', 'private.pem'], work)
            run(['openssl', 'pkey', '-in', 'private.pem', '-pubout', '-out', 'public.pem'], work)
            run(['openssl', 'dgst', '-sha256', '-sign', 'private.pem', '-out', 'message.sig', str(plain)], work)
            verified = run(['openssl', 'dgst', '-sha256', '-verify', 'public.pem', '-signature', 'message.sig', str(plain)], work)
            self.assertIn(b'Verified OK', verified.stdout)
            altered = run(['openssl', 'dgst', '-sha256', '-verify', 'public.pem', '-signature', 'message.sig', str(changed)], work, check=False)
            self.assertNotEqual(altered.returncode, 0)
            run(['openssl', 'req', '-new', '-x509', '-key', 'private.pem', '-out', 'certificate.pem',
                 '-days', '365', '-subj', '/CN=portal.example', '-addext', 'subjectAltName=DNS:portal.example'], work)
            cert = run(['openssl', 'x509', '-in', 'certificate.pem', '-noout', '-subject', '-dates', '-ext', 'subjectAltName'], work)
            self.assertIn(b'DNS:portal.example', cert.stdout)
            key = bytes.fromhex('00112233445566778899aabbccddeeff')
            fingerprints = []
            for name in ['hmac-message.txt', 'hmac-message-changed.txt']:
                path = KIT / 'data' / name
                digest = hmac.new(key, path.read_bytes(), 'sha256').hexdigest()
                actual = run(['openssl', 'dgst', '-sha256', '-mac', 'HMAC', '-macopt', 'hexkey:' + key.hex(), str(path)], work)
                self.assertIn(digest.encode(), actual.stdout)
                fingerprints.append(digest)
            self.assertNotEqual(*fingerprints)


if __name__ == '__main__':
    unittest.main()
