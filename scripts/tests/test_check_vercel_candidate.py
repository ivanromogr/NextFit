import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('vercel_candidate', Path(__file__).parents[1] / 'check-vercel-candidate.py')
candidate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(candidate)
COMMIT = 'a' * 40


class CandidateMetadataTest(unittest.TestCase):
    def deployment(self, **updates):
        return {'id': 'dpl_Test123', 'projectId': candidate.PROJECT, 'readyState': 'READY',
                'target': None, 'url': 'nextfit-candidate.vercel.app',
                'meta': {'githubCommitSha': COMMIT}, **updates}

    def test_exact_preview_is_metadata_only(self):
        result = candidate.validate_deployment(self.deployment(), COMMIT)
        self.assertEqual(result['commit'], COMMIT)
        self.assertIn('acceptance remains pending', result['scope'])

    def test_wrong_commit_project_target_or_unready_state_is_rejected(self):
        for updates in ({'meta': {'githubCommitSha': 'b' * 40}}, {'projectId': 'other-project'},
                        {'target': 'production'}, {'readyState': 'BUILDING'}, {'meta': None}):
            with self.subTest(updates=updates), self.assertRaises(candidate.CandidateFailure):
                candidate.validate_deployment(self.deployment(**updates), COMMIT)

    def test_unexpected_host_is_rejected(self):
        with self.assertRaises(candidate.CandidateFailure):
            candidate.validate_deployment(self.deployment(url='attacker.example.invalid'), COMMIT)

    def test_server_filter_cannot_make_an_old_preview_qualify(self):
        with patch.object(candidate, 'get_json', return_value={'deployments': [self.deployment(meta={'githubCommitSha': 'b' * 40})]}) as read:
            with self.assertRaisesRegex(candidate.CandidateFailure, 'No preview exists'):
                candidate.check(COMMIT, 'test-binding')
            self.assertEqual(read.call_count, 1)

    def test_detail_must_confirm_the_commit_even_after_list_matches(self):
        with patch.object(candidate, 'get_json', side_effect=[{'deployments': [self.deployment()]}, self.deployment(meta={'githubCommitSha': 'b' * 40})]):
            with self.assertRaisesRegex(candidate.CandidateFailure, 'source does not match'):
                candidate.check(COMMIT, 'test-binding')

    def test_missing_binding_never_calls_the_network(self):
        with patch.object(candidate, 'get_json') as read:
            with self.assertRaises(candidate.CandidateFailure):
                candidate.check(COMMIT, None)
            read.assert_not_called()


if __name__ == '__main__':
    unittest.main()
