# Hospital Triage System – Hackathon Project

AI-powered emergency triage with risk classification, department routing, and explainability.

## Phase 1 – Core Triage System ✅

- **Patient Input Module** – Manual entry, auto ID, vitals, validation, abnormality alerts
- **AI Risk Classification** – Low/Medium/High with confidence & probability breakdown
- **Department Recommendation** – Hybrid ML + rule-based mapping
- **Explainability** – Top 3 features, abnormal vitals, probability chart
- **Dashboard** – Overview, risk & department distribution

## Phase 2 – Intelligence & UX Upgrade ✅

- **AI Chat Assistant** – Guided symptom collection, risk explanation (“Why am I high risk?”, “Why Emergency?”), medical term explanations with safety disclaimer
- **EHR/EMR Upload** – Upload PDF or TXT; NLP symptom extraction; highlighted keywords; “Fill form” to auto-fill symptoms
- **Priority Scoring** – Priority score (0–100) used for queue sorting; Dashboard shows **Priority queue** (emergency fast-track) sorted by score
- **Advanced Explainability** – SHAP contribution chart (positive/negative), feature importance graph on triage result

## Phase 3 – Operational Intelligence ✅

- **Department Load Balancing** – Max capacity per department; current patients; load %; if recommended department &gt;85%, smart routing to alternate; **Department load** panel on Dashboard
- **Real-Time Simulation** – Add simulated patients (random vitals); **Emergency spike** adds 5 high-risk patients; live-updating dashboard
- **Priority Queue Simulation** – Auto-sorted by priority; **Estimated wait time** per patient (position + priority); emergency fast-track lane
- **Severity Timeline Prediction** – Rule-based “Risk may escalate in X hours”; shown on triage result when applicable

## Phase 4 – Fairness & Accessibility ✅

- **Bias & Fairness Monitoring** – Gender-based and age-group risk comparison; imbalance alert when a group has &gt;2× average high-risk rate; **Fairness** page with heatmap (gender vs risk, age vs risk)
- **Multi-Language Support** – English and Hindi (EN / हिं) with language switcher in header; UI labels, nav, and key copy translated
- **Voice-Based Symptom Input** – Speech-to-text (Web Speech API) on Add Patient; speak symptoms to add to form (en-IN / hi-IN)

## Phase 5 – Production & Scalability ✅

- **Admin Panel** – **Admin** page: patient logs with filter by risk, download prediction history as CSV; model info (version, accuracy); synthetic data summary; **Retrain model** and **Regenerate dataset** actions
- **Synthetic Data Engine** – Regenerate synthetic dataset (controlled distribution, class imbalance); dataset summary and class distribution in Admin
- **Model Monitoring** – Model version and test accuracy in meta; retrain endpoint; versioning via `trained_at` and `version`
- **Deployment** – Dockerfile for backend (Python 3.11); docker-compose for backend + frontend; REST API; modular ML pipeline

## Quick Start

### Backend (Python 3.10+)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m ml.train_model   # Generate model (first run; already done if artifacts exist)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (frontend proxies `/api` to backend at port 8000).

### Docker (optional)

```bash
docker-compose up --build
```

Backend: http://localhost:8000. Frontend: http://localhost:5173 (ensure frontend `vite.config.ts` proxies `/api` to `http://localhost:8000` when using Docker).

## Project Structure

```
backend/          # FastAPI app, validation, ML inference
  app/            # API routes, schemas
  ml/             # Training, preprocessing, model
frontend/         # React + Vite dashboard
```

## API

- `POST /api/patients` – Add patient (validates, returns risk + department + explainability + SHAP)
- `GET /api/patients?sort=priority` – List patients (today), sorted by priority by default
- `GET /api/dashboard` – Counts and chart data
- `POST /api/chat` – Triage support bot (guided symptoms, risk explanation, medical terms)
- `POST /api/ehr/upload` – Upload PDF/TXT; returns extracted symptoms + highlighted snippet
- `GET /api/symptoms` – Symptom options for multi-select
- `GET /api/departments/status` – Department load (capacity, current, load %, overloaded)
- `POST /api/simulation/add` – Add simulated patient(s); body: `{ count, emergency_spike }`
- `POST /api/simulation/spike` – Add 5 high-risk simulated patients (emergency spike)
- `GET /api/fairness` – Bias & fairness metrics (gender/age vs risk, heatmap, imbalance alert)
- `GET /api/admin/patients?risk=` – Patient logs (optional risk filter)
- `GET /api/admin/export?risk=` – Download CSV
- `GET /api/admin/synthetic/summary` – Synthetic dataset / model summary
- `POST /api/admin/synthetic/regenerate?n_samples=` – Regenerate synthetic data and retrain
- `GET /api/admin/model` – Model version, accuracy, metadata
- `POST /api/admin/model/retrain?n_samples=` – Retrain model
