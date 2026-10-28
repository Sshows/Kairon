"""Verify original inert evidence and distinguish observations from verdicts."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime
import csv
import json
import subprocess
import sys
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[1]
KIT=ROOT/'public/labs/kairon-analysis'

def table(name):
    with (KIT/name).open(encoding='utf-8',newline='') as source:
        return list(csv.DictReader(source))

class AnalysisKit(unittest.TestCase):
    def test_zip_contains_exactly_the_original_inert_files(self):
        target=ROOT/'public/downloads/kairon-analysis.zip'
        manifest=json.loads(target.with_suffix('.json').read_text(encoding='utf-8'))
        self.assertEqual(sha256(target.read_bytes()).hexdigest(),manifest['sha256'])
        files=sorted(p for p in KIT.rglob('*') if p.is_file())
        self.assertEqual(len(files),14);self.assertEqual(manifest['files'],len(files))
        with zipfile.ZipFile(target) as archive:
            self.assertEqual(set(archive.namelist()),{'kairon-analysis/'+p.relative_to(KIT).as_posix() for p in files})
            for file in files:
                data=file.read_bytes();file.read_text(encoding='utf-8')
                self.assertIn(file.suffix,{'.md','.txt','.csv'})
                self.assertFalse(data.startswith((b'MZ',b'\x7fELF')))
                self.assertEqual(data,archive.read('kairon-analysis/'+file.relative_to(KIT).as_posix()))

    def test_evidence_hashes_types_and_saved_strings_match_sources(self):
        register=table('evidence-register.csv')
        self.assertEqual(len(register),2)
        for row in register:
            self.assertEqual(sha256((KIT/row['path']).read_bytes()).hexdigest(),row['sha256'])
        observed=table('file-observations.csv')
        for row in observed:
            sample=KIT/row['path']
            self.assertEqual(sample.suffix,'.'+row['last_extension'])
            sample.read_text(encoding='utf-8')
            if sys.platform.startswith('linux'):
                result=subprocess.run(['file','--brief','--mime-type',str(sample)],capture_output=True,text=True,check=True,timeout=10)
                self.assertEqual(result.stdout.strip(),'text/plain')
        sample=(KIT/'samples/invoice.pdf.txt').read_text(encoding='utf-8')
        for fragment in ['DEMO_REVIEW_MARKER','https://updates.example.invalid/status','powershell']:
            self.assertIn(fragment,sample)
            self.assertIn(fragment,(KIT/'strings-review.txt').read_text(encoding='utf-8'))

    def test_format_cards_are_written_hex_not_executable_samples(self):
        cards={row['card_id']:row for row in table('format-cards.csv')}
        self.assertEqual(bytes.fromhex(cards['CARD-B']['written_prefix']),b'\x7fELF')
        self.assertEqual(cards['CARD-B']['format_hint'],'ELF')
        self.assertIn('недостаточно',cards['CARD-A']['limit'])
        self.assertIn('положение',cards['CARD-C']['limit'])

    def test_same_marker_alert_does_not_discriminate_two_texts(self):
        observations=table('scan-observations.csv')
        self.assertEqual({row['file_id'] for row in observations},{'F-01','F-02'})
        self.assertEqual({row['rule_id'] for row in observations},{'DemoReviewMarker'})
        self.assertEqual({row['decision'] for row in observations},{'review-context'})
        for row in table('evidence-register.csv'):
            self.assertIn('DEMO_REVIEW_MARKER',(KIT/row['path']).read_text(encoding='utf-8'))

    def test_timeline_and_response_preserve_known_and_unknown_facts(self):
        events=table('event-timeline.csv')
        self.assertEqual([row['time_utc'] for row in events],sorted(row['time_utc'] for row in events))
        downloaded=next(row for row in events if row['event']=='download-record')
        process=next(row for row in events if row['event']=='process-created')
        self.assertLess(datetime.fromisoformat(downloaded['time_utc']),datetime.fromisoformat(process['time_utc']))
        self.assertEqual(process['process_id'],'PROC-03')
        self.assertEqual(process['parent_process_id'],'PROC-01')
        self.assertIn('не собрана',process['details'])
        response={row['action_id']:row for row in table('response-options.csv')}
        self.assertIn('сохранить',response['action-b']['proposal'])
        self.assertIn('согласовать',response['action-b']['proposal'])
        report=(KIT/'report-options.txt').read_text(encoding='utf-8').split('report-c:')[1]
        self.assertIn('PROC-03',report);self.assertIn('пока не подтверждены',report)
        self.assertIn('CASE-17',(KIT/'case-notes.txt').read_text(encoding='utf-8'))

if __name__=='__main__': unittest.main()
