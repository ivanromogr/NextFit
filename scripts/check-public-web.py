"""Read-only deployed-page browser check. API calls are intercepted, never sent.

Checks delivery, route loading and layout, not real login or provider integration.
Requires Playwright, Chromium and trust in the environment proxy CA via NSS.
For previews, first verify the exact source SHA with check-vercel-candidate.py.
"""
import argparse
import os
import re
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright


def origin(value):
    parsed = urlsplit(value)
    if (parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment
            or not re.fullmatch(r'next-fit-q7uo(?:-[a-z0-9-]+)?\.vercel\.app', parsed.hostname or '')):
        raise argparse.ArgumentTypeError('Expected an HTTPS NextFit Vercel origin without a path.')
    return 'https://' + parsed.hostname


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', type=origin, default='https://next-fit-q7uo.vercel.app')
    args = parser.parse_args()
    base = args.base_url
    with sync_playwright() as p:
        options = {'executable_path': '/usr/bin/chromium', 'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('HTTPS_PROXY'):
            options['proxy'] = {'server': os.environ['HTTPS_PROXY']}
        browser = p.chromium.launch(**options)
        try:
            for width, height in [(390, 844), (1365, 900)]:
                context = browser.new_context(viewport={'width': width, 'height': height})
                errors, failed_assets, remote_writes = [], [], []

                def network(route):
                    request = route.request
                    url = urlsplit(request.url)
                    if '/api/' in url.path:
                        route.fulfill(status=401, content_type='application/json',
                                      body='{"code":"MISSING_TOKEN","message":"Se requiere autenticación"}')
                    elif request.method not in ('GET', 'HEAD'):
                        remote_writes.append(request.method)
                        route.abort()
                    elif request.url.startswith(base + '/'):
                        route.continue_()
                    else:
                        route.abort()

                context.route('**/*', network)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda response: failed_assets.append(response.url)
                        if response.status >= 400 and response.url.startswith(base + '/')
                        and response.request.resource_type in ('script', 'stylesheet', 'document') else None)
                try:
                    for path, heading in [('/auth/login', None), ('/register', 'ÚNETE AL TEAM.'),
                                          ('/forgot-password', 'Recupera tu contraseña'),
                                          ('/terms', 'Términos de uso'), ('/privacy', 'Política de privacidad')]:
                        response = page.goto(base + path, wait_until='networkidle', timeout=30000)
                        assert response and response.status == 200, f'{path}: document did not return 200'
                        if heading:
                            page.get_by_role('heading', name=heading, exact=True).wait_for()
                        else:
                            page.get_by_role('button', name=re.compile('^iniciar sesión$', re.I)).wait_for()
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{path}: horizontal overflow'
                        assert not errors, f'{path}: uncaught page error'
                        assert not failed_assets, f'{path}: failed document/script/stylesheet'
                        print(f'PASS deployed public page: {path}, {width}x{height}', flush=True)
                    page.goto(base + '/cliente/progreso', wait_until='networkidle', timeout=30000)
                    page.get_by_role('button', name=re.compile('^iniciar sesión$', re.I)).wait_for()
                    assert urlsplit(page.url).path == '/auth/login', 'Anonymous private route did not redirect'
                    assert not errors and not failed_assets and not remote_writes
                    print(f'PASS anonymous guard: {width}x{height}; API responses isolated', flush=True)
                finally:
                    context.close()
        finally:
            browser.close()
    print('Public-page delivery only: no accounts, real API calls, social login or candidate acceptance asserted.')


if __name__ == '__main__':
    main()
