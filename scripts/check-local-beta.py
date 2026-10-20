"""Isolated local HTTP + real browser check. Never accepts remote URLs."""
import json, re, secrets
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from pathlib import Path
import tempfile
from datetime import date as calendar_date, timedelta
from playwright.sync_api import sync_playwright, expect
API='http://127.0.0.1:18080'
WEB='http://127.0.0.1:4181'
assert (Path(tempfile.gettempdir())/'nextfit-beta-local'/'ready').read_text()=='isolated-h2-fixture'

def call(method,path,body=None,token=None,expected=200):
 headers={'Content-Type':'application/json','X-Client-Type':'MOBILE'}
 if token: headers['Authorization']='Bearer '+token
 req=Request(API+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 try:
  response=urlopen(req,timeout=20); code=response.status; raw=response.read(); charset=response.headers.get_content_charset() or 'utf-8'
 except HTTPError as error:
  code=error.code; raw=error.read(); charset=error.headers.get_content_charset() or 'utf-8'
 assert code==expected, f'{method} {path}: expected {expected}, received {code}'
 if not raw:return None
 text=raw.decode(charset)
 try:return json.loads(text)
 except ValueError:return text

suffix=secrets.token_hex(5)
password='Beta!'+secrets.token_hex(12)
def account(role,name):
 email=f'beta-{name}-{suffix}@example.invalid'.lower()
 result=call('POST','/api/register',{'nombre':name,'apellido':'Beta','email':email,'contrasena':password,'rol':role,'acceptTerms':True,'acceptPrivacy':True,'marketingConsent':False},expected=201)
 return {'email':email,'id':result['user']['id'],'token':result['accessToken'],'role':role}
client=account('cliente','Atleta')
other=account('cliente','Otro')
coach=account('entrenador','Entrenador')
call('POST',f"/api/entrenador/{coach['id']}/fichar",{'email':'  '+client['email'].upper()+'  '},coach['token'])
exercise=call('GET','/api/ejercicios',token=client['token'])[0]['id']
routine=call('POST','/api/rutinas/manual',{'nombre':'Plan beta local','idCliente':client['id'],'creador':'ENTRENADOR','entrenadorId':coach['id'],'ejercicios':[{'idEjercicio':exercise,'series':2,'repeticiones':10,'peso':30.5,'rpe':8}]},coach['token'])['id']
first_day=calendar_date.today().replace(day=1)
dates=[first_day.isoformat(),(first_day+timedelta(days=1)).isoformat()]
for date in dates:
 call('POST',f"/api/calendario/{client['id']}",{'rutinaId':routine,'fecha':date},coach['token'])
events=call('GET',f"/api/calendario/{client['id']}?inicio={dates[0]}&fin={dates[1]}",token=client['token'])
events.sort(key=lambda e:e['fecha'])
for event,weight,note in zip(events,(30.5,50.5),('Primera sesión beta','Segunda sesión beta')):
 result=call('POST','/api/sesiones',{'clienteId':client['id'],'rutinaId':routine,'eventoCalendarioId':event['id'],'duracionSegundos':600,'notasGenerales':note,'series':[{'ejercicioId':exercise,'setIndex':0,'peso':weight,'reps':10,'rpe':8,'hecho':True}]},client['token'])
 assert result['seriesGuardadas']==1
first=call('GET',f"/api/sesiones/evento/{events[0]['id']}",token=coach['token'])
assert first['ejercicios'][0]['series'][0]['kilos']==30.5
call('GET',f"/api/sesiones/evento/{events[0]['id']}",token=other['token'],expected=403)
call('GET',f"/api/sesiones/evento/{events[0]['id']}",expected=401)
print('PASS real HTTP: registration, trainer relationship, routine, calendar, two distinct sessions and ownership')

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for user,width in ((client,390),(coach,1365)):
  context=browser.new_context(viewport={'width':width,'height':900})
  # Block all paid/external services and media; local app + actual local API only.
  context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
  page=context.new_page(); errors=[]

  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(WEB+'/auth/login')
  page.get_by_placeholder('usuario@email.com').fill(user['email'])
  page.get_by_placeholder('••••••••').fill(password)
  page.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  page.wait_for_url(re.compile('/'+user['role']+'/dashboard'))
  if user is client:
   page.wait_for_load_state('networkidle')
   page.goto(WEB+'/cliente/crear-rutina')

   page.get_by_placeholder(re.compile('NOMBRE DE TU RUTINA',re.I)).fill('Creada desde navegador')
   page.get_by_text('Sentadilla beta local',exact=True).click()
   page.get_by_label('Peso en kg de Sentadilla beta local').fill('35,5')
   with page.expect_response(lambda r:'/api/rutinas/manual' in r.url and r.request.method=='POST') as response:
    page.get_by_role('button',name='GUARDAR',exact=True).click()
   assert response.value.status==200
   created=response.value.json()
   assert created['detalles'][0]['peso']==35.5
   page.wait_for_url(re.compile('/cliente/rutinas$'))
   page.wait_for_load_state('networkidle')
   page.goto(WEB+'/cliente/editar-rutina/'+created['id'])
   page.get_by_label('Peso de la serie 2 de Sentadilla beta local').fill('37,5')
   assert page.get_by_label('Peso de la serie 1 de Sentadilla beta local').input_value()=='37,5'
   with page.expect_response(lambda r:'/api/rutinas/'+created['id'] in r.url and r.request.method=='PUT') as response:
    page.get_by_role('button',name='GUARDAR',exact=True).click()
   assert response.value.status==200
   page.wait_for_url(re.compile('/cliente/dashboard$'))
   page.wait_for_load_state('networkidle')
   page.goto(WEB+'/cliente/sesion/'+created['id'])
   assert page.get_by_label('Peso de la serie 1 de Sentadilla beta local').input_value()=='37.5'
   page.get_by_text('TERMINAR',exact=True).click()
   with page.expect_response(lambda r:r.url.endswith('/api/sesiones') and r.request.method=='POST') as response:
    page.get_by_role('button',name='GUARDAR',exact=True).click()
   assert response.value.status==200
   page.wait_for_url(re.compile('/cliente/dashboard$'))
   page.wait_for_load_state('networkidle')
   page.goto(WEB+'/cliente/calendario')
  else:
   page.wait_for_load_state('networkidle')
   page.goto(WEB+f"/entrenador/cliente/{client['id']}/rutinas")
   page.get_by_text('Plan beta local',exact=True).wait_for()
   page.wait_for_load_state('networkidle')
   page.goto(WEB+f"/entrenador/cliente/{client['id']}/calendario")
  if user is coach:
   # Calendar events were scheduled by this trainer; inspect the earlier one.
   page.locator('span:visible').filter(has_text='Plan beta local').first.click()
   dialog=page.get_by_role('dialog',name='Resumen de la sesión')
   dialog.wait_for()
   dialog.get_by_text(re.compile('Primera sesión beta')).wait_for()
   assert dialog.get_by_text('30.5 kg',exact=True).count()==1
   assert dialog.get_by_text(re.compile('Segunda sesión beta')).count()==0
   page.get_by_role('button',name='Cerrar resumen').click()
  assert not errors,errors
  # Finish the initial authenticated load before testing a deliberate reload.
  page.get_by_text('Plan beta local',exact=True).first.wait_for(state='attached')
  page.wait_for_load_state('networkidle')
  page.reload()
  page.get_by_text('Plan beta local',exact=True).first.wait_for(state='attached')
  print('PASS built browser:',user['role'],width,'login/cookie refresh + manual routine/workout' if user is client else 'assigned client/calendar + exact event results')
  context.close()
 # Two independent browser sessions exercise the actual SockJS/STOMP transport.
 chat_contexts=[]
 chat_pages=[]
 for user,width,contact in ((client,390,'Entrenador Beta'),(coach,1365,'Atleta Beta')):
  context=browser.new_context(viewport={'width':width,'height':900})
  chat_contexts.append(context)
  context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
  page=context.new_page()
  page.goto(WEB+'/auth/login')
  page.get_by_placeholder('usuario@email.com').fill(user['email'])
  page.get_by_placeholder('••••••••').fill(password)
  page.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  page.wait_for_url(re.compile('/'+user['role']+'/dashboard'))
  page.wait_for_load_state('networkidle')
  page.goto(WEB+'/'+user['role']+'/chat')
  page.get_by_text(contact,exact=True).click()
  expect(page.get_by_placeholder('Escribe un mensaje...')).to_be_enabled()
  chat_pages.append(page)
 athlete_chat,coach_chat=chat_pages
 def send(page,text):
  page.get_by_placeholder('Escribe un mensaje...').fill(text)
  expect(page.get_by_role('button',name='Enviar mensaje',exact=True)).to_be_enabled()
  page.get_by_role('button',name='Enviar mensaje',exact=True).click()
 send(athlete_chat,'Mensaje beta de atleta')
 coach_chat.get_by_text('Mensaje beta de atleta',exact=True).wait_for()
 send(coach_chat,'Respuesta beta del entrenador')
 athlete_chat.get_by_text('Respuesta beta del entrenador',exact=True).wait_for()
 coach_chat.get_by_role('button',name='Denunciar mensaje',exact=True).click()
 report=coach_chat.get_by_role('dialog',name='Denunciar mensaje')
 report.get_by_label('Motivo').select_option('SPAM')
 with coach_chat.expect_response(lambda r:'/reports' in r.url and r.request.method=='POST') as response:
  report.get_by_role('button',name='Enviar denuncia',exact=True).click()
 assert response.value.status==202
 coach_chat.get_by_text(re.compile('Denuncia registrada')).wait_for()
 athlete_chat.get_by_role('button',name='Bloquear chat',exact=True).click()
 with athlete_chat.expect_response(lambda r:'/api/chat/blocks/' in r.url and r.request.method=='PUT') as response:
  athlete_chat.get_by_role('dialog',name='Bloquear chat').get_by_role('button',name='Confirmar',exact=True).click()
 assert response.value.status==200
 expect(athlete_chat.get_by_placeholder('Escribe un mensaje...')).to_be_disabled()
 safety=call('GET',f"/api/chat/safety/{client['id']}",token=coach['token'])
 assert not safety['canSend']
 athlete_chat.get_by_role('button',name='Desbloquear',exact=True).click()
 with athlete_chat.expect_response(lambda r:'/api/chat/blocks/' in r.url and r.request.method=='DELETE') as response:
  athlete_chat.get_by_role('dialog',name='Desbloquear chat').get_by_role('button',name='Confirmar',exact=True).click()
 assert response.value.status==200
 send(athlete_chat,'Mensaje beta tras desbloquear')
 coach_chat.get_by_text('Mensaje beta tras desbloquear',exact=True).wait_for()
 # Reload after all messages settle to verify stored history as well as delivery.
 coach_chat.reload()
 coach_chat.get_by_text('Atleta Beta',exact=True).click()
 coach_chat.get_by_text('Mensaje beta de atleta',exact=True).wait_for()
 coach_chat.get_by_text('Respuesta beta del entrenador',exact=True).wait_for()
 coach_chat.get_by_text('Mensaje beta tras desbloquear',exact=True).wait_for()
 print('PASS real browser chat: two sessions, delivery, report, block, unblock and persisted history')
 for context in chat_contexts: context.close()
 browser.close()
