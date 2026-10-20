"""Local same-origin API proxy acceptance, with disposable H2 accounts only.

Start start-local-beta.py, build with VITE_API_SAME_ORIGIN=true, then launch
Vite preview on 127.0.0.1:4181 with VITE_API_URL=http://127.0.0.1:18080.
Never accepts remote origins or provider credentials; no emails are sent.
"""
import os,sys,json,secrets,re,traceback
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
API='http://127.0.0.1:18080'
WEB='http://127.0.0.1:4181'
assert __import__('pathlib').Path('/tmp/nextfit-beta-local/ready').read_text()=='isolated-h2-fixture'
accounts=[]
private=[]
def redacted(kind,error,trace):
    text=''.join(traceback.format_exception(kind,error,trace))
    for value in private:
        if value:text=text.replace(value,'[fixture-redacted]')
    sys.stderr.write(text)
sys.excepthook=redacted
def call(method,path,body=None,token=None,expected=200):
    headers={'Content-Type':'application/json','X-Client-Type':'MOBILE'}
    if token:headers['Authorization']='Bearer '+token
    r=Request(API+path,method=method,headers=headers,data=None if body is None else json.dumps(body).encode())
    try:response=urlopen(r,timeout=25)
    except HTTPError as e:response=e
    with response:
        assert response.status==expected,(method,path,response.status)
        raw=response.read()
        return json.loads(raw.decode(response.headers.get_content_charset() or 'utf-8')) if raw else None
try:
    for role in ('cliente','entrenador'):
        email='beta-preview-'+role+'-'+secrets.token_hex(10)+'@example.invalid'
        password='Beta!'+secrets.token_hex(18)
        private.extend([email,password])
        data=call('POST','/api/register',{'nombre':'BetaPreview','apellido':'Temporal','email':email,'contrasena':password,'rol':role,'acceptTerms':True,'acceptPrivacy':True,'marketingConsent':False},expected=201)
        user={'role':role,'email':email,'password':password,'id':data['user']['id'],'token':data['accessToken'],'refresh':data.get('refreshToken')}
        private.extend([user['token'],user.get('refresh')])
        accounts.append(user)
        print('Created disposable local '+role+' fixture.',flush=True)
    with sync_playwright() as p:
        options=dict(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        # Local loopback only: no external proxy or provider requests.
        browser=p.chromium.launch(**options)
        try:
            for user in accounts:
                role=user['role'];context=browser.new_context(viewport={'width':390 if role=='cliente' else 1365,'height':900})
                errors=[];writes=[]
                def network(route):
                    r=route.request;u=urlsplit(r.url)
                    if u.scheme=='http' and u.netloc=='127.0.0.1:4181' and (r.method in ('GET','HEAD','OPTIONS') or u.path in ('/api/auth/login','/api/auth/refresh','/api/auth/logout')):
                        route.continue_()
                    elif u.scheme=='http' and u.netloc=='127.0.0.1:18080' and (r.method in ('GET','HEAD','OPTIONS') or u.path in ('/api/auth/login','/api/auth/refresh','/api/auth/logout')):
                        route.continue_()
                    else:
                        if r.method not in ('GET','HEAD'):writes.append(r.method)
                        route.abort()
                context.route('**/*',network)
                page=context.new_page()
                page.on('pageerror',lambda e:errors.append(type(e).__name__))
                try:
                    page.goto(WEB+'/auth/login',wait_until='domcontentloaded',timeout=30000)
                    page.get_by_placeholder('usuario@email.com').fill(user['email'])
                    page.locator('input[type=password]').fill(user['password'])
                    with page.expect_response(lambda r:r.url==WEB+'/api/auth/login' and r.request.method=='POST',timeout=25000) as login:
                        page.get_by_role('button',name='INICIAR SESIÓN',exact=True).click()
                    assert login.value.status==200,('login',role,login.value.status)
                    result=login.value.json();private.append(result.get('accessToken'))
                    assert result['user']['id']==user['id']
                    page.wait_for_url(re.compile('/'+role+'/dashboard$'),timeout=20000)
                    assert page.evaluate('JSON.parse(sessionStorage.getItem("auth_session")).id')==user['id']
                    with page.expect_response(lambda r:r.url==WEB+'/api/auth/refresh' and r.request.method=='POST',timeout=25000) as refresh:
                        page.reload(wait_until='domcontentloaded',timeout=30000)
                    assert refresh.value.status==200,('refresh',role,refresh.value.status,refresh.value.json().get('code'))
                    page.wait_for_url(re.compile('/'+role+'/dashboard$'),timeout=20000)
                    assert page.evaluate('JSON.parse(sessionStorage.getItem("auth_session")).id')==user['id']
                    assert not errors and not writes,(errors,writes)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    print('PASS '+role+': real browser login, correct account, private dashboard and cookie-backed session restoration on reload.',flush=True)
                finally:context.close()
        finally:browser.close()
finally:
    failures=[]
    for user in accounts:
        try:
            result=call('DELETE','/api/auth/account',{'currentPassword':user['password']},user['token'])
            assert result.get('message')=='Cuenta eliminada'
            call('POST','/api/auth/login',{'email':user['email'],'password':user['password']},expected=401)
            call('GET','/api/auth/sessions',token=user['token'],expected=401)
            if user.get('refresh'):call('POST','/api/auth/refresh',{'refreshToken':user['refresh']},expected=401)
            print('PASS cleanup '+user['role']+': account deleted; login, access token and refresh rejected.',flush=True)
        except Exception as e:
            failures.append(user['role']);print('CLEANUP FAILED for temporary '+user['role']+': '+type(e).__name__,flush=True)
    if failures:raise RuntimeError('Temporary account cleanup failed: '+','.join(failures))
