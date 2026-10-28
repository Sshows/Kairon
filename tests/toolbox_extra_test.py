"""Run new tools against owned files, a fixed local DNS zone and loopback HTTP."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import importlib.util
import json
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import unittest
import zlib
import toolbox_kit_test as base

KIT = base.KIT
LINUX = sys.platform.startswith('linux')


def query(name='training.test', record_type=1):
    labels = b''.join(bytes([len(part)]) + part.encode('ascii') for part in name.split('.')) + b'\0'
    return struct.pack('!6H', 0x2828, 0, 1, 0, 0, 0) + labels + struct.pack('!2H', record_type, 1)


def ask(payload):
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
        client.settimeout(1)
        client.sendto(payload, ('127.0.0.1', 1053))
        return client.recvfrom(512)[0]


def checksum(data):
    if len(data) % 2:
        data += b'\0'
    value = sum(struct.unpack('!' + 'H' * (len(data) // 2), data))
    while value >> 16:
        value = (value & 65535) + (value >> 16)
    return (~value) & 65535


class ToolboxExtra(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base.ToolboxKit.setUpClass()
        cls.dns = subprocess.Popen([sys.executable, '-B', str(KIT / 'dns_server.py')],
                                   cwd=KIT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            for _ in range(30):
                try:
                    if ask(query())[-4:] == socket.inet_aton('192.0.2.28'):
                        return
                except OSError:
                    pass
                if cls.dns.poll() is not None:
                    raise RuntimeError('Owned DNS service could not start')
                time.sleep(0.1)
            raise RuntimeError('Owned DNS service was not ready')
        except BaseException:
            cls.dns.terminate()
            cls.dns.communicate(timeout=5)
            base.ToolboxKit.tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        cls.dns.terminate()
        cls.dns.communicate(timeout=5)
        base.ToolboxKit.tearDownClass()

    def test_data_keep_inert_markers_and_explicit_small_path_list(self):
        data = json.loads((KIT / 'data/http-response.json').read_text(encoding='utf-8'))
        self.assertEqual(data['status'], 'ready')
        self.assertEqual([row['boxes'] for row in data['orders']], [3, 5])
        self.assertTrue(data['training_only'])
        self.assertEqual((KIT / 'data/paths.txt').read_text().splitlines(), ['health', 'private', 'missing', 'docs'])
        for name in ['invoice.pdf.txt', 'reference-note.txt']:
            self.assertIn(b'KAIRON-REVIEW-28', (KIT / 'data' / name).read_bytes())
        self.assertNotIn(b'KAIRON-REVIEW-28', (KIT / 'data/order.txt').read_bytes())
        rule = (KIT / 'rules/demo-marker.yar').read_text()
        self.assertIn('rule DemoInvoiceMarker', rule)
        self.assertIn('KAIRON-REVIEW-28', rule)

    def test_png_chunks_and_synthetic_pcap_checksums_are_valid(self):
        png = (KIT / 'data/metadata.png').read_bytes()
        self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
        chunks = []
        offset = 8
        while offset < len(png):
            size = struct.unpack('!I', png[offset:offset + 4])[0]
            kind = png[offset + 4:offset + 8]
            payload = png[offset + 8:offset + 8 + size]
            crc = struct.unpack('!I', png[offset + 8 + size:offset + 12 + size])[0]
            self.assertEqual(crc, zlib.crc32(kind + payload))
            chunks.append((kind, payload))
            offset += size + 12
        self.assertEqual(struct.unpack('!2I', dict(chunks)[b'IHDR'][:8]), (1, 1))
        self.assertIn((b'tEXt', b'Description\0KAIRON-META-28'), chunks)
        self.assertEqual(len(zlib.decompress(dict(chunks)[b'IDAT'])), 4)
        self.assertEqual(chunks[-1][0], b'IEND')

        pcap = (KIT / 'traffic/local-http.pcap').read_bytes()
        self.assertEqual(struct.unpack('<IHHIIII', pcap[:24]), (0xA1B2C3D4, 2, 4, 0, 0, 65535, 1))
        offset, count, payloads = 24, 0, []
        while offset < len(pcap):
            _, _, saved, original = struct.unpack('<4I', pcap[offset:offset + 16])
            self.assertEqual(saved, original)
            frame = pcap[offset + 16:offset + 16 + saved]
            self.assertEqual(frame[12:14], b'\x08\x00')
            ip = frame[14:]
            self.assertEqual(checksum(ip[:20]), 0)
            self.assertEqual(ip[12:20], socket.inet_aton('127.0.0.1') * 2)
            tcp = ip[20:]
            pseudo = ip[12:20] + struct.pack('!BBH', 0, 6, len(tcp))
            self.assertEqual(checksum(pseudo + tcp), 0)
            self.assertIn(8765, struct.unpack('!2H', tcp[:4]))
            payloads.append(tcp[(tcp[12] >> 4) * 4:])
            offset += 16 + saved
            count += 1
        self.assertEqual(count, 8)
        self.assertIn(b'GET /health HTTP/1.1', b''.join(payloads))
        self.assertIn(b'HTTP/1.1 200 OK', b''.join(payloads))

    def test_dns_answers_known_name_without_forwarding_and_ignores_bad_questions(self):
        spec = importlib.util.spec_from_file_location('kairon_training_dns', KIT / 'dns_server.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for invalid in [b'', b'123', struct.pack('!6H', 1, 0, 0, 0, 0, 0), query()[:14], struct.pack('!6H', 1, 0, 1, 0, 0, 0) + b'\xc0\x0c\x00\x01\x00\x01']:
            self.assertIsNone(module.build_response(invalid))
        for name, kind, rcode, answers in [('training.test', 1, 0, 1), ('training.test', 28, 0, 0), ('missing.test', 1, 3, 0)]:
            result = ask(query(name, kind))
            transaction, flags, questions, found, _, _ = struct.unpack('!6H', result[:12])
            self.assertEqual((transaction, flags & 15, questions, found), (0x2828, rcode, 1, answers))
            self.assertFalse(flags & 0x80, 'Teaching server must not promise recursion')
            if found:
                self.assertEqual(result[-4:], socket.inet_aton('192.0.2.28'))
                self.assertEqual(struct.unpack('!I', result[-10:-6])[0], 300)

    @unittest.skipUnless(LINUX, 'Native tools are required in Linux CI')
    def test_curl_separates_http_status_and_body_and_jq_reads_typed_json(self):
        with tempfile.TemporaryDirectory(prefix='kairon-curl-') as folder:
            result = base.run(['curl', '--silent', '--show-error', '--output', 'body.txt', '--write-out', '%{http_code}', 'http://127.0.0.1:8765/health'], folder)
            self.assertEqual(result.stdout, b'200')
            self.assertEqual((Path(folder) / 'body.txt').read_bytes(), b'KAIRON-LOCAL-28\n')
        result = base.run(['jq', '-r', '.status', str(KIT / 'data/http-response.json')], KIT)
        self.assertEqual(result.stdout.strip(), b'ready')
        boxes = base.run(['jq', '[.orders[].boxes] | add', str(KIT / 'data/http-response.json')], KIT)
        self.assertEqual(boxes.stdout.strip(), b'8')

    @unittest.skipUnless(LINUX, 'Native tools are required in Linux CI')
    def test_dig_reads_the_live_owned_udp_dns_answer(self):
        self.assertIsNotNone(shutil.which('dig'))
        result = base.run(['dig', '@127.0.0.1', '-p', '1053', 'training.test', 'A', '+norecurse', '+noall', '+answer'], KIT)
        self.assertRegex(result.stdout.decode(), r'training\.test\.\s+300\s+IN\s+A\s+192\.0\.2\.28')

    @unittest.skipUnless(LINUX, 'Native tools are required in Linux CI')
    def test_tcpdump_and_tshark_decode_the_owned_pcap_without_capturing_external_traffic(self):
        capture = str(KIT / 'traffic/local-http.pcap')
        dump = base.run(['tcpdump', '-nn', '-A', '-r', capture, 'tcp port 8765'], KIT)
        self.assertIn(b'GET /health HTTP/1.1', dump.stdout)
        self.assertIn(b'KAIRON-LOCAL-28', dump.stdout)
        request = base.run(['tshark', '-r', capture, '-d', 'tcp.port==8765,http', '-Y', 'http.request', '-T', 'fields', '-e', 'http.request.method', '-e', 'http.request.uri'], KIT)
        self.assertEqual(request.stdout.strip(), b'GET\t/health')
        response = base.run(['tshark', '-r', capture, '-d', 'tcp.port==8765,http', '-Y', 'http.response', '-T', 'fields', '-e', 'http.response.code'], KIT)
        self.assertEqual(response.stdout.strip(), b'200')

    @unittest.skipUnless(LINUX, 'Native tools are required in Linux CI')
    def test_file_xxd_and_strings_distinguish_format_from_printable_markers(self):
        name = str(KIT / 'data/invoice.pdf.txt')
        mime = base.run(['file', '--brief', '--mime-type', name], KIT)
        self.assertEqual(mime.stdout.strip(), b'text/plain')
        header = base.run(['xxd', '-l', '8', '-p', str(KIT / 'data/metadata.png')], KIT)
        self.assertEqual(header.stdout.strip(), b'89504e470d0a1a0a')
        for source in ['invoice.pdf.txt', 'reference-note.txt']:
            strings = base.run(['strings', '-n', '8', str(KIT / 'data' / source)], KIT)
            self.assertIn(b'KAIRON-REVIEW-28', strings.stdout)

    @unittest.skipUnless(LINUX, 'Native tools are required in Linux CI')
    def test_exiftool_reads_original_metadata_and_changes_only_a_disposable_copy(self):
        original = KIT / 'data/metadata.png'
        result = base.run(['exiftool', '-s3', '-Description', str(original)], KIT)
        self.assertEqual(result.stdout.strip(), b'KAIRON-META-28')
        with tempfile.TemporaryDirectory(prefix='kairon-exif-') as folder:
            copy = Path(folder) / 'copy.png'
            shutil.copyfile(original, copy)
            base.run(['exiftool', '-Description=MY-LOCAL-NOTE', str(copy)], folder)
            changed = base.run(['exiftool', '-s3', '-Description', str(copy)], folder)
            self.assertEqual(changed.stdout.strip(), b'MY-LOCAL-NOTE')
            self.assertTrue((Path(folder) / 'copy.png_original').exists())
        self.assertEqual(base.run(['exiftool', '-s3', '-Description', str(original)], KIT).stdout.strip(), b'KAIRON-META-28')

    @unittest.skipUnless(LINUX, 'Native tools are required in Linux CI')
    def test_yara_matches_two_inert_texts_and_does_not_turn_the_marker_into_a_verdict(self):
        rule = str(KIT / 'rules/demo-marker.yar')
        for source in ['invoice.pdf.txt', 'reference-note.txt']:
            result = base.run(['yara', rule, str(KIT / 'data' / source)], KIT)
            self.assertIn(b'DemoInvoiceMarker', result.stdout)
        absent = base.run(['yara', rule, str(KIT / 'data/order.txt')], KIT)
        self.assertEqual(absent.stdout, b'')

    @unittest.skipUnless(LINUX, 'Native tools are required in Linux CI')
    def test_whatweb_and_four_word_gobuster_use_only_our_loopback_service(self):
        url = 'http://127.0.0.1:8765/'
        fingerprint = base.run(['whatweb', '-a', '1', '--no-errors', url + 'health'], KIT, timeout=30)
        self.assertIn(b'Python', fingerprint.stdout)
        paths = base.run(['gobuster', 'dir', '-u', url, '-w', str(KIT / 'data/paths.txt'), '-t', '1', '-q', '--no-color', '--no-progress'], KIT, timeout=30)
        text = paths.stdout.decode()
        self.assertRegex(text, r'/health\s+.*200')
        self.assertRegex(text, r'/private\s+.*401')
        self.assertNotRegex(text, r'/(missing|docs)\s+.*200')


if __name__ == '__main__':
    unittest.main()
