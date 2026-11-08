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

    def test_pwn_linux_processes_and_env(self):
        proc_code = program("pwn-linux-processes-signals")
        proc_out = run(proc_code)
        self.assertIn("chain_executed= ['check_config:0', 'start_worker:1', 'write_error_log:0'] final_code= 0", proc_out)
        self.assertIn("sigterm_handled= ('graceful_shutdown:SIGTERM', 0)", proc_out)
        self.assertIn("sigkill_forced= ('killed_by_kernel', 137)", proc_out)
        self.assertIn(
            "['check_config:0', 'start_worker:0', 'notify_ready:0']",
            run(proc_code.replace('("&&", "start_worker", 1)', '("&&", "start_worker", 0)')),
        )

        env_code = program("pwn-linux-env-subshells")
        env_out = run(env_code)
        self.assertIn("normal_child_keys= ['API_MODE', 'LD_PRELOAD', 'PATH', 'REQ_ID']", env_out)
        self.assertIn("local_note_leaked= False", env_out)
        self.assertIn("setuid_child_keys= ['API_MODE', 'PATH']", env_out)
        self.assertIn(
            "local_note_leaked= True",
            run(env_code.replace('{"PATH", "API_MODE", "LD_PRELOAD"}', '{"PATH", "API_MODE", "LD_PRELOAD", "LOCAL_NOTE"}')),
        )

    def test_pwn_debugging_elf_and_reverse_cfg(self):
        elf_code = program("pwn-computing-debugging-elf")
        elf_out = run(elf_code)
        self.assertIn("elf_info= {'valid': True, 'bits': 64, 'endian': 'little', 'entry': '0x401060'}", elf_out)
        self.assertIn("saved_opcode= 0x55 patched_hex= cc4889e583ec10c3", elf_out)
        self.assertIn("saved_opcode= 0xc3 patched_hex= 554889e583ec10cc", run(elf_code.replace("offset=0", "offset=7")))

        cfg_code = program("pwn-reverse-control-flow-cfg")
        cfg_out = run(cfg_code)
        self.assertIn("recovered_key= KRN-7428", cfg_out)
        self.assertIn("wrong_attempt= False ['bb_entry', 'bb_check_prefix', 'bb_check_loop', 'bb_fail_byte_4']", cfg_out)
        self.assertIn("right_attempt= True ['bb_entry', 'bb_check_prefix', 'bb_check_loop', 'bb_accept']", cfg_out)
        self.assertIn("['bb_entry', 'bb_fail_len']", run(cfg_code.replace('b"KRN-0000"', 'b"SHORT"')))

    def test_pwn_rop_relro_and_safelinking(self):
        rop_code = program("pwn-program-rop-got-relro")
        rop_out = run(rop_code)
        self.assertIn("aligned_shadow_ok= ret_ok:0x401180", rop_out)
        self.assertIn("unaligned_rsp= fault:unaligned_stack_movaps", rop_out)
        self.assertIn("shadow_mismatch= fault:cet_shadow_stack_mismatch", rop_out)
        self.assertIn("got_full_relro= ('blocked:got_is_read_only_full_relro', '0x7ffff7e44200')", rop_out)
        self.assertIn("modified:partial_relro", run(rop_code.replace("full_relro=True)", "full_relro=False)")))

        safe_code = program("pwn-software-primitives-safelinking")
        safe_out = run(safe_code)
        self.assertIn("mangled_ptr= 0x555000203556", safe_out)
        self.assertIn("valid_pop= ('allocated:ok', '0x555555756200')", safe_out)
        self.assertIn("corrupted_raw_Overwrite= ('aborted:unaligned_tcache_chunk', '0x5551517de')", safe_out)
        self.assertIn("signed_bug_vs_strict= read_value:SECRET_BEFORE rejected:index_out_of_bounds", safe_out)

    def test_pwn_kernel_smep_and_speculative_cache(self):
        kern_code = program("pwn-system-kernel-ioctl-smep")
        kern_out = run(kern_code)
        self.assertIn("valid_ioctl= copy_from_user_ok:bytes=32", kern_out)
        self.assertIn("kernel_addr_leak_attempt= errno:EFAULT_bad_user_address", kern_out)
        self.assertIn("direct_deref_smap= kernel_oops:smap_violation_direct_user_access", kern_out)
        self.assertIn("smep_check= kernel_oops:smep_violation_user_page_exec", kern_out)
        self.assertIn("errno:EINVAL_invalid_length", run(kern_code.replace("handle_kernel_ioctl(0x7FFFFFFFE000, 32)", "handle_kernel_ioctl(0x7FFFFFFFE000, 128)")))

        spec_code = program("pwn-system-speculative-cache")
        spec_out = run(spec_code)
        self.assertIn("unprotected_status= bounds_rejected arch_return= None cache_hits= [(90, 32)]", spec_out)
        self.assertIn("nospec_masked_status= bounds_rejected cache_hits= []", spec_out)
        self.assertIn("architectural_read", run(spec_code.replace("idx=4, branch_trained=True, use_nospec_mask=False", "idx=2, branch_trained=True, use_nospec_mask=False")))

    def test_pwn_crypto_injection_arm_xnu_and_windows(self):
        cry_code = program("pwn-crypto-ecb-padding-prng")
        cry_out = run(cry_code)
        self.assertIn("padded_len= 32 last_pad_byte= 0xd", cry_out)
        self.assertIn("authentic_packet= accepted:user=alex&role=user", cry_out)
        self.assertIn("swapped_block_caught= rejected:invalid_mac_before_decrypt", cry_out)

        inj_code = program("pwn-injection-csv-yaml-xml")
        inj_out = run(inj_code)
        self.assertIn('safe_csv_cell= "\'=HYPERLINK(""http://127.0.0.1/collect"", ""Invoice"")"', inj_out)
        self.assertIn("yaml_check= blocked:unsafe_yaml_type_tag", inj_out)
        self.assertIn("xml_check= blocked:xml_doctype_or_xxe_entity", inj_out)
        self.assertIn("clean_xml_check= safe_xml_element_tree", inj_out)

        arm_code = program("pwn-arch-arm64-xnu-pac")
        arm_out = run(arm_code)
        self.assertIn("arm64_regs= {'X0': 10, 'X1': 20, 'X2': 30, 'X30_LR': '0x100003f40'}", arm_out)
        self.assertIn("verify_valid= ('autia_ok', '0x100003f40')", arm_out)
        self.assertIn("verify_tampered= ('fault:pac_authentication_failed', '0x100009990')", arm_out)

        win_code = program("pwn-windows-pe-tokens-acl")
        win_out = run(win_code)
        self.assertIn("pe_info= {'valid_pe': True, 'pe_offset': '0x80', 'arch': 'x86_64'}", win_out)
        self.assertIn("user_read_write= ('STATUS_SUCCESS:handle_issued', ['READ', 'WRITE'])", win_out)
        self.assertIn("guest_write_blocked= ('ERROR_ACCESS_DENIED:explicit_deny', [])", win_out)

    def test_pwn_shell_expansion_and_linux_data_tmux(self):
        sh_code = program("pwn-shell-expansion-restrictions")
        sh_out = run(sh_code)
        self.assertIn("denylist_check= passed_denylist expanded_argv= ['cat', '/etc/hostname']", sh_out)
        self.assertIn("brace_expanded= ['id', '-u']", sh_out)
        self.assertIn("allowlist_tricky= ('rejected:not_in_allowlist', [])", sh_out)
        self.assertIn("allowlist_valid= ('execve_direct_no_shell', ['systemctl', 'status', 'app.service'])", sh_out)

        tm_code = program("pwn-linux-data-tmux-jobs")
        tm_out = run(tm_code)
        self.assertIn("top_ips= [('10.0.0.5', 3), ('10.0.0.12', 2), ('10.0.0.99', 1)]", tm_out)
        self.assertIn("uniq_without_sort= ['10.0.0.5', '10.0.0.12', '10.0.0.5']", tm_out)
        self.assertIn("uniq_after_sort= ['10.0.0.12', '10.0.0.5']", tm_out)

    def test_pwn_computing_numbers_and_assembly_lea(self):
        num_code = program("pwn-computing-numbers-twos-complement")
        num_out = run(num_code)
        self.assertIn("byte_0xff_views= unsigned: 255 signed_int8: -1", num_out)
        self.assertIn("byte_0x80_views= unsigned: 128 signed_int8: -128", num_out)
        self.assertIn("overflow_bug= passed_buggy_check:wrapped_total=10:actual_copy=250", num_out)
        self.assertIn("safe_check= rejected:safe_overflow_free_check", num_out)
        self.assertIn("ascii_parsed= 1337", num_out)

        lea_code = program("pwn-computing-assembly-flags-loops")
        lea_out = run(lea_code)
        self.assertIn("lea_calc= 0x401048", lea_out)
        self.assertIn("cmp_0xff_vs_0x01= {'je_equal': False, 'jb_unsigned_below': False, 'jl_signed_less': True}", lea_out)
        self.assertIn("loop_checksum= 0x436", lea_out)

    def test_pwn_c_strings_structs_and_cpp_vtables(self):
        c_code = program("pwn-lang-c-strings-structs-padding")
        c_out = run(c_code)
        self.assertIn("unterminated_puts= AAAAAAAAKEY-991", c_out)
        self.assertIn("safe_terminated_puts= AAAAAAA", c_out)
        self.assertIn("uninitialized_padding= b'OLD_KEY' zeroed_padding= 00000000000000", c_out)

        cpp_code = program("pwn-lang-cpp-vtables-type-safety")
        cpp_out = run(cpp_code)
        self.assertIn("valid_vcall= ('called:GuestReader::view_public', '0x402000')", cpp_out)
        self.assertIn("confused_no_cfi= ('unsafe_jump_to_untrusted_vptr', '0x41414141')", cpp_out)
        self.assertIn("confused_with_cfi= ('aborted:cfi_invalid_vptr', '0x41414141')", cpp_out)
        self.assertIn("dynamic_cast_to_admin= None", cpp_out)

    def test_pwn_crypto_rsa_ecc_zkp_and_xnu_windows_fuzz_kernel(self):
        rsa_code = program("pwn-crypto-rsa-modular-padding")
        rsa_out = run(rsa_code)
        self.assertIn("raw_m3_less_than_n= True cube_root_recovered= 42", rsa_out)
        self.assertIn("padded_m3_wraps_mod_n= True cube_root_on_padded= -1", rsa_out)
        self.assertIn("proper_key_decrypt= 42", rsa_out)

        ecc_code = program("pwn-crypto-ecc-nonce-zkp")
        ecc_out = run(ecc_code)
        self.assertIn("same_r_detected= True recovered_d_matches= True rec_d= 73912", ecc_out)
        self.assertIn("zkp_verified= True", ecc_out)

        iok_code = program("pwn-xnu-iokit-task-ports")
        iok_out = run(iok_code)
        self.assertIn("iokit_valid= kIOReturnSuccess:s_write_config", iok_out)
        self.assertIn("iokit_bad_selector= kIOReturnBadArgument:invalid_selector", iok_out)
        self.assertIn("iokit_bad_struct_size= kIOReturnBadArgument:struct_size_mismatch", iok_out)
        self.assertIn("task_port_authorized= KERN_SUCCESS:mach_vm_read:port=port_child", iok_out)
        self.assertIn("task_port_blocked= KERN_INVALID_RIGHT:no_send_right_to_task_port", iok_out)

        dll_code = program("pwn-windows-dll-hijacking-handles")
        dll_out = run(dll_code)
        self.assertIn("unsafe_relative_dll= ('hijack_risk_writable_dir', 'C:\\\\TempWork\\\\telemetry_ext.dll')", dll_out)
        self.assertIn("safe_system32_flag= ('not_found', None)", dll_out)
        self.assertIn("safe_dbghelp_sys32= ('trusted_location', 'C:\\\\Windows\\\\System32\\\\dbghelp.dll')", dll_out)
        self.assertIn("leaked_handles= ['h_secret_config', 'h_stdout_pipe']", dll_out)
        self.assertIn("scoped_handles= ['h_stdout_pipe']", dll_out)

        fuz_code = program("pwn-fuzz-coverage-sanitizers")
        fuz_out = run(fuz_code)
        self.assertIn("fuzz_result= ASAN_TRAP:heap-buffer-overflow_at_offset_4", fuz_out)
        self.assertIn("crashing_input= b'KRN!' total_execs= 22 corpus_saved= 5", fuz_out)

        kcr_code = program("pwn-kernel-creds-modprobe-hardening")
        kcr_out = run(kcr_code)
        self.assertIn("pools_separated= True cred_pool= slab:cred_jar_isolated", kcr_out)
        self.assertIn("safe_helper_path= /sbin/usermode-helper-rodata", kcr_out)
        self.assertIn("bind_port_check= ALLOWED:CAP_NET_BIND_SERVICE", kcr_out)
        self.assertIn("load_module_check= EPERM:missing_capability:CAP_SYS_MODULE", kcr_out)

if __name__ == "__main__":
    unittest.main()
