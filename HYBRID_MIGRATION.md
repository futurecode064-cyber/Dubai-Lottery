# Dubai Lottery Free-Play Hybrid Migration

This branch is an isolated, non-cash demo architecture. The existing Neon production branch is intentionally left unchanged.

## Target architecture

Android local UI/cache -> Cloudflare Worker API -> Cloudflare D1 -> server-side demo-points/result logic -> remote config/announcement.

Important: DEMO_POINTS have no cash value and are not redeemable. No deposit, withdrawal, cash-out, or payment path is included.

## What changed

- Android loads its UI from `android/app/src/main/assets/index.html`, not from the server.
- UI random-number animation runs locally and does not generate API traffic.
- State refresh is event-driven plus a five-minute fallback, instead of every five seconds.
- Near the 18:00 / 19:00 / 20:00 Myanmar result windows, public result/config checks can temporarily increase to once every 30 seconds.
- Cloudflare Worker authenticates player API calls with a 12-hour bearer session.
- At most two active player sessions are retained per account.
- D1 keeps users, sessions, demo plays, point ledger, scheduled results, published results, and remote config.
- Result and reward logic stays on the server. The APK cannot directly change points.
- Admin operations are server-only and require `X-Demo-Admin-Key` matching the Worker `ADMIN_TOKEN` secret.

## Data safety / cutover rule

Do not delete or modify the existing Neon service during evaluation. This free-play D1 database starts fresh. Legacy money-equivalent balances are intentionally not copied into demo points. If usernames are later re-created for testing, set fresh passwords and demo starting points.

Cut over only after all of these pass:

1. Worker syntax/schema CI.
2. Android local-UI build.
3. Cloudflare free-tier deployment.
4. Create test demo users.
5. Login/state/play/idempotency/result/remote-config checks.
6. Controlled load test.
7. APK preview test on real Android devices.
8. Explicit approval to point a release build at the Cloudflare Worker.

## Cloudflare setup (when account access is available)

Create one D1 database named `dubai-lottery-freeplay`. Put its ID in `cloudflare/wrangler.toml` or provide it to the deploy workflow. Configure these Worker secrets/vars:

- `ADMIN_TOKEN` - long random secret, never commit it.
- `APP_ORIGIN=https://app.local`
- `SESSION_TTL_SECONDS=43200`
- `DEFAULT_STARTING_POINTS=10000`

Initialize the D1 database with `cloudflare/schema.sql`, then deploy the Worker.

## Admin API examples

All admin calls require header `X-Demo-Admin-Key: <ADMIN_TOKEN>`.

- `POST /admin/users` body: `{"username":"demo01","password":"a-strong-password","starting_points":10000}`
- `POST /admin/grant` body: `{"user_id":1,"delta":1000,"note":"demo grant","request_key":"unique_request_key_123"}`
- `POST /admin/result` body: `{"day":"YYYY-MM-DD","market":"2D","result":"07"}`
- `POST /admin/config` body: `{"announcement":"...","maintenance":"0"}`

## Android build

Before a real preview build, pass the deployed Worker HTTPS URL ending with `/`:

`gradle --no-daemon :app:assembleDebug -PapiBase=https://YOUR-WORKER.workers.dev/`

The existing signed/verified APK is not replaced by this branch.
