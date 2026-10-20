import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preview_access import HEADER, PREVIEW_HOST, preview_headers


class PreviewAccessTest(unittest.TestCase):
    def test_exact_preview_receives_credential(self):
        self.assertEqual(preview_headers('https://' + PREVIEW_HOST + '/auth/login', {}, 'fixture')[HEADER], 'fixture')

    def test_other_origins_never_receive_credential(self):
        for url in ['https://vercel.com/sso-api', 'https://api.vercel.com/',
                    'https://next-fit-q7uo.vercel.app/', 'https://nextfit-pa8i.onrender.com/api/auth/login',
                    'http://' + PREVIEW_HOST, 'https://' + PREVIEW_HOST + '.example.com/',
                    'https://' + PREVIEW_HOST + ':444/', 'https://user@' + PREVIEW_HOST + '/']:
            with self.subTest(url=url):
                self.assertNotIn(HEADER, preview_headers(url, {HEADER: 'stale'}, 'fixture'))

    def test_missing_secret_and_mixed_case_stale_header(self):
        self.assertEqual(preview_headers('https://' + PREVIEW_HOST, {'X-Vercel-Protection-Bypass': 'stale', 'Accept': '*/*'}, None), {'Accept': '*/*'})
