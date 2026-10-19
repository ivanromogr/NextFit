"""Check built route loading with mocked API; no production users or API writes.

Requires Playwright + Chromium, a Vite build with --manifest and a local preview
on port 4181. Run from any working directory.
"""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
base='http://127.0.0.1:4181'
manifest=json.loads((Path(__file__).resolve().parents[1] / 'Frontend/AplicacionFrontend/dist/.vite/manifest.json').read_text())
register=manifest['src/pages/auth/Register.jsx']['file']
progress=manifest['src/pages/cliente/ProgresoCliente.jsx']['file']
def network(route):
 url=route.request.url
 if '/api/' in url:
  route.fulfill(status=401,content_type='application/json',body='{"code":"MISSING_TOKEN","message":"Se requiere autenticación"}')
 elif url.startswith(base):route.continue_()
 else:route.abort()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for viewport in [{'width':390,'height':844},{'width':1365,'height':900}]:
  context=browser.new_context(viewport=viewport)
  context.route('**/*',network)
  page=context.new_page(); requested=[]; errors=[]
  page.on('request',lambda r:requested.append(r.url))
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/cliente/progreso')
  page.get_by_role('button',name=re.compile('^iniciar sesión$',re.I)).wait_for()
  assert page.url.endswith('/auth/login')
  assert not any(progress in u for u in requested),'Private screen downloaded before authorization'
  assert not any(register in u for u in requested),'Register eagerly downloaded at login'
  page.get_by_role('link',name=re.compile('crear cuenta gratis',re.I)).click()
  page.get_by_role('heading',name=re.compile('únete al',re.I)).wait_for()
  assert any(register in u for u in requested),'Missing lazy route request'
  assert not errors, errors
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'Horizontal overflow'
  print('PASS login/guard/register on demand',viewport)
  context.close()
 context=browser.new_context(viewport={'width':390,'height':844})
 context.route('**/*',network)
 page=context.new_page()
 page.route('**/'+register,lambda route:route.abort())
 page.goto(base+'/auth/login')
 page.get_by_role('link',name=re.compile('crear cuenta gratis',re.I)).click()
 page.get_by_role('alert').get_by_role('heading',name='No se ha podido abrir esta pantalla').wait_for()
 page.unroute('**/'+register)
 with page.expect_navigation(wait_until='domcontentloaded'):
  page.get_by_role('button',name='Volver a cargar').click()
 page.get_by_role('heading',name=re.compile('únete al',re.I)).wait_for()
 print('PASS rejected chunk shows recovery and reload opens register')
 context.close();browser.close()
