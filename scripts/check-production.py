import urllib.request,urllib.error,json,uuid
base='https://nextfit-pa8i.onrender.com'
origin='https://next-fit-q7uo.vercel.app'
def request(path,method='GET',payload=None,headers=None):
 req=urllib.request.Request(base+path,data=json.dumps(payload).encode() if payload is not None else None,method=method,headers=headers or {})
 try:
  with urllib.request.urlopen(req,timeout=45) as response:return response.status,dict(response.headers),response.read().decode(response.headers.get_content_charset() or 'utf-8')
 except urllib.error.HTTPError as error:return error.code,dict(error.headers),error.read().decode(error.headers.get_content_charset() or 'utf-8')
status,_,body=request('/actuator/health');assert status==200 and json.loads(body)['status']=='UP';print('API health: UP')
for path in ['/api/moderation/access','/api/moderation/reports','/api/chat/safety/'+str(uuid.uuid4())]:
 status,_,body=request(path);assert status==401,(path,status)
 assert json.loads(body)['code']=='MISSING_TOKEN';print('Authentication required:',path.split('?')[0].rsplit('/',1)[0] if '/safety/' in path else path)
status,headers,_=request('/api/moderation/access','OPTIONS',headers={'Origin':origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'})
headers={k.lower():v for k,v in headers.items()}
assert status in (200,204) and headers.get('access-control-allow-origin')==origin
print('Production web CORS: exact origin allowed')
status,_,body=request('/api/auth/google','POST',{'credential':'not-a-valid-id-token'},{'Content-Type':'application/json','Origin':origin})
assert status==401 and json.loads(body)['code']=='INVALID_GOOGLE_TOKEN',(status,body[:200])
print('Google authentication: invalid credentials correctly rejected')
