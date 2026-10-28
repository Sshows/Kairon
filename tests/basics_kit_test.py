"""Check that the foundation exercises support their stated observations."""
from pathlib import Path
from hashlib import sha256
import csv
import ipaddress
import json
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[1]
KIT=ROOT/'public/labs/kairon-basics'

def table(name):
    with (KIT/name).open(encoding='utf-8',newline='') as source:
        return list(csv.DictReader(source))

class BasicsKit(unittest.TestCase):
    def test_download_matches_every_inert_source(self):
        target=ROOT/'public/downloads/kairon-basics.zip'
        manifest=json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
        self.assertEqual(sha256(target.read_bytes()).hexdigest(),manifest['sha256'])
        files=sorted(p for p in KIT.rglob('*') if p.is_file())
        self.assertEqual(len(files),14)
        self.assertEqual(manifest['files'],len(files))
        with zipfile.ZipFile(target) as archive:
            self.assertEqual(set(archive.namelist()),{'kairon-basics/'+p.relative_to(KIT).as_posix() for p in files})
            for path in files:
                self.assertIn(path.suffix,{'.txt','.csv','.md','.json'})
                path.read_text(encoding='utf-8')
                self.assertEqual(path.read_bytes(),archive.read('kairon-basics/'+path.relative_to(KIT).as_posix()))

    def test_business_properties_and_shared_account_risk(self):
        cases={row['case_id']:row for row in table('cia-cases.csv')}
        self.assertEqual(cases['case-1']['primary_property'],'confidentiality')
        self.assertEqual(cases['case-2']['primary_property'],'integrity')
        self.assertEqual(cases['case-3']['primary_property'],'availability')
        risks={row['risk_id']:row for row in table('risk-register.csv')}
        self.assertIn('общий',risks['R-02']['weakness'])
        self.assertIn('интернета',risks['R-02']['exposure'])
        self.assertIn('отозвать',risks['R-02']['business_effect'])
        self.assertIn('Не подключён',risks['R-01']['exposure'])

    def test_addresses_dns_and_ports_are_examples_not_live_targets(self):
        addresses={row['address']:row for row in table('addresses.csv')}
        self.assertTrue(ipaddress.ip_address('127.0.0.1').is_loopback)
        self.assertEqual(addresses['127.0.0.1']['category'],'loopback')
        self.assertEqual(addresses['192.0.2.80']['category'],'documentation')
        records=(KIT/'dns-records.txt').read_text(encoding='utf-8').splitlines()
        a=[line.split() for line in records if len(line.split())==5 and line.split()[3]=='A']
        self.assertEqual([row[4] for row in a if row[0]=='shop.example.'],['192.0.2.80'])
        services={row['service']:row for row in table('services.csv')}
        self.assertEqual(services['training-admin']['port'],'8443')
        self.assertEqual(services['training-admin']['address'],'127.0.0.1')
        http=(KIT/'http-cases.txt').read_text(encoding='utf-8')
        case_b=http.split('case-b')[1].split('case-c')[0]
        self.assertIn('shop-support.example',case_b)
        self.assertIn('shop.example',case_b)
        self.assertIn('зашифровано',case_b)

    def test_authentication_does_not_replace_authorization(self):
        methods={row['method_id']:row for row in table('login-methods.csv')}
        self.assertIn('аппаратный',methods['method-c']['check_2'])
        self.assertEqual(methods['method-b']['factor_description'],'Два знания')
        rules=table('access-rules.csv')
        for rule in rules:
            self.assertEqual(rule['allowed_to_read']=='yes',rule['owner']==rule['requesting_user'])
        self.assertEqual([row['order_id'] for row in rules if row['allowed_to_read']=='no'],['order-202'])
        flow=(KIT/'data-flow.txt').read_text(encoding='utf-8')
        self.assertIn('flow-2: Браузер передаёт',flow)
        self.assertIn('сессии на сервере',flow)

    def test_release_cloud_and_ai_decisions_remain_offline(self):
        release={row['step_id']:row for row in table('release-plan.csv')}
        self.assertIn('отдельной копии',release['step-c']['proposed_action'])
        self.assertIn('возврат',release['step-c']['proposed_action'])
        cloud=table('cloud-responsibility.csv')
        self.assertEqual([row['responsible'] for row in cloud if 'кому разрешено читать' in row['setting']],['customer'])
        self.assertEqual([row['responsible'] for row in cloud if 'Физическая охрана' in row['setting']],['provider'])
        ai=(KIT/'ai-case.txt').read_text(encoding='utf-8')
        decision=ai.split('action-b:')[1].split('action-c:')[0]
        self.assertIn('не отправлять',decision)
        self.assertIn('скрыть',decision)
        self.assertIn('DEMO_NOT_A_SECRET',ai)

if __name__=='__main__':
    unittest.main()
