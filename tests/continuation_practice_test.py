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

    def test_pwn_linux_shell_and_pipes_models(self):
        shell_code = program("pwn-linux-shell-globbing")
        shell_out = run(shell_code)
        self.assertIn("star_match= report-1.log,report-10.log,report-2.log", shell_out)
        self.assertIn("single_match= report-1.log,report-2.log", shell_out)
        self.assertIn("double_dash= ([], ['-hint.txt'])", shell_out)
        self.assertIn("variant= system-default", run(shell_code.replace('["/usr/local/bin", "/usr/bin", "/bin"]', '["/usr/bin", "/usr/local/bin", "/bin"]')))

        pipes_code = program("pwn-linux-pipes-permissions")
        pipes_out = run(pipes_code)
        self.assertIn("stdout_count= 3 stderr_count= 1", pipes_out)
        self.assertIn("suid_perm= -rwsr-xr-x euid= 0", pipes_out)
        self.assertIn("suid_perm= -rwxr-xr-x euid= 1000", run(pipes_code.replace("suid_mode = 0o4755", "suid_mode = 0o0755")))

    def test_pwn_computing_syscalls_and_stack_server(self):
        sys_code = program("pwn-computing-syscalls-memory")
        sys_out = run(sys_code)
        self.assertIn("little_hex= 8877665544332211", sys_out)
        self.assertIn("sys_write_ret= 14 text= pwn-college-ok", sys_out)
        self.assertIn("sys_write_ret= 3 text= pwn", run(sys_code.replace("rdx=14", "rdx=3")))

        stack_code = program("pwn-computing-stack-server")
        stack_out = run(stack_code)
        self.assertIn("returned_to= 0x401280", stack_out)
        self.assertIn("http_route= POST /submit body= flag=ok-101", stack_out)
        self.assertIn("body= flag=ok", run(stack_code.replace("Content-Length: 11", "Content-Length: 7")))

    def test_pwn_fundamentals_data_http_and_misuse_sql(self):
        data_code = program("pwn-fundamentals-data-http")
        data_out = run(data_code)
        self.assertIn("exact_restore= True", data_out)
        self.assertIn("exchange_ok= True form_ok= True", data_out)
        self.assertIn("exchange_ok= False", run(data_code.replace('"Content-Type": "application/x-www-form-urlencoded"', '"Content-Type": "text/plain"')))

        sql_code = program("pwn-fundamentals-misuse-sql")
        sql_out = run(sql_code)
        self.assertIn("blocked_exec= rejected:flag", sql_out)
        self.assertIn("blocked_escape= rejected:path", sql_out)
        self.assertIn("param_match= ['Kali Guide'] literal_attempt= []", sql_out)
        self.assertIn("param_match= ['HTTP Basics']", run(sql_code.replace('("linux",)', '("web",)')))

    def test_pwn_intro_dac_mac_and_integrated_chain(self):
        dac_code = program("pwn-intro-dac-mac")
        dac_out = run(dac_code)
        self.assertIn("dac_owner_zero= (False, 'matched:owner')", dac_out)
        self.assertIn("mac_allowed= True", dac_out)
        self.assertIn("mac_missing_cat= False mac_low_level= False", dac_out)
        self.assertIn("dac_owner_zero= (True, 'matched:owner')", run(dac_code.replace("mode=0o040)", "mode=0o440)", 1)))

        chain_code = program("pwn-intro-integrated-chain")
        chain_out = run(chain_code)
        self.assertIn("valid_result= accepted:seq=10:bytes=12", chain_out)
        self.assertIn("replay_result= rejected:replay", chain_out)
        self.assertIn("tampered_result= rejected:bad_mac", chain_out)
        self.assertIn("oversized_result= rejected:buffer_bounds", chain_out)

    def test_pwn_program_system_and_software_security(self):
        stack_m_code = program("pwn-program-stack-mitigations")
        stack_m_out = run(stack_m_code)
        self.assertIn("normal_call= ('returned:ok', '0x401150')", stack_m_out)
        self.assertIn("overflow_caught= ('aborted:stack_canary_mismatch', '0x409999')", stack_m_out)
        self.assertIn("bounded_safe= ('returned:ok', '0x401150')", stack_m_out)

        heap_code = program("pwn-program-allocator-invariants")
        heap_out = run(heap_code)
        self.assertIn("double_free= aborted:double_free_detected", heap_out)
        self.assertIn("reused_same_chunk= True", heap_out)
        self.assertIn("session_role_after_uaf= overwritten-via-uaf", heap_out)

        sand_code = program("pwn-system-sandboxing-races")
        sand_out = run(sand_code)
        self.assertIn("safe_sandbox= completed:allowed", sand_out)
        self.assertIn("blocked_execve= killed:seccomp_violation:execve", sand_out)
        self.assertIn("atomic_nofollow= rejected:ELOOP_nofollow", sand_out)
        self.assertIn("killed:seccomp_violation:socket", run(sand_code.replace('["read", "fstat", "write", "exit"]', '["read", "socket", "write", "exit"]')))

        fmt_code = program("pwn-software-format-file-structs")
        fmt_out = run(fmt_code)
        self.assertIn("unsafe_leak= user=0x401210 canary=0x7fff00aa", fmt_out)
        self.assertIn("safe_literal= user=%x canary=%x %n", fmt_out)
        self.assertIn("writes_before_flush= 0 writes_after_flush= 1", fmt_out)
        self.assertIn("writes_before_flush= 1", run(fmt_code.replace('"Prompt without newline:"', '"Prompt without newline:\\n"')))

if __name__ == "__main__":
    unittest.main()
