import importlib.util
import json
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(); self.ids=[]; self.links=[]; self.assets=[]; self.feed(source)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag=='a': self.links.append(a.get('href',''))
        if tag=='script' and a.get('src'): self.assets.append(a['src'])
        if tag=='link' and a.get('href'): self.assets.append(a['href'])

class BuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(['python3','scripts/build.py'],cwd=ROOT,check=True,capture_output=True)
        cls.profile=json.loads((ROOT/'profile.json').read_text())
    def test_all_careers_preserved(self):
        self.assertEqual(len(self.profile['careers']),7)
        for c in self.profile['careers']:
            self.assertTrue(c['projects'])
            self.assertIn(c['company'],(ROOT/'resume.html').read_text())
    def test_current_work_before_personal(self):
        source=(ROOT/'index.html').read_text()
        self.assertLess(source.index('id="projects"'),source.index('id="personal"'))
        self.assertTrue(all(p['category'].startswith('SOCAR') for p in self.profile['projects']))
    def test_html_links_and_unique_ids(self):
        for name in ['index.html','resume.html']:
            doc=Document((ROOT/name).read_text())
            self.assertEqual(len(doc.ids),len(set(doc.ids)))
            for link in doc.links:
                if link.startswith('#'): self.assertIn(link[1:],doc.ids)
                elif not link.startswith(('https://','mailto:')): self.assertTrue((ROOT/link.split('#')[0]).is_file(),link)
            for asset in doc.assets: self.assertTrue((ROOT/asset.split('?')[0]).is_file(),asset)
    def test_no_private_data_or_unverified_metrics(self):
        for name in ['profile.json','index.html','resume.html','README.md']:
            content=(ROOT/name).read_text()
            for private in ['socar.slack.com','atlassian.net','010-','9·17·28','누락·중복 0건','320건','3.5분']:
                self.assertNotIn(private,content)
    def test_progress_state_is_explicit(self):
        p=next(x for x in self.profile['projects'] if x['id']=='db-review')
        self.assertEqual(p['status'],'검수 진행')
        self.assertIn('현재 검수 단계',p['result'])
    def test_public_release_excludes_review_material(self):
        self.assertFalse(self.profile.get('review_mode', False))
        self.assertNotIn('review_items', self.profile)
        for name in ['index.html', 'resume.html', 'README.md', 'profile.json']:
            content = (ROOT / name).read_text()
            for marker in ['공개 전 확인할 내용', '검토용 초안', 'source_conflicts']:
                self.assertNotIn(marker, content)
        self.assertFalse(list(ROOT.glob('*.pdf')))
        self.assertFalse(list(ROOT.glob('*.zip')))
    def test_assets_have_content_versions(self):
        for name in ['index.html', 'resume.html']:
            doc = Document((ROOT / name).read_text())
            for asset in doc.assets:
                self.assertRegex(asset, r'\?v=[0-9a-f]{12}$')
    def test_build_is_deterministic(self):
        paths=[ROOT/name for name in ['index.html','resume.html','README.md']]
        before=[p.read_bytes() for p in paths]
        subprocess.run(['python3','scripts/build.py'],cwd=ROOT,check=True,capture_output=True)
        self.assertEqual(before,[p.read_bytes() for p in paths])
    def test_input_escaping_and_url_policy(self):
        spec=importlib.util.spec_from_file_location('build',ROOT/'scripts/build.py'); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        self.assertEqual(m.esc('<script>'), '&lt;script&gt;')
        with self.assertRaises(ValueError): m.safe_url('javascript:alert(1)')

if __name__=='__main__': unittest.main()
