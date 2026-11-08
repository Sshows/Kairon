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

    def test_pwn_github_labs_web_cve_dos_and_dojjail(self):
        web_code = program("pwn-web-dom-clobbering-postmessage")
        web_out = run(web_code)
        self.assertIn("postmsg_unverified= ('accepted:action_executed', 'export_tokens')", web_out)
        self.assertIn("postmsg_verified= ('rejected:untrusted_origin', None)", web_out)
        self.assertIn("dom_Fallback_clobbered= ('clobbered_by_dom_element', 'https://attacker.example/ fake-api')", web_out)
        self.assertIn("dom_strict_module_const= ('from_module_const', 'https://api.kairon.local/v1')", web_out)
        self.assertIn("pollution_vuln_isAdmin= True safe_merge= blocked:prototype_pollution_attempt", web_out)

        cve_code = program("pwn-cve-what-is-a-bug-sudo-libcue")
        cve_out = run(cve_code)
        self.assertIn("sudo_buggy= ('heap_oob_write:stepped_past_null_terminator', 5)", cve_out)
        self.assertIn("sudo_fixed= ('safe_unescape_ok', 'AAAA\\\\')", cve_out)
        self.assertIn("libcue_buggy= underflow_write:negative_offset_-42", cve_out)
        self.assertIn("libcue_fixed= rejected:index_out_of_range", cve_out)
        self.assertIn("exec_suid_argv= ['/usr/bin/python3', '-I', '--', '/proc/self/fd/100'] pythonpath_leaked= False", cve_out)

        dos_code = program("pwn-dos-realmode-segments-ivt")
        dos_out = run(dos_code)
        self.assertIn("phys_a= 0x10020 phys_b= 0x10020 same_cell= True", dos_out)
        self.assertIn("int21h_ivt_offset= 0x84", dos_out)
        self.assertIn("dos_realmode_write= ('ivt_hooked_in_real_mode', 'ivt[0x0084]=2000:0100')", dos_out)
        self.assertIn("protected_ring3_write= ('fault:GPF_ring3_cannot_modify_IDT', None)", dos_out)

        jail_code = program("pwn-jail-namespaces-seccomp-cgroups")
        jail_out = run(jail_code)
        self.assertIn("student_a_visible_pids= [1, 2]", jail_out)
        self.assertIn("seccomp_read= SECCOMP_RET_ALLOW:read", jail_out)
        self.assertIn("seccomp_mount= SECCOMP_RET_ERRNO:EPERM_blocked_mount", jail_out)
        self.assertIn("cgroup_within_limit= ('fork_ok', 11)", jail_out)
        self.assertIn("cgroup_fork_bomb_stopped= ('EAGAIN:cgroup_pids_max_exceeded', 64)", jail_out)

    def test_thm_htb_recon_ad_privesc_and_soc_dfir(self):
        vh_code = program("thm-htb-recon-vhost-ffuf")
        vh_out = run(vh_code)
        self.assertIn("baseline_default_size= 560", vh_out)
        self.assertIn("unprotected_vhost_scan= [('dev-api.corp.htb', 200, 40)]", vh_out)
        self.assertIn("hardened_internal_bind_scan= []", vh_out)

        smb_code = program("thm-htb-smb-rpc-ldap-enum")
        smb_out = run(smb_code)
        self.assertIn("derived_base_dn= DC=corp,DC=kairon,DC=local", smb_out)
        self.assertIn("smb_legacy_null= {'status': 'STATUS_SUCCESS:session_established', 'visible_shares': ['IPC$', 'PublicDocs'], 'relay_protected': False}", smb_out)
        self.assertIn("smb_hardened_null= {'status': 'STATUS_ACCESS_DENIED:null_session_blocked', 'visible_shares': [], 'relay_protected': True}", smb_out)
        self.assertIn("ldap_anon_blocked= ('000004DC: LdapErr: anonymous_bind_rejected_for_search', [])", smb_out)

        krb_code = program("thm-htb-ad-kerberos-tickets")
        krb_out = run(krb_code)
        self.assertIn("as_req_no_preauth= ('VULNERABLE:AS_REP_issued_without_preauth', 'svc_legacy')", krb_out)
        self.assertIn("as_req_enforced= ('KRB5KDC_ERR_PREAUTH_REQUIRED:blocked', 'alex.admin')", krb_out)
        self.assertIn("spn_audit_weak= HIGH_RISK:TGS_weak_spn_offline_crackable", krb_out)
        self.assertIn("spn_audit_gmsa= HARDENED:gMSA_AES256_resistant_to_offline_cracking", krb_out)

        acl_code = program("thm-htb-ad-acls-dcsync-tiering")
        acl_out = run(acl_code)
        self.assertIn("dcsync_path_before= user_intern --[MemberOf]--> grp_helpdesk --[ForceChangePassword]--> svc_deploy --[WriteDACL]--> grp_replication_ops --[GetChangesAll_DCSync]--> DOMAIN_ROOT_CORP", acl_out)
        self.assertIn("dcsync_path_after_remediation= None", acl_out)

        lpe_code = program("thm-htb-linux-privesc-systemd-cron")
        lpe_out = run(lpe_code)
        self.assertIn("vuln_audit= ['CRON_WRITABLE_PATH_DIR', 'CRON_RELATIVE_COMMAND_PATH', 'SUDO_LD_PRELOAD_ENABLED', 'TAR_WILDCARD_ARGUMENT_INJECTION', 'SYSTEMD_UNIT_GROUP_OR_WORLD_WRITABLE']", lpe_out)
        self.assertIn("hardened_audit= ['HARDENED:no_privesc_vectors_found']", lpe_out)

        wpe_code = program("thm-htb-windows-privesc-services-tokens")
        wpe_out = run(wpe_code)
        self.assertIn("unquoted_candidates= ['C:\\\\Program.exe', 'C:\\\\Program Files\\\\Corp.exe', 'C:\\\\Program Files\\\\Corp Utils\\\\Agent.exe', 'C:\\\\Program Files\\\\Corp Utils\\\\Agent Service\\\\agent.exe']", wpe_out)
        self.assertIn("unquoted_audit= {'candidates_checked': 4, 'hijackable_paths': ['C:\\\\Program Files\\\\Corp Utils\\\\Agent.exe'], 'token_escalation_privs': ['SeImpersonatePrivilege']}", wpe_out)
        self.assertIn("quoted_audit= {'candidates_checked': 1, 'hijackable_paths': [], 'token_escalation_privs': []}", wpe_out)

        sig_code = program("thm-htb-soc-sysmon-eventlogs-sigma")
        sig_out = run(sig_code)
        self.assertIn("event1_verdict= ALERT:sigma_webshell_or_macro_child_process", sig_out)
        self.assertIn("event2_verdict= benign:filtered_known_admin_task", sig_out)
        self.assertIn("decoded_ps_cmd= whoami /priv", sig_out)

        dfir_code = program("thm-htb-dfir-pcap-beaconing-exfil")
        dfir_out = run(dfir_code)
        self.assertIn("human_flow= ('benign:human_browsing_variance', 62.0)", dfir_out)
        self.assertIn("beacon_flow= ('ALERT:periodic_c2_beacon_detected', 60.0)", dfir_out)
        self.assertIn("dns_audit= ('ALERT:dns_hex_exfiltration', 'KRN-DFIR-RECOVER')", dfir_out)

    def test_pwn_and_thm_htb_days_101_to_108(self):
        cve2_code = program("pwn-cve-bash-apache-readelf-libxml")
        cve2_out = run(cve2_code)
        self.assertIn("bash_cve_buggy= oob_write:redir_stack_overflow_by_1", cve2_out)
        self.assertIn("bash_cve_fixed= rejected:heredoc_max_10_exceeded", cve2_out)
        self.assertIn("readelf_buggy= oob_read:section_headers[99]_beyond_12", cve2_out)
        self.assertIn("readelf_fixed= rejected:invalid_sh_link_index", cve2_out)
        self.assertIn("libxml_fixed= rejected:null_schema_child_node", cve2_out)
        self.assertIn("proxy_header_guard= ('rejected:too_many_connection_tokens', 50)", cve2_out)

        web2_code = program("pwn-web-host-header-php-type-juggling")
        web2_out = run(web2_code)
        self.assertIn("ip_vuln_vs_safe= 127.0.0.1 198.51.100.77", web2_out)
        self.assertIn("reset_link_safe= https://portal.kairon.local/reset?token=TKN-99", web2_out)
        self.assertIn("magic_md5_prefixes= 0e4620 0e8304 all_digits_after_0e= True", web2_out)
        self.assertIn("loose_vs_strict_compare= True False", web2_out)

        lun_code = program("pwn-linux-lunacy-fds-memfd-proc")
        lun_out = run(lun_code)
        self.assertIn("parsed_cmdline= ['/usr/bin/python3', '-I', 'worker.py', '--port=8080']", lun_out)
        self.assertIn("dup2_slot_42= ('/proc/self/fd/3', True)", lun_out)
        self.assertIn("proc_default_hidepid0= [1, 1040, 2099]", lun_out)
        self.assertIn("proc_hardened_hidepid2= [1040]", lun_out)

        sym_code = program("pwn-babyauto-symbolic-execution-angr")
        sym_out = run(sym_code)
        self.assertIn("symbolic_solution= [40, 60, 74, 33]", sym_out)
        self.assertIn("concrete_verification= bb_target_reached:FLAG_UNLOCKED", sym_out)
        self.assertIn("states_10_branches_no_avoid= 1024 with_avoid= 11", sym_out)

        ssrf_code = program("thm-htb-web-ssrf-cloud-metadata-imdsv2")
        ssrf_out = run(ssrf_code)
        self.assertIn("decimal_127_0_0_1= 2130706433", ssrf_out)
        self.assertIn("naive_vs_strict_loopback= passed_string_filter blocked:non_global_ip:127.0.0.1", ssrf_out)
        self.assertIn("strict_imds_ip= blocked:non_global_ip:169.254.169.254", ssrf_out)
        self.assertIn("ssrf_get_on_imdsv1= LEAKED_IMDSv1:IAM_Temp_Credentials", ssrf_out)
        self.assertIn("ssrf_get_on_imdsv2= 401_UNAUTHORIZED:IMDSv2_token_required", ssrf_out)

        gql_code = program("thm-htb-web-graphql-jwt-ssti")
        gql_out = run(gql_code)
        self.assertIn("gql_introspection= blocked:graphql_introspection_disabled", gql_out)
        self.assertIn("gql_deep_nested= blocked:graphql_depth_9_exceeds_5", gql_out)
        self.assertIn("jwt_kid_vuln= accepted:valid_signature", gql_out)
        self.assertIn("jwt_kid_strict= rejected:unknown_kid_in_registry", gql_out)
        self.assertIn("ssti_vuln= VULNERABLE:ssti_expression_evaluated_49", gql_out)
        self.assertIn("ssti_safe= Hello, {{7*7}}", gql_out)

        piv_code = program("thm-htb-pivoting-ssh-chisel-ligolo")
        piv_out = run(piv_code)
        self.assertIn("local_L_match= forwarded:single_target_tcp", piv_out)
        self.assertIn("local_L_other_port= rejected:not_matching_fixed_L_rule", piv_out)
        self.assertIn("dynamic_D_tcp= forwarded:socks5_tcp_to_172.16.50.25:3389", piv_out)
        self.assertIn("dynamic_D_icmp= unsupported:socks5_cannot_route_raw_icmp", piv_out)
        self.assertIn("tun_l3_icmp= routed:tun0_l3_ICMP_to_172.16.50.25", piv_out)
        self.assertIn("hardened_sshd= blocked:sshd_AllowTcpForwarding_no", piv_out)

        adcs_code = program("thm-htb-ad-cs-certificates-esc1")
        adcs_out = run(adcs_code)
        self.assertIn("tpl_vuln_check= CRITICAL_ESC1:arbitrary_SAN_impersonation_in_CorpLegacyWorkstation", adcs_out)
        self.assertIn("tpl_safe_check= SAFE_TEMPLATE:CorpWebServerTLS", adcs_out)
        self.assertIn("esc8_unprotected= HIGH_ESC8:ntlm_relay_to_adcs_http_enrollment", adcs_out)
        self.assertIn("esc8_hardened= HARDENED_ADCS_WEB:https_with_epa_channel_binding", adcs_out)

        dkr_code = program("thm-htb-docker-socket-capabilities-escape")
        dkr_out = run(dkr_code)
        self.assertIn("unsafe_container_audit= ['CRITICAL:docker_sock_mounted_host_root_equivalent', 'HIGH:dangerous_capabilities:CAP_SYS_ADMIN', 'MEDIUM:running_as_root_uid_0', 'LOW:missing_no_new_privileges']", dkr_out)
        self.assertIn("hardened_container_audit= ['HARDENED:isolated_non_root_container']", dkr_out)

        k8s_code = program("thm-htb-k8s-rbac-serviceaccount-imds")
        k8s_out = run(k8s_code)
        self.assertIn("vuln_k8s_audit= ['WARN:serviceaccount_token_automounted', 'CRITICAL:host_namespace_or_hostpath_exposed', 'HIGH:dangerous_rbac_pods_create', 'HIGH:dangerous_rbac_secrets_get', 'HIGH:dangerous_rbac_secrets_list']", k8s_out)
        self.assertIn("hardened_k8s_audit= ['HARDENED:restricted_pod_and_least_privilege_rbac']", k8s_out)

        cicd_code = program("thm-htb-cicd-github-actions-pwnrequest")
        cicd_out = run(cicd_code)
        self.assertIn("vuln_wf_audit= ['CRITICAL:pwn_request_untrusted_checkout_with_secrets', 'HIGH:overpermissive_github_token_write_all', 'CRITICAL:script_injection_via_inline_expression_in_run']", cicd_out)
        self.assertIn("safe_wf_audit= ['HARDENED:safe_workflow_env_bound_and_read_only']", cicd_out)

        git_code = program("thm-htb-git-forensics-dependency-confusion")
        git_out = run(git_code)
        self.assertIn("secret_in_head= False found_in_git_history= [('a1b2c3d', 'config.ini')]", git_out)
        self.assertIn("unscoped_extra_index= ('VULNERABLE_MAX_VERSION_PICKED', 'public_pypi_attacker', (99, 0, 0))", git_out)
        self.assertIn("scoped_prefix_guard= ('SAFE_SCOPED_PRIVATE', 'private_registry', (1, 2, 0))", git_out)
        self.assertIn("pinned_hash_guard= ('SAFE_LOCKFILE_VERIFIED', 'private_registry', (1, 2, 0))", git_out)

        vol_code = program("thm-htb-dfir-volatility-memory-injection")
        vol_out = run(vol_code)
        self.assertIn("dkom_unlinked_procs= [(3892, 'updater_sync.exe')]", vol_out)
        self.assertIn("malfind_hits= [('svchost.exe', '0x1a40000', 'PAGE_EXECUTE_READWRITE')]", vol_out)

        edr_code = program("thm-htb-edr-etw-amsi-telemetry")
        edr_out = run(edr_code)
        self.assertIn("clean_script_scan= AMSI_RESULT_CLEAN:allowed", edr_out)
        self.assertIn("malicious_unpacked_scan= AMSI_RESULT_DETECTED:blocked_malicious_payload", edr_out)
        self.assertIn("patched_amsi_check= ALERT_EDR_TAMPERING:private_patched_text_page_detected", edr_out)
        self.assertIn("admin_vs_ppl_edr= ACCESS_DENIED:protected_process_light_PPL_blocks_admin", edr_out)

        mal_code = program("thm-htb-malware-deobfuscation-capa-yara")
        mal_out = run(mal_code)
        self.assertIn("key_recovered= True c2_url= https://198.51.100.90:8443/gate", mal_out)
        self.assertIn("attck_techniques= ['T1055:Process_Injection', 'T1547.001:Registry_Run_Keys_Persistence']", mal_out)

        soar_code = program("thm-htb-soc-soar-playbook-containment")
        soar_out = run(soar_code)
        self.assertIn("workstation_soar= ['FIREWALL_BLOCKED_IP:198.51.100.250', 'EDR_HOST_ISOLATED:ws-finance-14', 'REVOKED_SESSIONS:m.ivanova'] metrics= {'MTTD_sec': 45, 'MTTR_sec': 15}", soar_out)
        self.assertIn("tier0_guard_soar= ['GUARD_BLOCKED_SELF_DOS:refused_to_block_critical_ip_10.0.0.5', 'REQUIRE_HUMAN_APPROVAL:cannot_auto_isolate_Tier0']", soar_out)

    def test_pwn_ctf_sqli_wstg_days_109_to_114(self):
        sqli1_code = program("pwn-sqli-union-error-schema-extraction")
        sqli1_out = run(sqli1_code)
        self.assertIn("auth_bypass= [('sec_admin',)]", sqli1_out)
        self.assertIn("detected_columns= 3", sqli1_out)
        self.assertIn("union_schema_leak= [(1, 'staff_secrets', 'CREATE TABLE staff_secrets (id INTEGER, login TEXT, api_token TEXT)')]", sqli1_out)
        self.assertIn("union_secret_leak= [(1, 'sec_admin', 'KRN{UNION_AND_ERROR_SQLI_OK}')]", sqli1_out)
        self.assertIn("safe_parameterized_result= []", sqli1_out)

        sqli2_code = program("pwn-sqli-blind-boolean-time-second-order")
        sqli2_out = run(sqli2_code)
        self.assertIn("blind_extracted= KRN_42 queries_per_char= 7", sqli2_out)
        self.assertIn("second_order_safe_admin_hash= HASH_ORIG_ADMIN", sqli2_out)
        self.assertIn("second_order_vuln_admin_hash= PWNED_HASH", sqli2_out)

        inj_code = program("pwn-injection-dojo-csv-yaml-json-xml")
        inj_out = run(inj_code)
        self.assertIn("csv_sanitized= '=HYPERLINK(\"http://evil.htb\")", inj_out)
        self.assertIn("std_json_last_wins= admin", inj_out)
        self.assertIn("strict_json_guard= duplicate_json_key:role", inj_out)
        self.assertIn("yaml_check= BLOCKED:unsafe_yaml_custom_tag_detected", inj_out)
        self.assertIn("xml_escaped_safe= True", inj_out)

        nosql_code = program("thm-htb-nosqli-ldap-xpath-injection")
        nosql_out = run(nosql_code)
        self.assertIn("vuln_ne_bypass= True", nosql_out)
        self.assertIn("vuln_regex_probe= True", nosql_out)
        self.assertIn("safe_strict_type= REJECTED:non_string_operator_injection_blocked", nosql_out)
        self.assertIn("ldap_rfc4515_escaped= admin\\2a\\29\\28|\\28uid=\\2a", nosql_out)

        wstg1_code = program("thm-htb-wstg-xxe-cors-csrf-audit")
        wstg1_out = run(wstg1_code)
        self.assertIn("xxe_check= BLOCKED_XXE:external_entity_declaration_forbidden", wstg1_out)
        self.assertIn("cors_vuln= VULNERABLE_CORS:arbitrary_origin_with_credentials", wstg1_out)
        self.assertIn("cors_safe= SAFE_CORS:untrusted_origin_rejected", wstg1_out)
        self.assertIn("csrf_valid= SAFE_STATE_CHANGE:csrf_verified", wstg1_out)
        self.assertIn("csrf_forged= BLOCKED_CSRF:token_mismatch", wstg1_out)

        wstg2_code = program("thm-htb-wstg-fileupload-magic-polyglot-lfi")
        wstg2_out = run(wstg2_code)
        self.assertIn("double_ext_php= ('REJECTED:extension_not_allowed', None)", wstg2_out)
        self.assertIn("gif_polyglot= ('REJECTED:polyglot_script_payload_detected', None)", wstg2_out)
        self.assertIn("valid_png= ('ACCEPTED:stored_safely_outside_webroot', '/var/kairon_uploads_isolated/9f8e7d6c.png')", wstg2_out)
        self.assertIn("lfi_traversal= BLOCKED_LFI:path_traversal_outside_base", wstg2_out)
        self.assertIn("lfi_wrapper= BLOCKED_LFI:stream_wrapper_or_null_byte", wstg2_out)
        self.assertIn("lfi_valid= ALLOWED:/srv/app/templates/Help/faq.html", wstg2_out)

        rev_code = program("pwn-ctf-archive-reversing-keygen-solver")
        rev_out = run(rev_code)
        self.assertIn("recovered_ctf_flag= KRN{CTF_REV_OK}", rev_out)
        self.assertIn("forward_matches_rodata= True", rev_out)
        self.assertIn("rol_ror_identity= True", rev_out)

        pwn_code = program("pwn-ctf-archive-pwn-format-leak-pie-ret2win")
        pwn_out = run(pwn_code)
        self.assertIn("pie_base= 0x55a4b8c10000 win_runtime= 0x55a4b8c111e9", pwn_out)
        self.assertIn("without_ret_gadget= CRASH_SIGSEGV:movaps_unaligned_stack_rsp", pwn_out)
        self.assertIn("with_ret_gadget= SUCCESS:win_executed_KRN{PIE_CANARY_ALIGNED}", pwn_out)

        dc33_code = program("pwn-ctf-dc33-dca-deceit-race-legion")
        dc33_out = run(dc33_code)
        self.assertIn("signed_bug= ('VULNERABLE_SIGNED_BYPASS', 65520)", dc33_out)
        self.assertIn("unsigned_fix= ('SAFE_REJECTED:exceeds_64', 0)", dc33_out)
        self.assertIn("deceit_vuln= GATEWAY=ping->BACKEND=dump_secrets", dc33_out)
        self.assertIn("deceit_fixed= BLOCKED_DECEIT:ambiguous_duplicate_parameter", dc33_out)
        self.assertIn("race_attempt_1= REDEEM_OK:flag_granted", dc33_out)
        self.assertIn("race_attempt_2= REJECTED_RACE:already_used", dc33_out)

        acs_code = program("pwn-ctf-acsac-crypto-prng-padding-oracle")
        acs_out = run(acs_code)
        self.assertIn("lcg_predicted_next= 1359994880 lcg_recovered_s0= True", acs_out)
        self.assertIn("padding_oracle_recovered= Z winning_iv_byte= 0x95", acs_out)
        self.assertIn("etm_tampered_iv= REJECTED_BEFORE_DECRYPT:mac_mismatch_padding_oracle_impossible", acs_out)

        hist_code = program("pwn-hacker-history-morris-fingerd-heartbleed")
        hist_out = run(hist_code)
        self.assertIn("morris_vuln= ('MORRIS_OVERFLOW:saved_pc_overwritten', 24)", hist_out)
        self.assertIn("morris_fixed= ('SAFE_FGETS:stack_intact', 511)", hist_out)
        self.assertIn("heartbleed_vuln= HEARTBLEED_LEAKED_HEAP PING|PRIVATE_KEY:KRN{HEARTBLEED_2014_FIXED}|S", hist_out)
        self.assertIn("heartbleed_patched= HEARTBLEED_BLOCKED:claimed_length_exceeds_packet 0", hist_out)

        pipe_code = program("thm-htb-full-pentest-ctf-assessment-pipeline")
        pipe_out = run(pipe_code)
        self.assertIn("vuln_assessment= FAILED_AUDIT findings_count= 6", pipe_out)
        self.assertIn("hardened_assessment= CERTIFIED_HARDENED:KRN{FULL_CURRICULUM_MASTERED} findings_count= 0", pipe_out)

if __name__ == "__main__":
    unittest.main()
