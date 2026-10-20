"""Isolated local HTTP + real browser check. Never accepts remote URLs."""
import json, re, secrets, struct, zlib
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit
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
 for context in chat_contexts: context.close()
 browser.close()
