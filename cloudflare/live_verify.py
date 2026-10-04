"""Exercise the deployed demo API; remove only the fixtures created by this run."""
import hashlib
import json
import os
import secrets
import time
import urllib.error
import urllib.request

base = os.environ['WORKER_URL'].rstrip('/')
cf_token = os.environ['CLOUDFLARE_API_TOKEN']
account = os.environ['CLOUDFLARE_ACCOUNT_ID']
database = os.environ['D1_DATABASE_ID']
admin = hashlib.sha256((cf_token + ':dubai-lottery-freeplay-admin-v1').encode()).hexdigest()
username = 'qa_' + secrets.token_hex(8)
password = secrets.token_urlsafe(24)
user_id = None
fixture_day = '1900-01-01'
created_result = False

def request(path, payload=None, token=None, admin_key=False, expected=200, origin=None):
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Dubai-Lottery-Live-QA/1.0'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if admin_key:
        headers['X-Demo-Admin-Key'] = admin
    if origin:
        headers['Origin'] = origin
    req = urllib.request.Request(base + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
    try:
        response = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read()
    assert response.status == expected, (path, response.status, raw.decode(errors='replace')[:160])
    data = json.loads(raw)
    return data, response.headers

def query(sql, params):
    req = urllib.request.Request(
        f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{database}/query',
        data=json.dumps({'sql': sql, 'params': params}).encode(),
        headers={'Authorization': 'Bearer ' + cf_token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.load(response)
    assert result['success'], 'Fixture cleanup failed'

try:
    # A new deployment can briefly coexist with the previous version at edge locations.
    # Wait for the newly added, authenticated dashboard route before exercising it.
    for attempt in range(30):
        req = urllib.request.Request(base + '/admin/state', headers={
            'X-Demo-Admin-Key': admin, 'Accept': 'application/json', 'User-Agent': 'Dubai-Lottery-Live-QA/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                assert response.status == 200
            break
        except urllib.error.HTTPError as error:
            if error.code != 404 or attempt == 29:
                raise
            time.sleep(1)
    for path in ['/player', '/admin']:
        req = urllib.request.Request(base + path, headers={'User-Agent': 'Dubai-Lottery-Live-QA/1.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            page = response.read().decode()
            assert response.status == 200 and response.headers['Content-Type'].startswith('text/html')
            assert 'id="loginForm"' in page and admin not in page
            assert "frame-ancestors 'none'" in response.headers['Content-Security-Policy']
            if path == '/player':
                assert '__API_BASE__' not in page and base in page
    request('/admin/state', expected=401)
    request('/api/admin/login', {'username': 'admin', 'password': 'wrong-password-123'}, expected=401)
    request('/api/admin/login', {'username': 'wrong-user', 'password': admin}, expected=401)
    admin_login, _ = request('/api/admin/login', {'username': 'admin', 'password': admin})
    assert admin_login['token'] == admin
    dashboard, _ = request('/admin/state', admin_key=True)
    assert isinstance(dashboard['users'], list) and isinstance(dashboard['scheduled'], list)
    assert all('password_hash' not in user for user in dashboard['users'])
    public, headers = request('/api/config', origin='https://app.local')
    assert public['mode'] == 'free-play' and public['redeemable'] is False
    assert headers['Access-Control-Allow-Origin'] == 'https://app.local'
    request('/api/state', expected=401)
    request('/admin/users', {'username': username, 'password': password}, expected=401)
    user, _ = request('/admin/users', {'username': username, 'password': password, 'starting_points': 10000}, admin_key=True)
    user_id = user['id']
    request('/api/login', {'username': username, 'password': 'wrong-password-123'}, expected=401)
    tokens = []
    for _ in range(3):
        data, _ = request('/api/login', {'username': username, 'password': password})
        assert data['max_devices'] == 2
        tokens.append(data['token'])
    request('/api/state', token=tokens[0], expected=401)
    state, _ = request('/api/state', token=tokens[1])
    assert state['account']['points'] == 10000
    token = tokens[2]
    # Check plays in the first market whose cutoff has not passed.
    open_market = next((m for m, utc in [('2D', '11:30'), ('3D', '12:30'), ('4D', '13:30')]
                        if state['server_time'] < state['day'] + 'T' + utc + ':00.000Z'), None)
    if open_market:
        data = {'market': open_market, 'number': '0' * int(open_market[0]), 'stake': 10, 'request_key': secrets.token_hex(16)}
        first, _ = request('/api/play', data, token=token)
        replay, _ = request('/api/play', data, token=token)
        assert first['play_id'] == replay['play_id'] and replay['duplicate'] is True
        state, _ = request('/api/state', token=token)
        assert state['account']['points'] == 9990 and len(state['plays']) == 1
        request('/api/play', {**data, 'stake': 11}, token=token, expected=409)
    else:
        request('/api/play', {'market': '2D', 'number': '00', 'stake': 10, 'request_key': secrets.token_hex(16)}, token=token, expected=409)
    grant = {'user_id': user_id, 'delta': 25, 'request_key': secrets.token_hex(16), 'note': 'Disposable live QA'}
    first, _ = request('/admin/grant', grant, admin_key=True)
    replay, _ = request('/admin/grant', grant, admin_key=True)
    assert first['duplicate'] is False and replay['duplicate'] is True
    request('/api/preferences', {'daily_limit': 5000}, token=token)
    state, _ = request('/api/state', token=token)
    assert state['account']['daily_limit'] == 5000
    request('/api/preferences', {'daily_limit': 6000}, token=token, expected=400)
    if not any(r['day'] == fixture_day and r['market'] == '2D' for r in public['results']):
        request('/admin/result', {'day': fixture_day, 'market': '2D', 'result': '07'}, admin_key=True)
        created_result = True
        public, _ = request('/api/results')
        assert any(r['day'] == fixture_day and r['market'] == '2D' and r['result'] == '07' for r in public['results'])
        request('/admin/result', {'day': fixture_day, 'market': '2D', 'result': '08'}, admin_key=True, expected=409)
    # Preserve the current announcement while checking the authenticated config route.
    request('/admin/config', {'announcement': public['announcement']}, admin_key=True)
    request('/api/logout', {}, token=token)
    request('/api/state', token=token, expected=401)
    print('LIVE_VERIFY=passed: player/admin web pages, admin login, protected dashboard, auth, CORS, sessions, points, idempotency, limits, results, config and logout')
finally:
    if user_id is not None:
        for table in ['sessions', 'plays', 'point_ledger']:
            query(f'DELETE FROM {table} WHERE user_id=?', [user_id])
        query('DELETE FROM users WHERE id=? AND username=?', [user_id, username])
        query('DELETE FROM login_rate WHERE key=?', ['login:' + username])
    if created_result:
        query('DELETE FROM results WHERE day=? AND market=? AND result=?', [fixture_day, '2D', '07'])
        query('DELETE FROM scheduled_results WHERE day=? AND market=? AND result=?', [fixture_day, '2D', '07'])
    print('LIVE_FIXTURES=cleaned')
