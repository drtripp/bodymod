# Deployment Notes

Bodymod is currently a two-process prototype:

- `frontend/`: static React/Vite build
- `backend/`: FastAPI API for targets, matching, and percentile estimates

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
- final decisions on encoded share URLs and analytics
