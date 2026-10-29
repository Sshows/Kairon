"""Exercise the original offline examples, including positive and negative results."""
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'public/labs/kairon-web'


class WebKit(unittest.TestCase):
    def run_case(self, name):
        result = subprocess.run([sys.executable, '-B', str(KIT / 'practice.py'), name],
                                capture_output=True, text=True, check=True, timeout=5, cwd=KIT)
        return result.stdout

    def test_session_revocation_and_expiry(self):
        output = self.run_case('sessions')
        for expected in ['before_login=denied', 'after_login=allowed', 'after_logout=denied', 'after_expiry=denied']:
            self.assertIn(expected, output)

    def test_second_factor_is_required_after_password(self):
        output = self.run_case('authentication')
        for expected in ['wrong_password=denied', 'password_only=need_mfa', 'password_and_second_factor=allowed']:
            self.assertIn(expected, output)

    def test_ownership_is_checked_for_every_order(self):
        output = self.run_case('authorization')
        self.assertIn('order=order-a status=200 body={"boxes": 3}', output)
        self.assertIn('order=order-b status=403 body=null', output)
        self.assertIn('order=missing status=404 body=null', output)
        self.assertNotIn('"boxes": 5', output)

    def test_sql_binding_keeps_input_as_data(self):
        output = self.run_case('sql')
        for expected in ['parameterized_normal_rows=1', 'parameterized_sql_like_text_rows=0',
                         'unsafe_sql_like_text_rows=2', 'database_saved_to_disk=false']:
            self.assertIn(expected, output)
        self.assertFalse(list(KIT.glob('*.db')))

    def test_csrf_requires_origin_and_matching_token(self):
        output = self.run_case('csrf')
        for expected in ['foreign_form=denied', 'same_origin_missing_token=denied',
                         'same_origin_wrong_token=denied', 'same_origin_correct_token=allowed']:
            self.assertIn(expected, output)

    def test_download_matches_originals(self):
        target = ROOT / 'public/downloads/kairon-web.zip'
        manifest = json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
        self.assertEqual(sha256(target.read_bytes()).hexdigest(), manifest['sha256'])
        files = sorted(p for p in KIT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
        self.assertEqual(len(files), manifest['files'])
        with zipfile.ZipFile(target) as archive:
            self.assertEqual(set(archive.namelist()), {'kairon-web/' + p.relative_to(KIT).as_posix() for p in files})
            for path in files:
                self.assertEqual(archive.read('kairon-web/' + path.relative_to(KIT).as_posix()), path.read_bytes())


if __name__ == '__main__':
    unittest.main()
