"""Smoke-check contract tests; all HTTP responses are isolated fixtures."""
import contextlib
from email.message import Message
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

spec = importlib.util.spec_from_file_location('production_check', Path(__file__).resolve().parents[1] / 'check-production.py')
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class Reply:
    def __init__(self, code, data, headers=None):
        self.code = code
        self.body = json.dumps(data).encode()
        self.headers = Message()
        self.headers['Content-Type'] = 'application/json; charset=utf-8'
        for key, value in (headers or {}).items():
            self.headers[key] = value

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self.body


class ProductionContractTest(unittest.TestCase):
    def reply(self, req, timeout):
        path = urlsplit(req.full_url).path
        if path == '/actuator/health':
            return Reply(200, {'status': 'UP'})
        if req.method == 'OPTIONS':
            if req.get_header('Origin') != check.ORIGIN:
                return Reply(403, {})
            return Reply(200, {}, {
                'Access-Control-Allow-Origin': check.ORIGIN,
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type'})
        if path == '/api/auth/google':
            self.assertEqual(json.loads(req.data), {'credential': 'not-a-valid-id-token'})
            return Reply(401, {'code': 'INVALID_GOOGLE_TOKEN'})
        return Reply(401, {'code': 'MISSING_TOKEN'})

    def invoke(self, transport, args=None):
        output, errors = io.StringIO(), io.StringIO()
        with patch.object(check.urllib.request, 'urlopen', side_effect=transport), \
                contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            result = check.main(args or [])
        return result, output.getvalue(), errors.getvalue()

    def test_healthy_contract_passes(self):
        result, output, errors = self.invoke(self.reply)
        self.assertEqual(result, 0, errors)
        self.assertIn('Public smoke checks passed', output)
        self.assertEqual(errors, '')

    def test_missing_cookie_cors_permission_fails(self):
        def transport(req, timeout):
            response = self.reply(req, timeout)
            if req.method == 'OPTIONS':
                del response.headers['Access-Control-Allow-Credentials']
            return response
        result, _, errors = self.invoke(transport)
        self.assertEqual(result, 1)
        self.assertIn('credentialed browser requests', errors)

    def test_reflecting_an_untrusted_origin_fails(self):
        def transport(req, timeout):
            if req.method == 'OPTIONS' and req.get_header('Origin') == check.UNTRUSTED_ORIGIN:
                return Reply(200, {}, {'Access-Control-Allow-Origin': check.UNTRUSTED_ORIGIN})
            return self.reply(req, timeout)
        result, _, errors = self.invoke(transport)
        self.assertEqual(result, 1)
        self.assertIn('untrusted origin must not be allowed', errors)

    def test_google_endpoint_requiring_an_existing_session_fails(self):
        def transport(req, timeout):
            if req.method == 'POST':
                return Reply(401, {'code': 'MISSING_TOKEN'})
            return self.reply(req, timeout)
        result, _, errors = self.invoke(transport)
        self.assertEqual(result, 1)
        self.assertIn('INVALID_GOOGLE_TOKEN', errors)

    def test_response_body_timeout_fails_without_running_later_checks(self):
        requests = []
        def transport(req, timeout):
            requests.append(req)
            response = self.reply(req, timeout)
            response.read = lambda: (_ for _ in ()).throw(TimeoutError())
            return response
        result, output, errors = self.invoke(transport)
        self.assertEqual(result, 1)
        self.assertEqual(len(requests), 1)
        self.assertNotIn('passed', output)
        self.assertIn('TimeoutError while reading', errors)
        self.assertNotIn('Traceback', errors)

    def test_startup_allowance_does_not_relax_later_checks(self):
        timeouts = []
        def transport(req, timeout):
            timeouts.append(timeout)
            return self.reply(req, timeout)
        result, _, errors = self.invoke(transport, ['--startup-timeout', '220'])
        self.assertEqual(result, 0, errors)
        self.assertEqual(timeouts[0], 220)
        self.assertEqual(timeouts[1:], [45] * 7)


if __name__ == '__main__':
    unittest.main()
