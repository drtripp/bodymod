# bodymod

Measurement-driven body comparison and tracking tool.

The repo is structured as a small full-stack app:

- `frontend/`: React + Vite frontend in JavaScript
- `backend/`: FastAPI backend in Python
- root docs: exploratory plan, MVP spec, and site implementation plan

## Stack

- Frontend: React, Vite, plain CSS
- Backend: FastAPI, Uvicorn, Pydantic

The frontend is intentionally minimal and avoids the usual AI-generated-site styling patterns. The backend is small now, but structured so later work can add model-serving, ONNX, or a separate inference layer without reshaping the whole repo.

## Run

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs on `http://localhost:8000` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

Set `VITE_API_BASE_URL` if the backend is not running on `http://localhost:8000`.

## Current Scope

The scaffold includes:

- a single-page tool layout
- measurement form and local state
- placeholder percentile output
- target profile fetch and ranked match display
- FastAPI health and match endpoints
- minimal visual system aligned to the planning docs

It does not yet include:

- real silhouette generation
- real percentile calculations from reference population data
- advanced match weighting
- local snapshot persistence
- share links
- any Hugging Face or ONNX inference work

## Model Notes

- `facebook/sapiens2` was evaluated on April 24, 2026 as a possible future photo/body-analysis model.
- It is not a fit for the current app direction. The present product is measurement-first, and the MVP explicitly excludes raw photo uploads.
- Even for a future photo-assisted flow, Sapiens2 appears misaligned: its published checkpoints are for pose estimation, body-part segmentation, surface normals, and pointmaps rather than direct measurement extraction.
- More importantly, the Sapiens2 license explicitly restricts use "for biometric processing", which makes it a poor candidate for a body-measurement product without separate legal review and a narrower use case.

## Docs

- `body-modding-platform-plan.docx`: original exploratory document
- `body-modding-platform-plan.md`: markdown copy of the exploratory plan
- `mvp-build-spec.md`: narrowed build-ready MVP spec
- `site-implementation-plan.md`: site architecture and implementation plan
