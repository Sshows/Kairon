"""Check the diagnostic case against its saved evidence, without network access."""

from datetime import datetime
from hashlib import sha256
from pathlib import Path
import csv
import ipaddress
import json
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "public/labs/kairon-diagnostics"


def text(name):
    return (KIT / name).read_text(encoding="utf-8")


def table(name):
    with (KIT / name).open(encoding="utf-8", newline="") as source:
        return list(csv.DictReader(source))


def fields(raw):
    return dict(line.split("=", 1) for line in raw.splitlines() if "=" in line)


def log(name):
    result = []
    for line in text(name).splitlines():
        if not line or line.startswith("#"):
            continue
        timestamp, *tokens = line.split()
        result.append({"time_utc": timestamp, **dict(token.split("=", 1) for token in tokens)})
    return result


def moment(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class DiagnosticsKitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lessons = {
            lesson["id"]: lesson
            for lesson in json.loads((ROOT / "content/lessons/diagnostics.json").read_text(encoding="utf-8"))
        }

    def assert_answer(self, lesson_id, observed_answer):
        """Connect an answer to a result established from the independent fixtures."""
        self.assertEqual(self.lessons[lesson_id]["kind"], "answer")
        self.assertEqual(self.lessons[lesson_id]["answers"], [observed_answer.lower()])

    def test_download_contains_exactly_fourteen_original_text_files(self):
        expected = {
            "README.md", "READY.txt", "case-notes.txt", "client-observations.csv",
            "scope-map.csv", "dns-snapshots.txt", "tls-observations.csv", "access.txt",
            "error.txt", "capacity-snapshots.csv", "disk-usage.csv", "change-options.csv",
            "verification.csv", "reports/template.md",
        }
        sources = {path.relative_to(KIT).as_posix(): path for path in KIT.rglob("*") if path.is_file()}
        self.assertEqual(set(sources), expected)
        self.assertIn("DIAG-READY-28", text("READY.txt"))
        target = ROOT / "public/downloads/kairon-diagnostics.zip"
        manifest = json.loads(target.with_suffix(".json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["file"], target.name)
        self.assertEqual(manifest["files"], 14)
        self.assertEqual(manifest["sha256"], sha256(target.read_bytes()).hexdigest())
        with zipfile.ZipFile(target) as archive:
            names = archive.namelist()
            self.assertEqual(len(names), len(set(names)))
            self.assertEqual(set(names), {"kairon-diagnostics/" + name for name in expected})
            for name, source in sources.items():
                data = source.read_bytes()
                data.decode("utf-8")
                self.assertIn(source.suffix, {".txt", ".csv", ".md"})
                self.assertFalse(data.startswith((b"MZ", b"\x7fELF")))
                self.assertEqual(archive.read("kairon-diagnostics/" + name), data)

    def test_intake_selects_the_reported_request_and_the_clients_own_loopback(self):
        notes = fields(text("case-notes.txt"))
        observations = table("client-observations.csv")
        selected = [row for row in observations if row["request"] == notes["target"]]
        self.assertEqual(len(selected), 1)
        primary = selected[0]
        self.assertEqual(primary["client"], "Kali Firefox")
        self.assertEqual(primary["observed_result"], "HTTP 503 Service Unavailable")
        self.assertEqual(primary["observation_id"], notes["primary_observation"])
        self.assertEqual(primary["time_utc"], notes["report_time_utc"])
        self.assertEqual(len({row["request_id"] for row in observations}), 3)
        self.assert_answer("diag-intake", primary["observation_id"])

        scopes = table("scope-map.csv")
        windows = next(row for row in scopes if row["client_location"] == "Браузер Windows")
        self.assertTrue(ipaddress.ip_address(windows["address_or_listener"].split(":")[0]).is_loopback)
        self.assertIn("самой Windows", windows["meaning"])
        self.assertIn("не говорит", windows["reachability_limit"])
        kali = next(row for row in scopes if row["address_or_listener"] == windows["address_or_listener"] and row != windows)
        self.assertIn("самой Kali", kali["meaning"])
        all_interfaces = next(row for row in scopes if row["address_or_listener"].startswith("0.0.0.0:"))
        self.assertTrue(ipaddress.ip_address("0.0.0.0").is_unspecified)
        self.assertIn("все локальные IPv4", all_interfaces["meaning"])
        self.assertIn("NAT", all_interfaces["reachability_limit"])
        self.assert_answer("diag-scope", windows["scope_id"])

    def test_dns_and_tls_distinguish_typo_nodata_clock_name_and_real_expiry(self):
        snapshots = {
            block["snapshot_id"]: block
            for raw in text("dns-snapshots.txt").split("\n\n")
            if "snapshot_id=" in raw
            for block in [fields(raw)]
        }
        typo = [row for row in snapshots.values() if row["dns_status"] == "NXDOMAIN"]
        self.assertEqual(len(typo), 1)
        self.assertNotEqual(typo[0]["query_name"], "portal.example")
        self.assertEqual(typo[0]["query_name"], "portal.exmaple")
        self.assertEqual(typo[0]["answer"], "none")
        good = next(row for row in snapshots.values() if row["query_name"] == "portal.example" and row["query_type"] == "A")
        self.assertEqual(good["dns_status"], "NOERROR")
        self.assertEqual(good["answer"].split()[-1], "192.0.2.28")
        self.assertIn("HTTP 503", good["http_observation"])
        nodata = next(row for row in snapshots.values() if row["query_type"] == "AAAA")
        self.assertEqual((nodata["dns_status"], nodata["answer"]), ("NOERROR", "none"))
        self.assert_answer("diag-dns", typo[0]["snapshot_id"])

        tls = table("tls-observations.csv")
        good_tls = next(row for row in tls if row["saved_openssl_result"] == "verification OK")
        skewed = [row for row in tls if row["client_clock_utc"] != row["case_reference_time_utc"]]
        self.assertEqual(len(skewed), 1)
        clock = skewed[0]
        for field in ("requested_name", "certificate_names", "not_before_utc", "not_after_utc"):
            self.assertEqual(clock[field], good_tls[field])
        self.assertLess(moment(clock["not_before_utc"]), moment(clock["case_reference_time_utc"]))
        self.assertLess(moment(clock["case_reference_time_utc"]), moment(clock["not_after_utc"]))
        self.assertGreater(moment(clock["client_clock_utc"]), moment(clock["not_after_utc"]))
        mismatch = next(row for row in tls if row["requested_name"] != row["certificate_names"])
        self.assertEqual(mismatch["saved_openssl_result"], "hostname mismatch")
        expired = next(row for row in tls if row["saved_openssl_result"] == "certificate has expired" and row not in skewed)
        self.assertGreater(moment(expired["case_reference_time_utc"]), moment(expired["not_after_utc"]))
        self.assert_answer("diag-tls", clock["observation_id"])

    def test_logs_correlate_one_503_and_do_not_blame_another_nodes_inode_shortage(self):
        access = log("access.txt")
        errors = {row["request_id"]: row for row in log("error.txt")}
        failed = [row for row in access if row["status"] == "503"]
        self.assertEqual(len(failed), 1)
        request = failed[0]
        self.assertEqual(request["path"], "/orders")
        error = errors[request["request_id"]]
        for field in ("time_utc", "node"):
            self.assertEqual(request[field], error[field])
        self.assertEqual((error["detail"], error["client_status"]), ("connection_refused", request["status"]))
        self.assertEqual(error["policy"], "map_upstream_failure_to_503")
        notes = fields(text("case-notes.txt"))
        self.assertEqual(error["destination"], notes["gateway_orders_upstream"])
        self.assertNotEqual(error["destination"], notes["application_listener"])
        missing = next(row for row in access if row["status"] == "404")
        self.assertNotEqual(missing["path"], request["path"])
        self.assertEqual(errors[missing["request_id"]]["event"], "route_not_found")
        self.assert_answer("diag-logs", request["request_id"])

        capacities = table("capacity-snapshots.csv")
        exhausted = [row for row in capacities if int(row["free_inodes"]) == 0]
        self.assertEqual(len(exhausted), 1)
        archive = exhausted[0]
        self.assertGreater(int(archive["available_bytes"]), 0)
        self.assertNotEqual(archive["node"], request["node"])
        portal = next(row for row in capacities if row["node"] == request["node"])
        self.assertGreater(int(portal["free_inodes"]), 0)
        self.assertGreater(int(portal["available_bytes"]), 0)
        usage = table("disk-usage.csv")
        parent = next(row for row in usage if row["path"] == "/var/log/portal")
        child = next(row for row in usage if row["path"] == parent["path"] + "/access.txt")
        self.assertEqual(parent["node"], child["node"])
        self.assertGreaterEqual(int(parent["allocated_bytes"]), int(child["allocated_bytes"]))
        self.assertIn("не складывать", parent["note"])
        self.assert_answer("diag-capacity", "inodes")

    def test_reviewed_change_is_verified_by_the_original_request_and_content(self):
        notes = fields(text("case-notes.txt"))
        changes = {row["change_id"]: row for row in table("change-options.csv")}
        selected = changes[notes["approved_change"]]
        self.assertIn(notes["gateway_orders_upstream"], selected["proposal"])
        self.assertIn(notes["application_listener"], selected["proposal"])
        self.assertIn("Владелец подтвердил", selected["precondition"])
        self.assertIn("сохранить cfg-41", selected["precondition"])
        self.assertIn("проверить копию", selected["precondition"])
        self.assertIn("тот же GET /orders", selected["test"])
        self.assertIn("вернуть сохранённую cfg-41", selected["rollback"])
        self.assert_answer("diag-change", selected["change_id"])

        primary = next(row for row in table("client-observations.csv") if row["observation_id"] == notes["primary_observation"])
        checks = table("verification.csv")
        repeated = [row for row in checks if row["request"] == "GET " + primary["request"] and row["client"] == primary["client"]]
        self.assertEqual(len(repeated), 1)
        result = repeated[0]
        expected_status, expected_body = notes["expected"].split(" и текст ", 1)
        self.assertEqual(result["result"], expected_status)
        self.assertIn(expected_body, result["body_or_log"])
        self.assertIn(result["request_id"], result["body_or_log"])
        self.assertNotEqual(result["request_id"], primary["request_id"])
        before = next(row for row in log("access.txt") if row["request_id"] == primary["request_id"])
        self.assertNotEqual(before["config"], result["config"])
        self.assertIn(result["config"], notes["after"])
        self.assertGreater(moment(result["time_utc"]), moment(notes["change_time_utc"]))
        self.assertIn("длительная стабильность ещё не проверена", result["limit"])
        homepage = next(row for row in checks if row["request"] == "GET https://portal.example/")
        self.assertEqual(homepage["result"], "HTTP 200")
        self.assertIn("/orders не проверен", homepage["limit"])
        self.assert_answer("diag-handover", result["check_id"])
        self.assertEqual(set(self.lessons), {
            "diag-intake", "diag-scope", "diag-dns", "diag-tls", "diag-logs",
            "diag-capacity", "diag-change", "diag-handover",
        })


if __name__ == "__main__":
    unittest.main()
