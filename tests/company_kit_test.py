"""Verify concrete observations and repeatable practice using owned company data."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime
import csv
import json
import shutil
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "public/labs/kairon-company-lab"


def table(name):
    with (KIT / name).open(encoding="utf-8", newline="") as source:
        return list(csv.DictReader(source))


def events(name):
    return [json.loads(line) for line in (KIT / name).read_text(encoding="utf-8").splitlines() if line]


def payload(name):
    raw = (KIT / name).read_text(encoding="utf-8")
    return json.loads(raw.split("\n\n", 1)[1])


class CompanyKitTest(unittest.TestCase):
    def test_download_matches_every_inert_source(self):
        target = ROOT / "public/downloads/kairon-company-lab.zip"
        manifest = json.loads(target.with_suffix(".json").read_text())
        self.assertEqual(manifest["sha256"], sha256(target.read_bytes()).hexdigest())
        sources = [path for path in KIT.rglob("*") if path.is_file()]
        self.assertEqual(len(sources), 27)
        with zipfile.ZipFile(target) as archive:
            self.assertEqual(len(archive.infolist()), len(sources))
            for item in archive.infolist():
                path = Path(item.filename)
                self.assertFalse(path.is_absolute())
                self.assertNotIn("..", path.parts)
                self.assertEqual(path.parts[0], "kairon-company-lab")
                self.assertIn(path.suffix, {".txt", ".md", ".csv", ".jsonl", ".log", ".demo"})
                self.assertEqual(archive.read(item), KIT.joinpath(*path.parts[1:]).read_bytes())
                archive.read(item).decode("utf-8")

    def test_login_success_is_correlated_without_inventing_commands(self):
        data = events("logs/windows-events.jsonl")
        chain = [row for row in data if row.get("source_ip") == "198.51.100.42"]
        self.assertEqual([row["event_id"] for row in chain], [4625, 4625, 4625, 4625, 4624])
        self.assertEqual(chain[-1]["record"], "EV-05")
        process = next(row for row in data if row["record"] == "EV-06")
        self.assertEqual(process["logon_id"], chain[-1]["logon_id"])
        self.assertEqual(process["host"], chain[-1]["host"])
        self.assertEqual(process["command_line"], "")
        self.assertNotIn(4104, [row["event_id"] for row in data])
        self.assertIn("PowerShell Script Block Logging: disabled", (KIT / "telemetry/settings.txt").read_text(encoding="utf-8"))
        scheduled = next(row for row in data if row["record"] == "EV-07")
        approved = next(row for row in table("approved-changes.csv") if row["change_id"] == "CHG-17")
        for field in ("host", "account", "process"):
            self.assertEqual(scheduled[field], approved[field])
        moment = datetime.fromisoformat(scheduled["time"])
        self.assertTrue(datetime.fromisoformat(approved["start_utc"]) <= moment <= datetime.fromisoformat(approved["end_utc"]))

    def test_priority_incorporates_applicability_and_exposure(self):
        findings = table("patch/queue.csv")
        assets = {row["asset"]: row for row in table("inventory.csv")}
        urgent = [row for row in findings if row["affected_version_confirmed"] == "yes" and row["internet_exposed"] == "yes" and row["known_exploited_demo"] == "yes"]
        self.assertEqual([row["finding_id"] for row in urgent], ["FIND-B"])
        self.assertNotEqual(max(findings, key=lambda row: float(row["cvss_base_demo"]))["finding_id"], "FIND-B")
        for row in findings:
            if row["asset"] in assets:
                self.assertEqual(row["business_criticality"], assets[row["asset"]]["criticality"])
        for row in findings:
            self.assertTrue(0 <= float(row["epss_demo"]) <= 1)
            self.assertNotIn("CVE-", row["finding_id"])

    def test_offboarding_and_demo_secret_observations(self):
        left = [row for row in table("access/accounts.csv") if row["employment_status"] == "left"]
        self.assertEqual(len(left), 1)
        self.assertEqual((left[0]["account"], left[0]["current_role"], left[0]["active_sessions"], left[0]["api_tokens"]), ("temp-demo", "portal-admin", "2", "1"))
        log = (KIT / "logs/app-demo.log").read_text(encoding="utf-8").splitlines()
        self.assertTrue(any("access_token=DEMO_NOT_A_TOKEN" in line for line in log))
        self.assertTrue(any("database_url=" in line and "DEMO_NOT_A_PASSWORD" in line for line in log))
        recent = log[-3:]
        self.assertFalse(any("access_token=" in line or "database_url=" in line for line in recent))

    def test_ssh_first_value_and_authorization_need_body_and_owner(self):
        config = (KIT / "ssh/sshd_config.demo").read_text().splitlines()
        first = {}
        for line in config:
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            name, value = line.split(None, 1)
            first.setdefault(name.lower(), value)
        self.assertEqual(first["passwordauthentication"], "yes")
        self.assertEqual(first["kbdinteractiveauthentication"], "yes")
        owner = {row["order_id"]: row for row in table("web/ownership.csv")}
        disclosed = payload("web/response-other.txt")
        denied = payload("web/response-after-fix.txt")
        self.assertEqual(disclosed["order_id"], 105)
        self.assertEqual(disclosed["owner"], owner["105"]["owner"])
        self.assertEqual(owner["105"]["actor_can_read"], "no")
        self.assertEqual(denied["status"], "access_denied")
        self.assertNotIn("order_id", denied)
        for name in ("web/response-other.txt", "web/response-after-fix.txt"):
            self.assertIn("200 OK", (KIT / name).read_text(encoding="utf-8"))

    def test_restoration_preserves_old_evidence_and_final_decision(self):
        with tempfile.TemporaryDirectory(prefix="kairon-owned-company-") as directory:
            target = Path(directory) / "kairon-company-lab"
            shutil.copytree(KIT, target)
            broken = target / "recovery/work/contacts.csv"
            original = broken.read_bytes()
            preserved = target / "reports/contacts-before.csv"
            shutil.copyfile(broken, preserved)
            reference = target / "recovery/reference/contacts.csv"
            shutil.copyfile(reference, broken)
            self.assertEqual(preserved.read_bytes(), original)
            self.assertNotEqual(original, broken.read_bytes())
            self.assertEqual(sha256(broken.read_bytes()).digest(), sha256(reference.read_bytes()).digest())
            self.assertIn("CONTACTS-RESTORE-7", broken.read_text(encoding="utf-8"))
        final = events("final/events.jsonl")
        success = next(row for row in final if row.get("event_id") == 4624)
        process = next(row for row in final if row.get("event_id") == 4688)
        self.assertEqual(success["source_ip"], "203.0.113.62")
        self.assertEqual(success["logon_id"], process["logon_id"])
        choice = next(row for row in table("final/actions.csv") if row["action_id"] == "ACT-C")
        self.assertEqual(choice["approval"], "incident-lead")
        self.assertIn("preserve-evidence", choice["action"])


if __name__ == "__main__":
    unittest.main()
