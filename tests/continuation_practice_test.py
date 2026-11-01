"""Run the exact nine new visible teaching programs, including changed inputs."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import re
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]

def program(name):
    text = (ROOT / "content/continuation" / (name + ".md")).read_text(encoding="utf8")
    blocks = re.findall(r"```python\n(.*?)\n```", text, re.S)
    if len(blocks) != 1:
        raise AssertionError(f"Expected one complete teaching program in {name}")
    return blocks[0]

def run(text):
    with TemporaryDirectory() as folder:
        result = subprocess.run([sys.executable, "-X", "utf8", "-c", text],
                                cwd=folder, capture_output=True, text=True,
                                encoding="utf8", timeout=15)
        if result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout

class ContinuationPractice(unittest.TestCase):
    def test_baseline_diff_and_a_second_changed_field(self):
        code = program("auto-baseline-diff")
        self.assertEqual(json.loads(run(code)), [{"path":"/login", "field":"status", "before":200, "after":500}])
        changed = code.replace('"status": 500, "content_type": "text/html", "cache": "no-store"',
                               '"status": 500, "content_type": "text/html", "cache": "public"')
        self.assertEqual(len(json.loads(run(changed))), 2)
        self.assertEqual(json.loads(run(code.replace('"status": 500', '"status": 200'))), [])

    def test_duplicate_parameter_redirect_and_control_characters(self):
        code = program("bug-redirect-hpp-crlf")
        output = run(code)
        self.assertIn("first= user last= admin", output)
        self.assertIn("single_value= False", output)
        self.assertIn("result= /profile", output)
        self.assertEqual(output.count("result= rejected"), 2)
        self.assertIn("single_value= True", run(code.replace("role=user&role=admin", "role=user")))

    def test_fixed_destination_xml_and_literal_template_value(self):
        code = program("bug-ssrf-xxe-ssti")
        output = run(code)
        for value in ["image_url= rejected", "xml_title= Учебная заметка", "{{ 7 * 7 }}", "user_text_preserved= True"]:
            self.assertIn(value, output)
        self.assertIn("xml_title= None", run(code.replace("<title>Учебная заметка</title>", "")))

    def test_coupon_interleaving_and_atomic_conditional_update(self):
        code = program("bug-race-oauth-logic")
        output = run(code)
        self.assertIn("split_check_issued= 2", output)
        self.assertIn("atomic_results= [True, False]", output)
        self.assertIn("atomic_issued= 1", output)
        self.assertIn("atomic_issued= 2", run(code.replace(" AND used=0", "")))

    def test_random_seed_reproducibility_and_token_representation(self):
        output = run(program("crypto-randomness-models"))
        self.assertIn("same_seed_same_values= True", output)
        self.assertRegex(output, r"demo_token= [0-9a-f]{32}\n")
        self.assertIn("hex_characters= 32", output)
        self.assertIn("random_bytes= 16", output)

    def test_real_aes_block_properties_and_ctr_reuse(self):
        code = program("crypto-block-stream-modes")
        output = run(code)
        for value in ["ecb_repeated_blocks= True", "cbc_repeated_blocks= False", "same_xor= True"]:
            self.assertIn(value, output)
        changed = code.replace('b"0123456789ABCDEF" * 2', 'b"0123456789ABCDEF0123456789ABCDEG"')
        self.assertIn("ecb_repeated_blocks= False", run(changed))

    def test_x25519_agreement_and_kdf_context(self):
        code = program("crypto-public-key-pqc")
        output = run(code)
        for value in ["shared_equal= True", "derived_equal= True", "key_bytes= 32"]:
            self.assertIn(value, output)
        changed = code.replace("key_b = derive(secret_b)", "key_b = derive(secret_b + b'other-context')")
        self.assertIn("derived_equal= False", run(changed))

    def test_instruction_trace_and_data_round_trip(self):
        code = program("malware-x86-encoding")
        output = run(code)
        for value in ["trace= 2 2", "trace= 4 1", "trace= 6 0", "base64_text= training-note", "round_trip= True"]:
            self.assertIn(value, output)
        self.assertIn("expected_branch= False", run(code.replace("eax, ecx = 0, 3", "eax, ecx = 0, 4")))

    def test_entropy_is_not_a_malware_or_randomness_verdict(self):
        code = program("malware-packers-anti")
        output = run(code)
        self.assertIn("repeated bytes= 4096 entropy= 0.0", output)
        self.assertIn("known_pattern bytes= 4096 entropy= 8.0", output)
        self.assertIn("decompressed_equal= True", output)
        self.assertIn("known_pattern bytes= 4096 entropy= 1.0", run(code.replace("bytes(range(256)) * 16", 'b"AB" * 2048')))

if __name__ == "__main__":
    unittest.main()
