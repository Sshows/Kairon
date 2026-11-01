"""Execute the exact visible, repository-owned teaching examples on temporary data."""
from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import contextmanager
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading
import re
import subprocess
import sys
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT/'content/book-courses'
def code(course, lesson):
    return re.findall(r'```python\n(.*?)\n```', (CONTENT/course/(lesson+'.md')).read_text(encoding='utf8'), re.S)
def run(text, directory):
    result=subprocess.run([sys.executable,'-X','utf8','-c',text],cwd=directory,text=True,capture_output=True,encoding='utf8',timeout=15)
    if result.returncode: raise AssertionError(result.stderr)
    return result.stdout

class BookPractice(unittest.TestCase):
    def test_log_report_and_rejection_of_malformed_input(self):
        with TemporaryDirectory() as directory:
            folder=Path(directory)
            rows=[dict(user='anna',result='denied'),dict(user='anna',result='denied'),dict(user='boris',result='allowed')]
            (folder/'events.jsonl').write_text('\n'.join(map(json.dumps,rows)),encoding='utf8')
            report=code('automation','log-report')[0]
            self.assertEqual(json.loads(run(report,directory)),dict(events=3,denied_by_user={'anna':2}))
            self.assertEqual(json.loads((folder/'report.json').read_text(encoding='utf8'))['events'],3)
            (folder/'events.jsonl').write_text('not-json',encoding='utf8')
            with self.assertRaises(AssertionError): run(report,directory)

    def test_access_matrix_keeps_own_records_and_denies_cross_account(self):
        with TemporaryDirectory() as directory:
            output=run(code('bug-bounty','two-accounts')[0],directory)
            self.assertIn("before: (200, {'owner': 'boris', 'note': 'TEST-B-ONLY'})",output)
            self.assertIn('after:  (404, None)',output)
            self.assertEqual(output.count('after:  (200,'),2)
            self.assertIn('after:  (401, None)',output)

    def test_hmac_and_three_aead_mutations(self):
        with TemporaryDirectory() as directory:
            folder=Path(directory)
            (folder/'order.txt').write_bytes(b'recipient=anna;amount=100\n')
            (folder/'order-copy.txt').write_bytes(b'recipient=anna;amount=900\n')
            output=run(code('cryptography','hash-mac')[0],directory)
            self.assertIn('original: True',output)
            self.assertIn('changed:  False',output)
            aead=run(code('cryptography','aead-tls')[0],directory)
            self.assertEqual(aead.splitlines(),['valid: amount=100','ciphertext: rejected','aad: rejected','nonce: rejected'])

    def test_worker_records_real_file_and_stable_process_identity(self):
        with TemporaryDirectory() as directory:
            worker,review=code('malware','behavior-timeline')
            run(worker,directory)
            events=[json.loads(line) for line in (Path(directory)/'events.jsonl').read_text(encoding='utf8').splitlines()]
            self.assertEqual([e['action'] for e in events],['start','file_written','finish'])
            self.assertEqual(len(set(e['pid'] for e in events)),1)
            self.assertEqual(Path(events[1]['path']).read_text(encoding='utf8'),'Only training data\n')
            self.assertIn('file_written',run(review,directory))

    def test_bytecode_inspection_and_path_boundary(self):
        with TemporaryDirectory() as directory:
            source,inspect=code('zero-day','binary-map')
            (Path(directory)/'orders.py').write_text(source,encoding='utf8')
            output=run(inspect,directory)
            self.assertIn("FUNCTIONS: ['can_read']",output)
            self.assertIn('COMPARE_OP',output)
            paths=run(code('zero-day','source-sink')[0],directory)
            self.assertIn('string-prefix-check: True',paths)
            self.assertIn('note.txt ALLOW note.txt',paths)
            self.assertIn('../reports-old/stolen.txt REJECT',paths)
            self.assertIn('../outside.txt REJECT',paths)

    def test_http_client_distinguishes_404_and_refused_connection(self):
        class Quiet(SimpleHTTPRequestHandler):
            def log_message(self,*args): pass
        with TemporaryDirectory() as directory:
            (Path(directory)/'index.html').write_text('Kairon local service\n',encoding='utf8')
            server=ThreadingHTTPServer(('127.0.0.1',8765),partial(Quiet,directory=directory))
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                records=json.loads(run(code('automation','local-http')[0],directory))
                self.assertEqual([r['status'] for r in records],[200,404])
                self.assertIn('Kairon local service',records[0]['sample'])
            finally:
                server.shutdown();server.server_close();thread.join()
            refused=json.loads(run(code('automation','local-http')[0],directory))
            self.assertTrue(all('transport_error' in record for record in refused))

if __name__=='__main__': unittest.main()
