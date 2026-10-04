"""Create one non-cash demo account and write owner access only to a private runner file."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import urllib.request

base = os.environ['WORKER_URL'].rstrip('/')
admin = hashlib.sha256((os.environ['CLOUDFLARE_API_TOKEN'] + ':dubai-lottery-freeplay-admin-v1').encode()).hexdigest()
username = 'demo_' + os.environ['GITHUB_RUN_ID'] + '_' + os.environ['GITHUB_RUN_ATTEMPT']
password = secrets.token_urlsafe(24)
for value in [admin, password]:
    print('::add-mask::' + value)
req = urllib.request.Request(base + '/admin/users', data=json.dumps({
    'username': username, 'password': password, 'starting_points': 10000
}).encode(), headers={'Content-Type': 'application/json', 'X-Demo-Admin-Key': admin,
                     'Accept': 'application/json', 'User-Agent': 'Dubai-Lottery-Live-QA/1.0'})
with urllib.request.urlopen(req, timeout=30) as response:
    created = json.load(response)
folder = Path(os.environ['RUNNER_TEMP']) / 'private-backup'
folder.mkdir(mode=0o700, exist_ok=True)
access = folder / 'access.json'
access.write_text(json.dumps({'worker_url': base + '/', 'mode': 'free-play', 'redeemable': False,
    'demo_username': username, 'demo_password': password, 'demo_user_id': created['id'],
    'admin_token': admin, 'd1_database_id': os.environ['D1_DATABASE_ID'],
    'apk_kind': 'debug', 'signing_alias': 'androiddebugkey', 'signing_password': 'android'}, indent=2) + '\n')
access.chmod(0o600)
print('DEMO_ACCOUNT=created; access will be encrypted for its owner before upload')
