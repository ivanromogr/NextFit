"""Isolated local HTTP + real browser check. Never accepts remote URLs."""
import json, re, secrets, struct, zlib, sys, traceback
from html import unescape
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit, parse_qs, urlencode
from pathlib import Path
import tempfile
from datetime import date as calendar_date, timedelta
from playwright.sync_api import sync_playwright, expect
API='http://127.0.0.1:18080'
WEB='http://127.0.0.1:4181'
assert (Path(tempfile.gettempdir())/'nextfit-beta-local'/'ready').read_text()=='isolated-h2-fixture'
# Valid synthetic tokens stay in memory and are redacted from failure traces.
fixture_secrets=[]
def redact_exception(kind,error,trace):
 text=''.join(traceback.format_exception(kind,error,trace))
 for secret in fixture_secrets:
  if secret: text=text.replace(secret,'[fixture-redacted]')
 sys.stderr.write(text)
sys.excepthook=redact_exception

def captured_link(address,path):
 assert address.endswith('@example.invalid')
 with urlopen('http://127.0.0.1:18081/next?'+urlencode({'to':address}),timeout=10) as response:
  assert response.headers.get('Cache-Control')=='no-store'
  message=json.load(response)
 assert message['to']==address
 match=re.search(r'href="([^"]+)"',message['html'])
 assert match, 'The actual notifier did not produce a link'
 link=unescape(match.group(1)); parsed=urlsplit(link)
 assert parsed.scheme+'://'+parsed.netloc==WEB and parsed.path==path
 token=parse_qs(parsed.query).get('token',[''])[0]
 assert token, 'The actual notifier link has no token'
 fixture_secrets.append(token)
 return link,token


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
 return {'email':email,'id':result['user']['id'],'token':result['accessToken'],'refreshToken':result.get('refreshToken'),'role':role}
client=account('cliente','Atleta')
other=account('cliente','Otro')
coach=account('entrenador','Entrenador')
call('POST',f"/api/entrenador/{coach['id']}/fichar",{'email':'  '+client['email'].upper()+'  '},coach['token'])
exercise=call('GET','/api/ejercicios',token=client['token'])[0]['id']
routine=call('POST','/api/rutinas/manual',{'nombre':'Plan beta local','idCliente':client['id'],'creador':'ENTRENADOR','entrenadorId':coach['id'],'ejercicios':[{'idEjercicio':exercise,'series':2,'repeticiones':10,'peso':30.5,'rpe':8}]},coach['token'])['id']
template=call('POST','/api/rutinas/manual',{'nombre':'Plantilla beta local','esPlantilla':True,'creador':'ENTRENADOR','entrenadorId':coach['id'],'ejercicios':[{'idEjercicio':exercise,'series':2,'repeticiones':10,'peso':30.5,'rpe':8}]},coach['token'])['id']
for private_path in (f"/api/rutinas/plantillas/{coach['id']}",f"/api/entrenador/{coach['id']}/clientes",f"/api/entrenador/{coach['id']}/dashboard-resumen"):
 call('GET',private_path,token=other['token'],expected=403)
 call('GET',private_path,expected=401)
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
stats_paths=[f"/api/stats/global/{client['id']}",f"/api/stats/prs/{client['id']}",
             f"/api/stats/ejercicios/{client['id']}",f"/api/stats/ejercicio/{client['id']}/{exercise}"]
assert call('GET',stats_paths[0],token=client['token'])['totalEntrenos']==2
assert call('GET',stats_paths[0]+f"?entrenadorId={coach['id']}",token=coach['token'])['totalEntrenos']==2
assert call('GET',stats_paths[3],token=client['token'])['pr']==50.5
for path in stats_paths: call('GET',path,token=other['token'],expected=403)
call('GET',stats_paths[0],expected=401)
print('PASS real HTTP statistics: saved-session totals and personal record; unrelated/anonymous access denied')

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
  page.wait_for_load_state('networkidle')
  expected_stats=call('GET',stats_paths[0]+(f"?entrenadorId={coach['id']}" if user is coach else ''),token=user['token'])
  assert expected_stats['totalEntrenos']==(3 if user is client else 2)
  stats_failures={'global':1,'prs':1,'ejercicios':1,'ejercicio':1}
  def fail_first_stats(route,_request,failures=stats_failures):
   kind=urlsplit(route.request.url).path.split('/')[3]
   if failures.get(kind,0):
    failures[kind]-=1
    route.fulfill(status=503,json={'message':'Local beta injected progress failure'})
   else: route.continue_()
  context.route(API+'/api/stats/**',fail_first_stats)
  progress_path='/cliente/progreso' if user is client else f"/entrenador/cliente/{client['id']}/progreso"
  page.goto(WEB+progress_path)
  page.get_by_role('button',name='Reintentar estadísticas',exact=True).wait_for()
  expect(page.get_by_text('Entrenos',exact=True)).to_have_count(0)
  page.get_by_role('button',name='Reintentar estadísticas',exact=True).click()
  expect(page.get_by_text('Entrenos',exact=True).locator('..')).to_contain_text(str(expected_stats['totalEntrenos']))
  expected_volume=str(expected_stats['volumenTotal']).removesuffix('t')
  expect(page.get_by_text('Volumen Total',exact=True).locator('..').locator(':scope > div').nth(2)).to_have_text(re.compile(re.escape(expected_volume)+r'\s*t'))
  page.get_by_role('button',name='Reintentar récords',exact=True).click()
  page.get_by_text('Salón de la Fama',exact=True).wait_for()
  page.get_by_role('button',name='Reintentar ejercicios',exact=True).click()
  expect(page.get_by_role('combobox',name='Ejercicio del progreso')).to_have_value(exercise)
  page.get_by_role('button',name='Reintentar gráfica',exact=True).click()
  page.get_by_text(re.compile(r'PR:\s*50\.5kg')).wait_for()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Progress overflows the viewport'
  if user is coach:
   for api_path,screen_path,retry_label,empty_label,expected_name in (
     (f"/api/entrenador/{coach['id']}/clientes",'/entrenador/atletas','Reintentar atletas','Tu equipo está vacío','Atleta Beta'),
     (f"/api/rutinas/plantillas/{coach['id']}",'/entrenador/plantillas','Reintentar plantillas','Tu biblioteca está vacía','Plantilla beta local')):
    failures_left=[1]
    def fail_first_list(route,_request,left=failures_left):
     if left[0]:
      left[0]-=1
      route.fulfill(status=503,json={'message':'Local beta injected coach list failure'})
     else: route.continue_()
    context.route(API+api_path,fail_first_list)
    page.wait_for_load_state('networkidle')
    page.goto(WEB+screen_path)
    retry=page.get_by_role('button',name=retry_label,exact=True)
    retry.wait_for()
    expect(page.get_by_text(empty_label,exact=True)).to_have_count(0)
    retry.click()
    page.get_by_text(expected_name,exact=True).wait_for()
    expect(page.get_by_role('alert')).to_have_count(0)
   print('PASS coach lists: two controlled 503 failures, actual API retries, athletes/template recovered; unrelated/anonymous access denied')
   summary_path=f"/api/entrenador/{coach['id']}/dashboard-resumen"
   expected_dashboard=call('GET',summary_path,token=coach['token'])
   dashboard_failures={summary_path:1,f"/api/entrenador/{coach['id']}/clientes":1}
   def fail_dashboard(route,_request):
    path=urlsplit(route.request.url).path
    if dashboard_failures.get(path,0):
     dashboard_failures[path]-=1
     route.fulfill(status=503,json={'message':'Local beta injected dashboard failure'})
    else: route.continue_()
   context.route(API+summary_path,fail_dashboard)
   context.route(API+f"/api/entrenador/{coach['id']}/clientes",fail_dashboard)
   page.wait_for_load_state('networkidle')
   page.goto(WEB+'/entrenador/dashboard')
   page.get_by_role('button',name='Reintentar panel',exact=True).wait_for()
   expect(page.get_by_text('Entrenan Hoy',exact=True)).to_have_count(0)
   expect(page.get_by_text('No tienes atletas vinculados.',exact=True)).to_have_count(0)
   expect(page.get_by_text('No hay actividad reciente en tu equipo.',exact=True)).to_have_count(0)
   page.get_by_role('button',name='Reintentar panel',exact=True).click()
   page.get_by_role('heading',name='Atleta Beta',exact=True).wait_for()
   for label,field in (('En Riesgo','riesgo'),('Entrenan Hoy','hoy'),('Entrenos Semanales','records')):
    expect(page.get_by_text(label,exact=True).locator('..').locator(':scope > div').nth(1)).to_have_text(str(expected_dashboard['stats'][field]))
   expect(page.get_by_role('alert')).to_have_count(0)
   dashboard_failures[summary_path]=1
   with page.expect_response(lambda response: summary_path in response.url and response.status==503):
    page.evaluate("window.dispatchEvent(new Event('focus'))")
   expect(page.get_by_role('alert')).to_contain_text('últimos datos recibidos')
   expect(page.get_by_text('Entrenan Hoy',exact=True)).to_have_count(1)
   with page.expect_response(lambda response: summary_path in response.url and response.status==200):
    page.evaluate("window.dispatchEvent(new Event('focus'))")
   expect(page.get_by_role('alert')).to_have_count(0)
   print('PASS coach dashboard: partial failures recovered, totals match actual API, failed refresh retains labeled stale data and focus recovers')

  print('PASS built browser statistics:',user['role'],width,'four injected failures recovered; totals match real API and personal record is 50.5 kg')
  print('PASS built browser:',user['role'],width,'login/cookie refresh + manual routine/workout' if user is client else 'assigned client/calendar + exact event results')
  context.close()
 # Two independent browser sessions exercise the actual SockJS/STOMP transport.
 chat_contexts=[]
 chat_pages=[]
 chat_sockets=[]
 for user,width,contact in ((client,390,'Entrenador Beta'),(coach,1365,'Atleta Beta')):
  context=browser.new_context(viewport={'width':width,'height':900})
  chat_contexts.append(context)
  sockets=[]
  chat_sockets.append(sockets)
  def connect_chat_socket(socket,routes=sockets):
   socket.connect_to_server()
   routes.append(socket)
  context.route_web_socket(re.compile(r'^ws://127\.0\.0\.1:18080/ws/'),connect_chat_socket)
  context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
  page=context.new_page()
  page.goto(WEB+'/auth/login')
  page.get_by_placeholder('usuario@email.com').fill(user['email'])
  page.get_by_placeholder('••••••••').fill(password)
  page.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  page.wait_for_url(re.compile('/'+user['role']+'/dashboard'))
  page.wait_for_load_state('networkidle')
  contact_source=f"/api/clientes/{user['id']}" if user is client else f"/api/entrenador/{user['id']}/clientes"
  contact_failures={'remaining':1}
  def fail_first_contact_source(route,_request,failures=contact_failures):
   if failures['remaining']:
    failures['remaining']-=1
    route.fulfill(status=503,json={'message':'Local beta injected contact source failure'})
   else: route.continue_()
  context.route(API+contact_source,fail_first_contact_source)
  page.goto(WEB+'/'+user['role']+'/chat')
  page.get_by_text(contact,exact=True).click()
  expect(page.get_by_placeholder('Escribe un mensaje...')).to_be_enabled()
  expect(page.get_by_role('alert')).to_contain_text('No se pudieron cargar todas las conversaciones')
  page.get_by_placeholder('Escribe un mensaje...').fill('Borrador durante recuperación de contactos')
  with page.expect_response(lambda r:r.url==API+contact_source and r.request.method=='GET') as recovered_contacts:
   page.get_by_role('button',name='Reintentar conversaciones',exact=True).click()
  assert recovered_contacts.value.status==200
  expect(page.get_by_role('alert')).to_have_count(0)
  expect(page.get_by_placeholder('Escribe un mensaje...')).to_have_value('Borrador durante recuperación de contactos')
  page.get_by_placeholder('Escribe un mensaje...').fill('')
  print('PASS contact recovery:',user['role'],'partial source failure, available conversation, actual retry and retained draft')
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
 history_path=f"/api/chat/historial?otroUsuarioId={coach['id']}"
 history=call('GET',history_path,token=client['token'])
 message=next(item for item in history if item['contenido']=='Mensaje beta de atleta')
 call('GET',history_path,token=other['token'],expected=403)
 call('GET',f"/api/chat/historial?usuario1={client['id']}&usuario2={coach['id']}",token=other['token'],expected=403)
 for user in (client,other):
  call('POST',f"/api/chat/messages/{message['id']}/reports",{'reason':'SPAM'},user['token'],expected=403)
 call('PUT',f"/api/chat/blocks/{coach['id']}",token=other['token'],expected=403)
 call('GET','/api/moderation/reports',token=coach['token'],expected=403)
 print('PASS real HTTP chat isolation: unrelated history/report/block and non-operator moderation denied')
 # The peer still has its earlier allowed state: the server must reject its send.
 coach_chat.get_by_placeholder('Escribe un mensaje...').fill('Mensaje rechazado por bloqueo')
 expect(coach_chat.get_by_role('button',name='Enviar mensaje',exact=True)).to_be_enabled()
 athlete_chat.get_by_role('button',name='Bloquear chat',exact=True).click()
 with athlete_chat.expect_response(lambda r:'/api/chat/blocks/' in r.url and r.request.method=='PUT') as response:
  athlete_chat.get_by_role('dialog',name='Bloquear chat').get_by_role('button',name='Confirmar',exact=True).click()
 assert response.value.status==200
 expect(athlete_chat.get_by_placeholder('Escribe un mensaje...')).to_be_disabled()
 safety=call('GET',f"/api/chat/safety/{client['id']}",token=coach['token'])
 assert not safety['canSend']
 coach_chat.get_by_role('button',name='Enviar mensaje',exact=True).click()
 coach_chat.get_by_role('alert').filter(has_text='No se pueden enviar mensajes').wait_for()
 expect(coach_chat.get_by_placeholder('Escribe un mensaje...')).to_be_disabled()
 expect(coach_chat.get_by_placeholder('Escribe un mensaje...')).to_have_value('Mensaje rechazado por bloqueo')
 blocked_history=call('GET',history_path,token=client['token'])
 assert len(blocked_history)==len(history)
 assert all(item['contenido']!='Mensaje rechazado por bloqueo' for item in blocked_history)
 expect(athlete_chat.get_by_text('Mensaje rechazado por bloqueo',exact=True)).to_have_count(0)
 athlete_chat.get_by_role('button',name='Desbloquear',exact=True).click()
 with athlete_chat.expect_response(lambda r:'/api/chat/blocks/' in r.url and r.request.method=='DELETE') as response:
  athlete_chat.get_by_role('dialog',name='Desbloquear chat').get_by_role('button',name='Confirmar',exact=True).click()
 assert response.value.status==200
 send(athlete_chat,'Mensaje beta tras desbloquear')
 coach_chat.get_by_text('Mensaje beta tras desbloquear',exact=True).wait_for()
 # Reload after all messages settle to verify stored history as well as delivery.
 history_failures={'remaining':1}
 def fail_first_history(route):
  if history_failures['remaining']:
   history_failures['remaining']-=1
   route.fulfill(status=503,json={'message':'Local beta injected history failure'})
  else: route.continue_()
 chat_contexts[1].route(API+'/api/chat/historial?*',fail_first_history)
 coach_chat.reload()
 coach_chat.get_by_text('Atleta Beta',exact=True).click()
 expect(coach_chat.get_by_role('alert')).to_contain_text('No se pudo cargar el historial')
 expect(coach_chat.get_by_text('Aún no hay mensajes.',exact=True)).to_have_count(0)
 coach_chat.get_by_role('button',name='Reintentar historial',exact=True).click()
 coach_chat.get_by_text('Mensaje beta de atleta',exact=True).wait_for()
 coach_chat.get_by_text('Respuesta beta del entrenador',exact=True).wait_for()
 coach_chat.get_by_text('Mensaje beta tras desbloquear',exact=True).wait_for()
 # A valid synthetic PNG exercises the real multipart endpoint and private media.
 def png_chunk(kind,data):
  return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
 image=(b'\x89PNG\r\n\x1a\n'
        +png_chunk(b'IHDR',struct.pack('!IIBBBBB',1,1,8,6,0,0,0))
        +png_chunk(b'IDAT',zlib.compress(b'\0\xff\0\0\xff'))+png_chunk(b'IEND',b''))
 athlete_chat.locator('input[type=file]').set_input_files({'name':'invalid.png','mimeType':'image/png','buffer':b'not a PNG'})
 athlete_chat.get_by_placeholder('Añade un comentario...').fill('Imagen privada beta')
 with athlete_chat.expect_response(lambda r:r.url.endswith('/api/upload') and r.request.method=='POST') as rejected_upload:
  athlete_chat.get_by_role('button',name='Enviar mensaje',exact=True).click()
 assert rejected_upload.value.status==400
 assert rejected_upload.value.json()['code']=='UNSUPPORTED_FILE_TYPE'
 expect(athlete_chat.get_by_role('alert')).to_contain_text('Formato no admitido')
 expect(athlete_chat.get_by_placeholder('Añade un comentario...')).to_have_value('Imagen privada beta')
 expect(athlete_chat.get_by_text('invalid.png',exact=True)).to_be_visible()
 assert not any(item['contenido']=='Imagen privada beta' for item in call('GET',history_path,token=client['token']))
 image_failures={'remaining':1}
 def fail_first_image(route):
  if image_failures['remaining']:
   image_failures['remaining']-=1
   route.fulfill(status=503,json={'message':'Local beta injected image failure'})
  else: route.continue_()
 chat_contexts[1].route(API+'/api/upload/files/*',fail_first_image)
 athlete_chat.locator('input[type=file]').set_input_files({'name':'beta-private.png','mimeType':'image/png','buffer':image})
 with athlete_chat.expect_response(lambda r:r.url.endswith('/api/upload') and r.request.method=='POST') as uploaded:
  athlete_chat.get_by_role('button',name='Enviar mensaje',exact=True).click()
 assert uploaded.value.status==200
 metadata=uploaded.value.json()
 assert metadata['visibility']=='PRIVATE' and metadata['purpose']=='CHAT_ATTACHMENT'
 file_path=f"/api/upload/files/{metadata['id']}"
 coach_chat.get_by_text('Imagen privada beta',exact=True).wait_for()
 expect(coach_chat.get_by_role('alert')).to_contain_text('No se pudo cargar la imagen')
 coach_chat.get_by_role('button',name='Volver a cargar imagen',exact=True).click()
 expect(coach_chat.get_by_alt_text('Adjunto',exact=True)).to_be_visible()
 coach_chat.wait_for_function("() => [...document.querySelectorAll('img[alt=Adjunto]')].some(img => img.complete && img.naturalWidth > 0)")
 for user in (client,coach):
  request=Request(API+file_path,headers={'Authorization':'Bearer '+user['token']})
  with urlopen(request,timeout=20) as downloaded:
   assert downloaded.status==200 and downloaded.read()==image
   assert downloaded.headers.get('Content-Type').startswith('image/png')
   assert 'no-store' in downloaded.headers.get('Cache-Control','')
   assert downloaded.headers.get('X-Content-Type-Options')=='nosniff'
 call('GET',file_path,token=other['token'],expected=403)
 call('GET',file_path,expected=403)
 print('PASS injected failure recovery: history/image first requests return 503; explicit retries recover actual API data')
 print('PASS private attachment: invalid file rejected with draft retained, valid retry, decoded image, exact downloads, unrelated/anonymous access denied')
 # Close only this browser's live sockets; the server and trainer remain online.
 expect(athlete_chat.get_by_placeholder('Escribe un mensaje...')).to_have_value('')
 athlete_chat.get_by_placeholder('Escribe un mensaje...').fill('Borrador durante reconexión')
 assert chat_sockets[0], 'Expected an actual browser WebSocket connection'
 for socket in list(chat_sockets[0]): socket.close(code=1001,reason='Local beta disconnection check')
 athlete_chat.get_by_text('Reconectando…',exact=True).wait_for()
 send(coach_chat,'Mensaje durante el corte')
 coach_chat.get_by_text('Mensaje durante el corte',exact=True).wait_for()
 athlete_chat.get_by_text('Mensaje durante el corte',exact=True).wait_for()
 expect(athlete_chat.get_by_placeholder('Escribe un mensaje...')).to_have_value('Borrador durante reconexión')
 assert not any(item['contenido']=='Borrador durante reconexión' for item in call('GET',history_path,token=client['token']))
 send(athlete_chat,'Borrador durante reconexión')
 coach_chat.get_by_text('Borrador durante reconexión',exact=True).wait_for()
 expect(athlete_chat.get_by_placeholder('Escribe un mensaje...')).to_have_value('')
 print('PASS real WebSocket reconnection: missed message recovered, draft retained, no automatic resend and explicit confirmed retry')
 print('PASS real browser chat: bidirectional delivery, report, peer send rejected without persistence, unblock and stored history')
 for user,context,page in zip((client,coach),chat_contexts,chat_pages):
  profile_path=f"/api/{'clientes' if user is client else 'entrenador'}/{user['id']}"
  profile_failures={'load':True,'save':1}
  def fail_profile(route,_request,failures=profile_failures):
   if route.request.method=='GET' and failures['load']:
    route.fulfill(status=503,json={'message':'Local beta injected profile load failure'})
   elif route.request.method=='PUT' and failures['save']:
    failures['save']-=1
    route.fulfill(status=503,json={'message':'Local beta injected profile save failure'})
   else: route.continue_()
  context.route(API+profile_path,fail_profile)
  page.wait_for_load_state('networkidle')
  page.goto(WEB+'/'+user['role']+'/perfil')
  page.get_by_role('button',name='Reintentar perfil',exact=True).wait_for()
  save_pattern=re.compile('^GUARDAR$' if user is client else '^Guardar cambios$',re.I)
  expect(page.get_by_role('button',name=save_pattern)).to_have_count(0)
  profile_failures['load']=False
  page.get_by_role('button',name='Reintentar perfil',exact=True).click()
  name_field=page.get_by_placeholder('Tu nombre',exact=True)
  expect(name_field).to_have_value('Atleta' if user is client else 'Entrenador')
  name_field.fill('Perfil beta editado')
  with page.expect_response(lambda response: profile_path in response.url and response.request.method=='PUT' and response.status==503):
   page.get_by_role('button',name=save_pattern).click()
  expect(name_field).to_have_value('Perfil beta editado')
  expect(page.get_by_role('button',name=save_pattern)).to_be_enabled()
  with page.expect_response(lambda response: profile_path in response.url and response.request.method=='PUT' and response.status==200) as saved:
   page.get_by_role('button',name=save_pattern).click()
  submitted=saved.value.request.post_data_json
  assert submitted['nombre']=='Perfil beta editado'
  assert not any(key in submitted for key in ('email','password','contrasena'))
  verified=call('GET',profile_path,token=user['token'])
  if user is coach: verified=verified.get('entrenador',verified)
  assert verified['nombre']=='Perfil beta editado'
  assert verified['email']==user['email']
  page.wait_for_url(re.compile('/'+user['role']+'/dashboard$'))
  page.wait_for_load_state('networkidle')
  print('PASS profile recovery:',user['role'],'failed load blocks editing; actual retry; save failure retains edits; actual save persists name without changing email')
 coach_context=chat_contexts[1]
 coach_page=chat_pages[1]
 onboarding_path='/api/entrenador/onboarding'
 onboarding_failures=[1]
 def fail_onboarding(route,_request):
  if onboarding_failures[0]:
   onboarding_failures[0]-=1
   route.fulfill(status=503,json={'message':'Local beta injected onboarding failure'})
  else: route.continue_()
 coach_context.route(API+onboarding_path,fail_onboarding)
 coach_page.goto(WEB+'/entrenador/onboarding')
 coach_page.get_by_role('button',name='Hombre',exact=True).click()
 coach_page.get_by_role('button',name='Selecciona una fecha',exact=True).click()
 coach_page.get_by_role('combobox',name='Seleccionar año').select_option('1990')
 coach_page.get_by_role('combobox',name='Seleccionar mes').select_option('4')
 coach_page.locator('.react-datepicker__day--015:not(.react-datepicker__day--outside-month)').click()
 coach_page.get_by_role('button',name=re.compile('SIGUIENTE',re.I)).click()
 coach_page.get_by_role('button',name='Musculación',exact=True).click()
 coach_page.get_by_role('button',name=re.compile('SIGUIENTE',re.I)).click()
 experience=coach_page.get_by_placeholder('Ej: 5')
 experience.fill('6.5')
 coach_page.get_by_role('button',name='Presencial',exact=True).click()
 expect(coach_page.get_by_role('button',name=re.compile('SIGUIENTE',re.I))).to_be_disabled()
 experience.fill('6')
 coach_page.get_by_role('button',name=re.compile('SIGUIENTE',re.I)).click()
 coach_page.get_by_role('combobox').select_option('Grado en CAFD / INEF')
 biography=coach_page.get_by_placeholder(re.compile('Hola, soy especialista en'))
 biography.fill('Biografía beta local conservada después de un fallo.')
 coach_page.get_by_role('button',name=re.compile('FINALIZAR ALTA',re.I)).click()
 coach_page.get_by_role('alert').wait_for()
 expect(biography).to_have_value('Biografía beta local conservada después de un fallo.')
 with coach_page.expect_response(lambda response: onboarding_path in response.url and response.request.method=='POST') as onboarding_saved:
  coach_page.get_by_role('button',name=re.compile('FINALIZAR ALTA',re.I)).click()
 assert onboarding_saved.value.status==200
 assert onboarding_saved.value.request.post_data_json['idEntrenador']==coach['id']
 assert onboarding_saved.value.request.post_data_json['aniosExperiencia']==6
 coach_page.wait_for_url(re.compile('/entrenador/dashboard$'))
 persisted=call('GET',f"/api/entrenador/{coach['id']}",token=coach['token'])
 persisted=persisted.get('entrenador',persisted)
 assert persisted['aniosExperiencia']==6
 assert persisted['descripcionPerfil']=='Biografía beta local conservada después de un fallo.'
 print('PASS trainer onboarding: fractional experience blocked, failed save retains biography, real retry persists experience and biography for authenticated coach')
 for user,context,page in zip((client,coach),chat_contexts,chat_pages):
  owned_sessions=call('GET','/api/auth/sessions',token=user['token'])
  mobile_sessions=[item for item in owned_sessions if item['clientType']=='MOBILE']
  assert len(mobile_sessions)==1 and isinstance(user['refreshToken'],str)
  family=mobile_sessions[0]['familyId']
  call('DELETE','/api/auth/sessions/'+family,token=other['token'],expected=404)
  call('DELETE','/api/auth/sessions/'+family,expected=401)
  failures={'load':1,'revoke':1}
  def fail_sessions(route,_request,left=failures):
   kind='load' if route.request.method=='GET' else 'revoke' if route.request.method=='DELETE' else None
   if left.get(kind,0):
    left[kind]-=1
    route.fulfill(status=503,json={'message':'Local beta injected session failure'})
   else: route.continue_()
  context.route(API+'/api/auth/sessions',fail_sessions)
  context.route(API+'/api/auth/sessions/'+family,fail_sessions)
  page.wait_for_load_state('networkidle')
  page.goto(WEB+'/'+user['role']+'/seguridad/sesiones')
  page.get_by_role('button',name='Reintentar sesiones',exact=True).wait_for()
  expect(page.get_by_text('No hay sesiones activas.',exact=True)).to_have_count(0)
  page.get_by_role('button',name='Reintentar sesiones',exact=True).click()
  mobile_row=page.get_by_role('listitem').filter(has=page.get_by_text('Móvil',exact=True))
  mobile_row.wait_for()
  assert family not in page.locator('body').inner_text()
  mobile_row.get_by_role('button',name='Cerrar sesión',exact=True).click()
  expect(page.get_by_role('alert')).to_contain_text('No se pudo cerrar esa sesión')
  expect(mobile_row).to_have_count(1)
  mobile_row.get_by_role('button',name='Cerrar sesión',exact=True).click()
  expect(page.get_by_text('Móvil',exact=True)).to_have_count(0)
  assert all(item['familyId']!=family for item in call('GET','/api/auth/sessions',token=user['token']))
  call('POST','/api/auth/refresh',{'refreshToken':user['refreshToken']},expected=401)
  another_device=call('POST','/api/auth/login',{'email':user['email'],'password':password})
  page.once('dialog',lambda dialog:dialog.accept())
  page.get_by_role('button',name='Cerrar todas las sesiones',exact=True).click()
  page.wait_for_url(re.compile('/auth/login$'))
  assert not any(cookie['name']=='nextfit_refresh' for cookie in context.cookies())
  call('POST','/api/auth/refresh',{'refreshToken':another_device['refreshToken']},expected=401)
  rejected=context.request.post(API+'/api/auth/refresh',headers={'X-Client-Type':'WEB','Origin':WEB})
  assert rejected.status==401
  print('PASS session management:',user['role'],'load/revoke failures recovered; private IDs hidden; foreign revocation denied; revoked mobile and global refresh rejected; web cookie removed')
 email_context=chat_contexts[0]
 email_page=chat_pages[0]
 email_page.get_by_placeholder('usuario@email.com').fill(client['email'])
 email_page.get_by_placeholder('••••••••').fill(password)
 email_page.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
 email_page.wait_for_url(re.compile('/cliente/dashboard$'))
 email_page.wait_for_load_state('networkidle')
 email_failures={'request':1,'confirm':1}
 def fail_email(route,_request):
  kind='confirm' if urlsplit(route.request.url).path.endswith('/confirm') else 'request'
  if email_failures[kind]:
   email_failures[kind]-=1
   route.fulfill(status=503,json={'message':'Local beta injected email change failure'})
  else: route.continue_()
 email_context.route(API+'/api/auth/email',fail_email)
 email_context.route(API+'/api/auth/email/confirm',fail_email)
 email_page.goto(WEB+'/cliente/seguridad/email')
 email_page.get_by_label('Nuevo correo electrónico',exact=True).fill('unassigned-'+suffix+'@example.invalid')
 email_page.get_by_label('Contraseña actual',exact=True).fill('wrong-fixture-password')
 email_page.get_by_role('button',name='Cambiar correo',exact=True).click()
 expect(email_page.get_by_role('status')).to_contain_text('No se pudo cambiar el correo')
 expect(email_page.get_by_label('Contraseña actual',exact=True)).to_have_value('wrong-fixture-password')
 email_page.get_by_role('button',name='Cambiar correo',exact=True).click()
 expect(email_page.get_by_role('status')).to_contain_text('Contraseña actual incorrecta')
 email_page.get_by_label('Contraseña actual',exact=True).fill(password)
 email_page.get_by_label('Nuevo correo electrónico',exact=True).fill(coach['email'])
 email_page.get_by_role('button',name='Cambiar correo',exact=True).click()
 expect(email_page.get_by_role('status')).to_contain_text('Ese correo ya está asociado a otra cuenta')
 assert call('GET',f"/api/clientes/{client['id']}",token=client['token'])['email']==client['email']
 email_page.goto(WEB+'/confirm-email-change?token=local-invalid-email-first')
 email_page.get_by_role('button',name='Reintentar confirmación',exact=True).wait_for()
 with email_page.expect_response(lambda response: response.url.endswith('/api/auth/email/confirm')) as invalid_email:
  email_page.get_by_role('button',name='Reintentar confirmación',exact=True).click()
 assert invalid_email.value.status==400
 expect(email_page.get_by_role('alert')).to_contain_text('no es válido o ha caducado')
 expect(email_page.get_by_role('button',name='Reintentar confirmación',exact=True)).to_have_count(0)
 assert call('GET',f"/api/clientes/{client['id']}",token=client['token'])['email']==client['email']
 print('PASS email change rejection: controlled failures retain draft/retry; real wrong-password and occupied-email errors; invalid confirmation rejected without changing email. No delivery or valid-link confirmation is asserted.')
 for context in chat_contexts: context.close()
 recovery_context=browser.new_context(viewport={'width':390,'height':844})
 recovery_context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
 recovery_page=recovery_context.new_page()
 recovery_failures={'forgot':1,'reset':1}
 def fail_recovery(route,_request):
  kind=urlsplit(route.request.url).path.rsplit('/',1)[-1]
  if recovery_failures.get(kind,0):
   recovery_failures[kind]-=1
   route.fulfill(status=503,json={'message':'Local beta injected recovery failure'})
  else: route.continue_()
 recovery_context.route(API+'/api/auth/password/*',fail_recovery)
 recovery_page.goto(WEB+'/forgot-password')
 missing_email='missing-reset-'+suffix+'@example.invalid'
 recovery_page.get_by_label('Correo electrónico',exact=True).fill(missing_email)
 recovery_page.get_by_role('button',name='ENVIAR INSTRUCCIONES',exact=True).click()
 recovery_page.get_by_role('alert').wait_for()
 expect(recovery_page.get_by_label('Correo electrónico',exact=True)).to_have_value(missing_email)
 with recovery_page.expect_response(lambda response: response.url.endswith('/api/auth/password/forgot')) as forgot_response:
  recovery_page.get_by_role('button',name='ENVIAR INSTRUCCIONES',exact=True).click()
 assert forgot_response.value.status==200
 expect(recovery_page.get_by_role('status')).to_contain_text('Si existe una cuenta')
 recovery_page.goto(WEB+'/reset-password?token=local-invalid-first')
 for label in ('Nueva contraseña','Confirmar contraseña'):
  recovery_page.get_by_label(label,exact=True).fill('Fictitious-reset-123!')
 recovery_page.get_by_role('button',name='RESTABLECER CONTRASEÑA',exact=True).click()
 recovery_page.get_by_role('alert').wait_for()
 expect(recovery_page.get_by_label('Nueva contraseña',exact=True)).to_have_value('Fictitious-reset-123!')
 with recovery_page.expect_response(lambda response: response.url.endswith('/api/auth/password/reset')) as invalid_response:
  recovery_page.get_by_role('button',name='RESTABLECER CONTRASEÑA',exact=True).click()
 assert invalid_response.value.status==400
 expect(recovery_page.get_by_role('alert')).to_contain_text('no es válido o ha caducado')
 recovery_page.evaluate("""() => { const url = new URL(location.href); url.searchParams.set('token','local-invalid-second'); history.pushState({...history.state,key:'recovery-next'},'',url); window.dispatchEvent(new PopStateEvent('popstate')); }""")
 expect(recovery_page.get_by_label('Nueva contraseña',exact=True)).to_have_value('')
 for label in ('Nueva contraseña','Confirmar contraseña'):
  recovery_page.get_by_label(label,exact=True).fill('Fictitious-reset-456!')
 with recovery_page.expect_response(lambda response: response.url.endswith('/api/auth/password/reset')) as second_invalid:
  recovery_page.get_by_role('button',name='RESTABLECER CONTRASEÑA',exact=True).click()
 assert second_invalid.value.status==400
 assert second_invalid.value.request.post_data_json['token']=='local-invalid-second'
 recovery_page.goto(WEB+'/reset-password')
 recovery_page.get_by_role('alert').wait_for()
 expect(recovery_page.get_by_role('button',name='RESTABLECER CONTRASEÑA',exact=True)).to_have_count(0)
 print('PASS password recovery: controlled failures retain drafts; real neutral unknown-email response; invalid reset rejected; token navigation clears passwords and submits current link; missing token blocks form. No email delivery or successful reset is asserted.')
 recovery_context.close()
 # Real issued tokens, notifier HTML and one-use semantics; delivery is captured
 # exclusively in the test JVM's memory, never via an external email provider.
 for role in ('cliente','entrenador'):
  identity=account(role,'Recovery'+role)
  flow_context=browser.new_context(viewport={'width':390 if role=='cliente' else 1365,'height':900})
  flow_context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
  flow=flow_context.new_page()
  flow.goto(WEB+'/forgot-password')
  flow.get_by_label('Correo electrónico',exact=True).fill(identity['email'])
  flow.get_by_role('button',name='ENVIAR INSTRUCCIONES',exact=True).click()
  expect(flow.get_by_role('status')).to_contain_text('Si existe una cuenta')
  _,superseded_reset=captured_link(identity['email'],'/reset-password')
  call('POST','/api/auth/password/forgot',{'email':identity['email']})
  reset_link,reset_token=captured_link(identity['email'],'/reset-password')
  new_password='Local-reset!'+secrets.token_hex(12)
  fixture_secrets.append(new_password)
  call('POST','/api/auth/password/reset',{'token':superseded_reset,'newPassword':new_password},expected=400)
  flow.goto(reset_link)
  for label in ('Nueva contraseña','Confirmar contraseña'):
   flow.get_by_label(label,exact=True).fill(new_password)
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/password/reset')) as successful_reset:
   flow.get_by_role('button',name='RESTABLECER CONTRASEÑA',exact=True).click()
  assert successful_reset.value.status==200
  expect(flow.get_by_role('status')).to_contain_text('Tu contraseña se ha restablecido')
  expect(flow.get_by_label('Nueva contraseña',exact=True)).to_have_count(0)
  call('POST','/api/auth/password/reset',{'token':reset_token,'newPassword':password},expected=400)
  call('POST','/api/auth/login',{'email':identity['email'],'password':password},expected=401)
  renewed=call('POST','/api/auth/login',{'email':identity['email'],'password':new_password})
  call('POST','/api/auth/refresh',{'refreshToken':identity['refreshToken']},expected=401)
  flow.goto(WEB+'/auth/login')
  flow.get_by_placeholder('usuario@email.com').fill(identity['email'])
  flow.get_by_placeholder('••••••••').fill(new_password)
  flow.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  flow.wait_for_url(re.compile('/'+role+'/dashboard$'))
  flow.wait_for_load_state('networkidle')
  flow.goto(WEB+'/'+role+'/seguridad/email')
  next_email='changed-'+role+'-'+suffix+'@example.invalid'
  flow.get_by_label('Nuevo correo electrónico',exact=True).fill(next_email)
  flow.get_by_label('Contraseña actual',exact=True).fill(new_password)
  flow.get_by_role('button',name='Cambiar correo',exact=True).click()
  expect(flow.get_by_role('status')).to_contain_text('enviado un enlace')
  expect(flow.get_by_label('Contraseña actual',exact=True)).to_have_value('')
  profile_path=f"/api/{'clientes' if role=='cliente' else 'entrenador'}/{identity['id']}"
  old_profile=call('GET',profile_path,token=renewed['accessToken'])
  if role=='entrenador': old_profile=old_profile.get('entrenador',old_profile)
  assert old_profile['email']==identity['email']
  confirm_link,confirm_token=captured_link(next_email,'/confirm-email-change')
  call('POST','/api/auth/password/forgot',{'email':identity['email']})
  _,pending_reset=captured_link(identity['email'],'/reset-password')
  confirmations=[]
  flow_context.on('request',lambda request,seen=confirmations: seen.append(request.url) if request.method=='POST' and urlsplit(request.url).path=='/api/auth/email/confirm' else None)
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/email/confirm')) as successful_confirmation:
   flow.goto(confirm_link)
  assert successful_confirmation.value.status==200
  expect(flow.get_by_role('status')).to_contain_text('Tu correo se ha confirmado correctamente')
  flow.wait_for_load_state('networkidle')
  assert len(confirmations)==1, 'Auth context updates repeated a valid one-use confirmation'
  updated_session=successful_confirmation.value.json()
  assert updated_session['user']['id']==identity['id'] and updated_session['user']['email']==next_email
  assert updated_session.get('refreshToken') is None, 'Web confirmation exposed a refresh token in JSON'
  assert any(cookie['name']=='nextfit_refresh' and cookie['httpOnly'] for cookie in flow_context.cookies())
  assert 'nextfit_refresh' not in flow.evaluate('document.cookie')
  call('POST','/api/auth/email/confirm',{'token':confirm_token},expected=400)
  call('POST','/api/auth/password/reset',{'token':pending_reset,'newPassword':password},expected=400)
  call('POST','/api/auth/refresh',{'refreshToken':renewed['refreshToken']},expected=401)
  call('POST','/api/auth/login',{'email':identity['email'],'password':new_password},expected=401)
  final_login=call('POST','/api/auth/login',{'email':next_email,'password':new_password})
  assert final_login['user']['id']==identity['id']
  for reload_page in (False,True):
   with flow.expect_response(lambda response: response.url.endswith('/api/auth/refresh')) as refreshed:
    if reload_page: flow.reload()
    else: flow.goto(WEB+'/'+role+'/dashboard')
   assert refreshed.value.status==200 and refreshed.value.json()['user']['email']==next_email
   flow.wait_for_url(re.compile('/'+role+'/dashboard$'))
   flow.wait_for_load_state('networkidle')
  print('PASS valid local mail links:',role,'real notifier HTML, reset replacement/replay protection, password login and refresh revocation, one email confirmation, old email rejected, new email login and cookie reload. Delivery captured in memory; external transport not tested.')
  flow_context.close()


 # Authenticated password change uses real credentials and revokes refresh sessions.
 for role in ('cliente','entrenador'):
  identity=account(role,'Password'+role)
  call('POST','/api/auth/password/forgot',{'email':identity['email']})
  _,pending_reset=captured_link(identity['email'],'/reset-password')
  next_password='Local-change!'+secrets.token_hex(12)
  fixture_secrets.append(next_password)
  password_context=browser.new_context(viewport={'width':390 if role=='cliente' else 1365,'height':900})
  password_context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
  failures={'save':1}
  def fail_password_change(route,_request,left=failures):
   if left['save']:
    left['save']-=1
    route.fulfill(status=503,json={'message':'Local beta injected password change failure'})
   else:route.continue_()
  password_context.route('**/api/auth/password',fail_password_change)
  flow=password_context.new_page()
  flow.goto(WEB+'/auth/login')
  flow.get_by_placeholder('usuario@email.com').fill(identity['email'])
  flow.get_by_placeholder('••••••••').fill(password)
  flow.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  flow.wait_for_url(re.compile('/'+role+'/dashboard$'))
  flow.wait_for_load_state('networkidle')
  assert any(cookie['name']=='nextfit_refresh' and cookie['httpOnly'] for cookie in password_context.cookies())
  flow.goto(WEB+'/'+role+'/seguridad/password')
  for label,value in [('Contraseña actual',password),('Nueva contraseña',next_password),('Confirmar nueva contraseña',next_password)]:
   flow.get_by_label(label,exact=True).fill(value)
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/password')) as unavailable:
   flow.get_by_role('button',name='Actualizar contraseña',exact=True).click()
  assert unavailable.value.status==503
  expect(flow.get_by_role('status')).to_contain_text('No se pudo actualizar')
  expect(flow.get_by_label('Contraseña actual',exact=True)).to_have_value(password)
  expect(flow.get_by_label('Nueva contraseña',exact=True)).to_have_value(next_password)
  assert call('POST','/api/auth/login',{'email':identity['email'],'password':password})['user']['id']==identity['id']
  flow.get_by_label('Contraseña actual',exact=True).fill('Wrong-local-password!')
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/password')) as wrong_password:
   flow.get_by_role('button',name='Actualizar contraseña',exact=True).click()
  assert wrong_password.value.status==400
  expect(flow.get_by_role('status')).to_contain_text('La contraseña actual no es correcta')
  flow.get_by_label('Contraseña actual',exact=True).fill(password)
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/password')) as changed:
   flow.get_by_role('button',name='Actualizar contraseña',exact=True).click()
  assert changed.value.status==200
  assert changed.value.request.post_data_json=={'currentPassword':password,'newPassword':next_password}
  flow.wait_for_url(re.compile('/auth/login$'))
  call('POST','/api/auth/login',{'email':identity['email'],'password':password},expected=401)
  call('POST','/api/auth/refresh',{'refreshToken':identity['refreshToken']},expected=401)
  web_refresh=password_context.request.post(API+'/api/auth/refresh',headers={'X-Client-Type':'WEB','X-Requested-With':'XMLHttpRequest','Origin':WEB},data={})
  assert web_refresh.status==401, 'The previous web refresh cookie still renewed the session'
  call('POST','/api/auth/password/reset',{'token':pending_reset,'newPassword':password},expected=400)
  login=call('POST','/api/auth/login',{'email':identity['email'],'password':next_password})
  assert login['user']['id']==identity['id']
  flow.goto(WEB+'/'+role+'/dashboard')
  flow.wait_for_url(re.compile('/auth/login$'))
  flow.get_by_placeholder('usuario@email.com').fill(identity['email'])
  flow.get_by_placeholder('••••••••').fill(next_password)
  flow.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  flow.wait_for_url(re.compile('/'+role+'/dashboard$'))
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/refresh')) as refreshed:
   flow.reload()
  assert refreshed.value.status==200 and refreshed.value.json()['user']['id']==identity['id']
  print('PASS authenticated password change:',role,'outage keeps fields, actual wrong-password rejection, success logs out locally, old password and mobile/web refresh rejected, pending reset invalidated, new password login and cookie reload work.')
  password_context.close()

 # Privacy consent is isolated per account and persisted in the real local API.
 for role in ('cliente','entrenador'):
  identity=account(role,'Privacy'+role)
  before=call('GET','/api/auth/consents',token=identity['token'])
  assert before['terms']['accepted'] and before['privacy']['accepted']
  assert before['marketing']['accepted'] is False
  privacy_context=browser.new_context(viewport={'width':390 if role=='cliente' else 1365,'height':900})
  privacy_context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
  failures={'load':1,'save':1}
  def fail_privacy(route,_request,left=failures):
   key='load' if route.request.method=='GET' else 'save'
   if left[key]:
    left[key]-=1
    route.fulfill(status=503,json={'message':'Local beta injected privacy failure'})
   else:route.continue_()
  privacy_context.route('**/api/auth/consents',fail_privacy)
  privacy_context.route('**/api/auth/consents/marketing',fail_privacy)
  flow=privacy_context.new_page()
  flow.goto(WEB+'/auth/login')
  flow.get_by_placeholder('usuario@email.com').fill(identity['email'])
  flow.get_by_placeholder('••••••••').fill(password)
  flow.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  flow.wait_for_url(re.compile('/'+role+'/dashboard$'))
  flow.wait_for_load_state('networkidle')
  flow.goto(WEB+'/'+role+'/seguridad/privacidad')
  expect(flow.get_by_role('alert')).to_contain_text('No se pudo cargar')
  checkbox=flow.get_by_label('Comunicaciones de marketing',exact=True)
  expect(checkbox).to_be_disabled()
  expect(flow.locator('section[aria-labelledby="privacy-communications-title"] li')).to_have_count(0)
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/consents')) as loaded:
   flow.get_by_role('button',name='Reintentar privacidad',exact=True).click()
  assert loaded.value.status==200
  expect(checkbox).to_be_enabled()
  expect(checkbox).not_to_be_checked()
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/consents/marketing')) as failed:
   checkbox.click()
  assert failed.value.status==503
  expect(flow.get_by_role('status')).to_contain_text('No se pudo actualizar')
  expect(checkbox).not_to_be_checked()
  assert call('GET','/api/auth/consents',token=identity['token'])['marketing']['accepted'] is False
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/consents/marketing')) as enabled:
   checkbox.click()
  assert enabled.value.status==204
  expect(checkbox).to_be_checked()
  flow.reload()
  expect(flow.get_by_label('Comunicaciones de marketing',exact=True)).to_be_checked()
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/consents/marketing')) as disabled:
   flow.get_by_label('Comunicaciones de marketing',exact=True).click()
  assert disabled.value.status==204
  expect(flow.get_by_label('Comunicaciones de marketing',exact=True)).not_to_be_checked()
  flow.reload()
  expect(flow.get_by_label('Comunicaciones de marketing',exact=True)).to_be_enabled()
  expect(flow.get_by_label('Comunicaciones de marketing',exact=True)).not_to_be_checked()
  after=call('GET','/api/auth/consents',token=identity['token'])
  assert after['terms']==before['terms'] and after['privacy']==before['privacy']
  assert after['marketing']['accepted'] is False and after['marketing']['withdrawnAt']
  assert call('GET','/api/auth/consents',token=other['token'])['marketing']['accepted'] is False
  call('GET','/api/auth/consents',expected=401)
  assert flow.evaluate('document.documentElement.scrollWidth <= innerWidth')
  print('PASS privacy preferences:',role,'load/save failures recovered, actual enable and withdrawal persisted after reload, legal records unchanged and unrelated account unaffected.')
  privacy_context.close()

 # Destructive operations only on fresh synthetic accounts in the isolated JVM.
 for role in ('cliente','entrenador'):
  identity=account(role,'Delete'+role)
  dependent=None
  if role=='entrenador':
   dependent=account('cliente','Dependent')
   call('POST',f"/api/entrenador/{identity['id']}/fichar",{'email':dependent['email']},identity['token'])
   assert len(call('GET',f"/api/entrenador/{identity['id']}/clientes",token=identity['token']))==1
  call('POST','/api/auth/password/forgot',{'email':identity['email']})
  _,pending_reset=captured_link(identity['email'],'/reset-password')
  next_email='delete-pending-'+role+'-'+suffix+'@example.invalid'
  call('PUT','/api/auth/email',{'currentPassword':password,'newEmail':next_email},identity['token'])
  _,pending_email=captured_link(next_email,'/confirm-email-change')
  deletion_context=browser.new_context(viewport={'width':390 if role=='cliente' else 1365,'height':900})
  deletion_context.route('**/*',lambda route:route.continue_() if route.request.url.startswith((WEB+'/',API+'/')) else route.abort())
  failures={'identities':1,'delete':1}
  def fail_deletion(route,_request,left=failures):
   key='identities' if route.request.method=='GET' else 'delete'
   if left[key]:
    left[key]-=1
    route.fulfill(status=503,json={'message':'Local beta injected account deletion failure'})
   else:route.continue_()
  deletion_context.route('**/api/auth/identities',fail_deletion)
  deletion_context.route('**/api/auth/account',fail_deletion)
  flow=deletion_context.new_page()
  confirmation={'accept':False}
  flow.on('dialog',lambda dialog:dialog.accept() if confirmation['accept'] else dialog.dismiss())
  sent=[]
  deletion_context.on('request',lambda request,seen=sent:seen.append(request.method) if urlsplit(request.url).path=='/api/auth/account' else None)
  flow.goto(WEB+'/auth/login')
  flow.get_by_placeholder('usuario@email.com').fill(identity['email'])
  flow.get_by_placeholder('••••••••').fill(password)
  flow.get_by_role('button',name=re.compile('^INICIAR SESIÓN$',re.I)).click()
  flow.wait_for_url(re.compile('/'+role+'/dashboard$'))
  flow.wait_for_load_state('networkidle')
  flow.goto(WEB+'/'+role+'/seguridad/eliminar-cuenta')
  expect(flow.get_by_role('alert')).to_contain_text('No se pudieron cargar tus métodos')
  expect(flow.get_by_label('Contraseña actual',exact=True)).to_have_count(0)
  flow.get_by_role('button',name='Reintentar',exact=True).click()
  flow.get_by_label('Contraseña actual',exact=True).fill(password)
  flow.get_by_role('button',name='Eliminar mi cuenta',exact=True).click()
  assert not sent, 'Cancelling confirmation sent a deletion request'
  assert call('GET','/api/auth/sessions',token=identity['token'])
  confirmation['accept']=True
  # First deletion response is a controlled outage, then actual wrong-password rejection.
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/account')) as unavailable:
   flow.get_by_role('button',name='Eliminar mi cuenta',exact=True).click()
  assert unavailable.value.status==503
  expect(flow.get_by_role('status')).to_contain_text('No se pudo eliminar')
  expect(flow.get_by_label('Contraseña actual',exact=True)).to_have_value(password)
  assert call('GET','/api/auth/sessions',token=identity['token'])
  flow.get_by_label('Contraseña actual',exact=True).fill('Wrong-local-password!')
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/account')) as wrong_password:
   flow.get_by_role('button',name='Eliminar mi cuenta',exact=True).click()
  assert wrong_password.value.status==400
  expect(flow.get_by_role('status')).to_contain_text('La contraseña actual no es correcta')
  assert call('GET','/api/auth/sessions',token=identity['token'])
  flow.get_by_label('Contraseña actual',exact=True).fill(password)
  with flow.expect_response(lambda response: response.url.endswith('/api/auth/account')) as deleted:
   flow.get_by_role('button',name='Eliminar mi cuenta',exact=True).click()
  assert deleted.value.status==200 and deleted.value.json()['message']=='Cuenta eliminada'
  flow.wait_for_url(re.compile('/auth/login$'))
  assert not any(cookie['name']=='nextfit_refresh' for cookie in deletion_context.cookies())
  assert call('GET','/api/auth/sessions',token=identity['token'],expected=401)['code']=='INVALID_TOKEN'
  call('POST','/api/auth/refresh',{'refreshToken':identity['refreshToken']},expected=401)
  call('POST','/api/auth/login',{'email':identity['email'],'password':password},expected=401)
  call('POST','/api/auth/password/reset',{'token':pending_reset,'newPassword':password},expected=400)
  call('POST','/api/auth/email/confirm',{'token':pending_email},expected=400)
  if dependent:
   assert not call('GET',f"/api/clientes/{dependent['id']}",token=dependent['token']).get('entrenador')
   assert call('POST','/api/auth/login',{'email':dependent['email'],'password':password})['user']['id']==dependent['id']
  print('PASS account deletion:',role,'load/outage recovery, cancelled confirmation sends nothing, actual wrong-password rejection, successful deactivation clears cookie and rejects JWT/login/refresh/pending links; dependent athlete remains active when coach is deleted.')
  deletion_context.close()

 browser.close()
