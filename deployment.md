# Deployment Notes

Bodymod is currently a two-process prototype:

- `frontend/`: static React/Vite build
- `backend/`: FastAPI API for targets, matching, strategy corpus seeds, and
  percentile estimates

## Frontend

Build the static frontend:

```bash
cd frontend
npm install
npm run build
```

Deploy `frontend/dist` with any static host.

Set `VITE_API_BASE_URL` at build time if the API is not hosted at
`http://localhost:8000`:

```bash
set VITE_API_BASE_URL=https://api.example.com
npm run build
```

Browser error capture stores a sanitized local ring buffer by default. It does
not upload unless enabled at build time:

```bash
set VITE_ERROR_MONITORING_UPLOAD_ENABLED=true
set VITE_ERROR_MONITORING_ENDPOINT=https://api.example.com/api/client-errors
npm run build
```

The first-party `/api/client-errors` sink accepts only the sanitized envelope:
fingerprints, source path, route path, line/column, release, and browser family.
Do not point the frontend at a third-party endpoint until a human monitoring
provider decision has been made.

Product analytics upload is also disabled unless explicitly configured:

```bash
set VITE_PRODUCT_ANALYTICS_UPLOAD_ENABLED=true
set VITE_PRODUCT_ANALYTICS_ENDPOINT=https://api.example.com/api/product-analytics
npm run build
```

The first-party `/api/product-analytics` sink accepts only allowlisted event
names, sanitized routes, anonymous session IDs, release, and browser family.
It does not accept arbitrary properties or measurement payloads. Do not enable
external analytics until the provider and hosting decision is approved.

Remote web-push subscription uses the backend defaults unless overridden:

```bash
set VITE_WEB_PUSH_CONFIG_ENDPOINT=https://api.example.com/api/web-push/config
set VITE_WEB_PUSH_SUBSCRIPTIONS_ENDPOINT=https://api.example.com/api/web-push/subscriptions
npm run build
```

The browser control stays inert unless notification permission is already
granted and the backend reports enabled VAPID configuration.

## Backend

Install and run the API:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production, run Uvicorn behind a TLS-terminating proxy or platform load
balancer. Configure the public frontend origins with a comma-separated
environment variable:

```bash
set BODYMOD_CORS_ORIGINS=https://bodymod.example.com
```

Do not serve the public API over plain HTTP. The TLS boundary should also set
security headers, redirect HTTP to HTTPS, and strip untrusted forwarding
headers before passing requests to Uvicorn.

## Match Rate Limiting

`/api/match` has a process-local fixed-window rate limit. Defaults:

```bash
BODYMOD_MATCH_RATE_LIMIT_MAX=60
BODYMOD_MATCH_RATE_LIMIT_WINDOW_SECONDS=60
```

Set `BODYMOD_MATCH_RATE_LIMIT_MAX=0` only for trusted internal testing.
When Uvicorn runs behind a proxy that overwrites `X-Forwarded-For`, enable
client IP extraction:

```bash
set BODYMOD_TRUST_PROXY_HEADERS=1
```

For multi-worker or multi-instance deployments, keep the app limit but add an
edge or shared-store limiter at the proxy/platform layer because the in-process
bucket is not shared across workers.

## Remote Web Push

The backend stores browser push subscriptions and a timestamp-only
`nextReminderAfter` schedule for stale-trend reminders. Remote delivery is
disabled until VAPID settings are present:

```bash
set BODYMOD_WEB_PUSH_VAPID_PUBLIC_KEY=<public-key>
set BODYMOD_WEB_PUSH_VAPID_PRIVATE_KEY=<private-key>
set BODYMOD_WEB_PUSH_VAPID_SUBJECT=mailto:ops@example.com
```

`GET /api/web-push/config` returns the public key only when all three values
are configured. Subscription payloads are stored in SQLite for stale-trend
delivery jobs; they must not include measurements or account data.

Run the delivery worker from cron or the hosting scheduler. Use `--dry-run`
first; it prints endpoint hashes and schedule times, not raw endpoints:

```bash
cd backend
.venv\Scripts\python.exe scripts\send_trend_push_reminders.py --dry-run
.venv\Scripts\python.exe scripts\send_trend_push_reminders.py
```

The worker sends the fixed data-decay reminder copy only, records last delivery
status in SQLite, and moves the next attempted reminder at least 24 hours
forward. Native app push remains separate native-app scope.

## Dependency Updates

Backend dependencies are exact-pinned in `backend/requirements.txt`. Frontend
dependencies are locked in `frontend/package-lock.json`. For routine updates:

```bash
cd backend
.venv\Scripts\python.exe -m pip install --upgrade --dry-run -r requirements.txt

cd ..\frontend
npm outdated
```

Apply updates intentionally, regenerate lockfiles where applicable, and run
`.\verify.ps1` before deploying.

## Backend Database Backup

The SQLite target repository uses `BODYMOD_DB_PATH`; point it at a persistent
volume outside the release directory:

```bash
set BODYMOD_DB_PATH=D:\bodymod\data\bodymod.sqlite3
```

Before replacing the backend or migrating data, take a SQLite backup:

```powershell
$stamp = Get-Date -Format yyyyMMdd-HHmmss
sqlite3 $env:BODYMOD_DB_PATH ".backup 'D:\bodymod\backups\bodymod-$stamp.sqlite3'"
```

Also snapshot the static seed/data files in the release artifact so a restore
can recreate the prototype target/corpus state.

## Smoke Check

After deploying the API:

```bash
curl https://api.example.com/api/health
```

Expected response:

```json
{"status":"ok"}
```

After deploying the frontend, open the site and confirm:

- the Result panel reports `Backend connected.`
- the match list loads target profiles
- saving a snapshot works locally in the browser
- share URLs are treated as sensitive because they encode body measurements

## Launch Caveats

This deployment path is suitable for a prototype. Public launch still needs:

- vetted reference-population percentile data
- production-quality target profiles
- source-reviewed strategy corpus data
- final decisions on encoded share URLs and analytics provider/hosting
