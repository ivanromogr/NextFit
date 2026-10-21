"""Browser proof of a delayed refresh cookie during account switch; H2 loopback only."""
import json
from pathlib import Path
import secrets
import sys
import time
import traceback
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from playwright.sync_api import Error as BrowserError, sync_playwright

API = 'http://127.0.0.1:18080'
WEB = 'http://127.0.0.1:4181'
assert Path('/tmp/nextfit-beta-local/ready').read_text() == 'isolated-h2-fixture'
private, accounts = [], []


def redact(kind, error, trace):
    text = ''.join(traceback.format_exception(kind, error, trace))
    for value in private:
        if value:
            text = text.replace(value, '[fixture-redacted]')
    sys.stderr.write(text)


sys.excepthook = redact


def call(method, path, body, token=None, expected=200):
    headers = {'Content-Type': 'application/json', 'X-Client-Type': 'MOBILE'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = Request(API + path, method=method, headers=headers, data=json.dumps(body).encode())
    try:
        response = urlopen(request, timeout=15)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == expected, (path, response.status)
        return json.loads(response.read().decode(response.headers.get_content_charset() or 'utf-8'))


try:
    for label in ('first', 'second'):
        email = 'cookie-race-' + label + '-' + secrets.token_hex(8) + '@example.invalid'
        password = 'Fixture!' + secrets.token_hex(16)
        private.extend([email, password])
        result = call('POST', '/api/register', {'nombre': 'CookieRace', 'apellido': 'Local', 'email': email,
            'contrasena': password, 'rol': 'cliente', 'acceptTerms': True, 'acceptPrivacy': True,
            'marketingConsent': False}, expected=201)
        private.extend([result['accessToken'], result.get('refreshToken')])
        accounts.append({'email': email, 'password': password, 'id': result['user']['id'], 'token': result['accessToken']})

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        try:
            context = browser.new_context(viewport={'width': 390, 'height': 844})
            context.route('**/*', lambda route: route.continue_()
                if route.request.url.startswith((WEB + '/', API + '/')) else route.abort())
            page = context.new_page()
            page.goto(WEB + '/auth/login', wait_until='networkidle')
            first, second = accounts
            page.get_by_placeholder('usuario@email.com').fill(first['email'])
            page.locator('input[type=password]').fill(first['password'])
            page.get_by_role('button', name='INICIAR SESIÓN', exact=True).click()
            page.wait_for_url(WEB + '/cliente/dashboard')
            held = []

            def hold_refresh(route):
                response = route.fetch()
                assert response.status == 200
                held.append((route, response))

            context.route(WEB + '/api/auth/refresh', hold_refresh)
            page.goto(WEB + '/auth/login', wait_until='domcontentloaded')
            deadline = time.monotonic() + 15
            while not held and time.monotonic() < deadline:
                page.wait_for_timeout(100)
            assert len(held) == 1, 'The actual first-account rotation was not captured'
            page.get_by_placeholder('usuario@email.com').fill(second['email'])
            page.locator('input[type=password]').fill(second['password'])
            page.get_by_role('button', name='INICIAR SESIÓN', exact=True).click()
            page.wait_for_url(WEB + '/cliente/dashboard')
            cookie = next(item['value'] for item in context.cookies() if item['name'] == 'nextfit_refresh')
            private.append(cookie)
            context.unroute(WEB + '/api/auth/refresh', hold_refresh)
            try:
                held[0][0].fulfill(response=held[0][1])
            except BrowserError:
                pass  # Chromium may already have disposed the aborted XHR.
            page.wait_for_timeout(200)
            assert next(item['value'] for item in context.cookies() if item['name'] == 'nextfit_refresh') == cookie
            with page.expect_response(lambda response: response.url == WEB + '/api/auth/refresh') as restored:
                page.reload(wait_until='domcontentloaded')
            assert restored.value.status == 200
            assert restored.value.json()['user']['id'] == second['id']
            page.wait_for_url(WEB + '/cliente/dashboard')
            assert page.evaluate('JSON.parse(sessionStorage.getItem("auth_session")).id') == second['id']
            print('PASS browser cookie race: delayed real rotation of account A cannot replace account B cookie; reload restores B.')
        finally:
            browser.close()
finally:
    for account in accounts:
        call('DELETE', '/api/auth/account', {'currentPassword': account['password']}, account['token'])
        call('POST', '/api/auth/login', {'email': account['email'], 'password': account['password']}, expected=401)
    print('Local fixture accounts deleted and subsequent login rejected.')
