import contextlib
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app
from core import Store

class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        app.store=Store(Path(cls.temp.name)/'http.sqlite3')
        cls.admin=app.store.create_user('owner','admin_password_123',role='admin')
        cls.player=app.store.create_user('player','player_password_123',actor=cls.admin)
        app.store.adjust(cls.admin,cls.player,100,'Initial HTTP credits','http_seed_key_1234567')
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)
        cls.temp.cleanup()

    def request(self,path,data=None,cookie=None,custom_header=True):
        headers={}
        if cookie: headers['Cookie']=cookie
        if data is not None:
            headers['Content-Type']='application/json'
            if custom_header: headers['X-Requested-With']='DubaiLottery'
        r=urllib.request.Request(self.url+path,data=json.dumps(data).encode() if data is not None else None,headers=headers)
        try:
            with urllib.request.urlopen(r,timeout=5) as response:
                return response.status,response.read(),response.headers
        except urllib.error.HTTPError as e:
            return e.code,e.read(),e.headers

    def login(self):
        status,raw,headers=self.request('/api/login',{'username':'player','password':'player_password_123'})
        self.assertEqual(status,200)
        self.assertIn('HttpOnly',headers['Set-Cookie'])
        self.assertIn('SameSite=Strict',headers['Set-Cookie'])
        return headers['Set-Cookie'].split(';')[0]

    def test_authenticated_state_and_logout(self):
        cookie=self.login()
        status,raw,_=self.request('/api/state',cookie=cookie)
        self.assertEqual(status,200)
        state=json.loads(raw)
        self.assertEqual(state['account']['username'],'player')
        self.assertNotIn('password',state['account'])
        self.assertNotIn('users',state)
        self.assertNotIn('audit',state)
        self.assertEqual(len([d for d in state['draws'] if d['day']==state['day']]),3)
        status,_,_=self.request('/api/logout',{},cookie)
        self.assertEqual(status,200)
        self.assertEqual(self.request('/api/state',cookie=cookie)[0],401)

    def test_anonymous_state_is_rejected(self):
        self.assertEqual(self.request('/api/state')[0],401)

    def test_cross_site_mutation_header_required(self):
        self.assertEqual(self.request('/api/login',{'username':'player','password':'player_password_123'},custom_header=False)[0],403)

    def test_admin_endpoint_rejects_player(self):
        self.assertEqual(self.request('/api/admin/adjust',{'user_id':self.player,'delta':100,'note':'Unauthorized credits','key':'invalid_http_key_12345'},self.login())[0],403)

    def test_static_page_headers_and_private_files(self):
        status,raw,headers=self.request('/')
        self.assertEqual(status,200)
        self.assertIn(b'Dubai Lottery',raw)
        self.assertEqual(headers['X-Frame-Options'],'DENY')
        self.assertIn("frame-ancestors 'none'",headers['Content-Security-Policy'])
        self.assertEqual(self.request('/core.py')[0],404)
        self.assertEqual(self.request('/lottery.sqlite3')[0],404)

    def test_invalid_json_shape_and_missing_fields(self):
        self.assertEqual(self.request('/api/login',[])[0],400)
        self.assertEqual(self.request('/api/bet',{},self.login())[0],400)

if __name__=='__main__': unittest.main()
