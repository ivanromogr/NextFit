"""Public production smoke checks. Never creates accounts or uses credentials."""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = 'https://nextfit-pa8i.onrender.com'
ORIGIN = 'https://next-fit-q7uo.vercel.app'
UNTRUSTED_ORIGIN = 'https://nextfit-untrusted.example.invalid'


class CheckFailed(Exception):
    pass


def require(condition, message):
    if not condition:
        raise CheckFailed(message)


def request(path, *, timeout, method='GET', payload=None, headers=None):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(payload).encode() if payload is not None else None,
        method=method, headers=headers or {})
    started = time.monotonic()
    try:
        response = urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.HTTPError as error:
        response = error
    except (OSError, ValueError) as error:
        raise CheckFailed(f'{method} {path}: {type(error).__name__} after '
                          f'{time.monotonic() - started:.1f}s; subsequent checks did not run') from None
    try:
        with response:
            body = response.read().decode(response.headers.get_content_charset() or 'utf-8')
            return response.code, {key.lower(): value for key, value in response.headers.items()}, body
    except OSError as error:
        raise CheckFailed(f'{method} {path}: {type(error).__name__} while reading the response; '
                          'subsequent checks did not run') from None
    except (UnicodeError, LookupError):
        raise CheckFailed(f'{method} {path}: invalid response text encoding') from None


def json_body(body, path):
    try:
        value = json.loads(body)
    except (ValueError, TypeError):
        raise CheckFailed(f'{path}: response is not valid JSON') from None
    require(isinstance(value, dict), f'{path}: expected a JSON object')
    return value


def run(timeout=45, startup_timeout=45):
    started = time.monotonic()
    status, _, body = request('/actuator/health', timeout=startup_timeout)
    require(status == 200 and json_body(body, '/actuator/health').get('status') == 'UP',
            f'/actuator/health: expected HTTP 200 and UP, received HTTP {status}')
    print(f'PASS health: UP in {time.monotonic() - started:.1f}s', flush=True)
    if startup_timeout != timeout:
        # A longer startup probe must not relax steady-state response checks.
        status, _, body = request('/actuator/health', timeout=timeout)
        require(status == 200 and json_body(body, '/actuator/health').get('status') == 'UP',
                f'/actuator/health: steady-state check failed (HTTP {status})')
        print(f'PASS health: second request within the normal {timeout}s timeout', flush=True)

    for path in ['/api/moderation/access', '/api/moderation/reports', '/api/chat/safety/' + str(uuid.uuid4())]:
        status, _, body = request(path, timeout=timeout)
        require(status == 401 and json_body(body, path).get('code') == 'MISSING_TOKEN',
                f'{path}: anonymous access must return HTTP 401 MISSING_TOKEN (received HTTP {status})')
        print('PASS anonymous access denied:', path, flush=True)

    path = '/api/moderation/access'
    preflight = {'Origin': ORIGIN, 'Access-Control-Request-Method': 'GET',
                 'Access-Control-Request-Headers': 'authorization'}
    status, headers, _ = request(path, timeout=timeout, method='OPTIONS', headers=preflight)
    require(status in (200, 204), f'CORS preflight: unexpected HTTP {status}')
    require(headers.get('access-control-allow-origin') == ORIGIN,
            'CORS preflight: production origin must be allowed exactly')
    require(headers.get('access-control-allow-credentials', '').lower() == 'true',
            'CORS preflight: credentialed browser requests are not allowed')
    allowed_headers = {value.strip().lower() for value in headers.get('access-control-allow-headers', '').split(',')}
    require('authorization' in allowed_headers, 'CORS preflight: Authorization header is not allowed')
    print('PASS CORS: exact production origin, credentials and Authorization', flush=True)

    status, headers, _ = request(path, timeout=timeout, method='OPTIONS',
                                 headers={**preflight, 'Origin': UNTRUSTED_ORIGIN})
    require(status in (200, 204, 403) and not headers.get('access-control-allow-origin'),
            f'CORS preflight: untrusted origin must not be allowed (HTTP {status})')
    print('PASS CORS: untrusted origin rejected', flush=True)

    path = '/api/auth/google'
    status, _, body = request(path, timeout=timeout, method='POST',
                             payload={'credential': 'not-a-valid-id-token'},
                             headers={'Content-Type': 'application/json', 'Origin': ORIGIN})
    require(status == 401 and json_body(body, path).get('code') == 'INVALID_GOOGLE_TOKEN',
            f'{path}: expected HTTP 401 INVALID_GOOGLE_TOKEN (received HTTP {status}); '
            'this public endpoint must not require an existing session')
    print('PASS Google: invalid credential rejected by the public login endpoint', flush=True)
    print('Public smoke checks passed; real login and the candidate deployment remain separate checks.', flush=True)


def bounded_timeout(value):
    parsed = int(value)
    if not 1 <= parsed <= 300:
        raise argparse.ArgumentTypeError('timeout must be between 1 and 300 seconds')
    return parsed


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--timeout', type=bounded_timeout, default=45)
    parser.add_argument('--startup-timeout', type=bounded_timeout,
                        help='optional initial health allowance; subsequent requests use --timeout')
    args = parser.parse_args(argv)
    try:
        run(args.timeout, args.startup_timeout or args.timeout)
    except (CheckFailed, UnicodeError) as error:
        print(f'FAIL production check: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
