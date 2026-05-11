# Agrobook SERP Monitor (Cloud Run Express Service)

Node.js backend for SERP monitoring with DataForSEO and BigQuery, deployed as **one Cloud Run service** with one Express app.

## Endpoints

- `GET /health`
- `POST /post-serp-tasks`
- `POST /fetch-serp-results`
- `POST /post-search-volume-tasks`
- `POST /fetch-search-volume-results`

## Environment variables

Copy `.env.example` to `.env` for local development.

- `GCP_PROJECT_ID=gen-lang-client-0073794959`
- `BIGQUERY_DATASET=agrobook_serp_monitor`
- `BIGQUERY_LOCATION=EU`
- `LOCATION_CODE=2348`
- `LANGUAGE_CODE=hu`
- `SERP_DEVICES=desktop,mobile`
- `LOAD_ASYNC_AI_OVERVIEW=false` (default)
- `DATAFORSEO_LOGIN=...`
- `DATAFORSEO_PASSWORD=...`
- `TARGET_DOMAIN=agrobook.hu`

### Async AI Overview loading

- `LOAD_ASYNC_AI_OVERVIEW=false` by default.
- Set `LOAD_ASYNC_AI_OVERVIEW=true` to include `load_async_ai_overview: true` in SERP task payloads.
- This may increase DataForSEO cost per task.
- Recommended first rollout:
  - test with 10–20 keywords,
  - use desktop-only or a limited `SERP_DEVICES` set,
  - then expand to full keyword/device coverage if output is useful.

## Run locally

```bash
npm install
npm start
```

Service listens on `PORT` or `8080`.

## Deploy to Cloud Run (single service)

```bash
gcloud run deploy serp-observer \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=gen-lang-client-0073794959,BIGQUERY_DATASET=agrobook_serp_monitor,BIGQUERY_LOCATION=EU,LOCATION_CODE=2348,LANGUAGE_CODE=hu,SERP_DEVICES=desktop,mobile,LOAD_ASYNC_AI_OVERVIEW=false,TARGET_DOMAIN=agrobook.hu \
  --set-secrets DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest
```

## Scheduler URLs

Use Cloud Scheduler HTTP jobs against the deployed Cloud Run base URL:

- `POST https://<cloud-run-url>/post-serp-tasks`
- `POST https://<cloud-run-url>/fetch-serp-results`
- `POST https://<cloud-run-url>/post-search-volume-tasks`
- `POST https://<cloud-run-url>/fetch-search-volume-results`

## BigQuery AI Overview view

Run `sql/ai_overview_views.sql` to create `v_ai_overview_presence`, which summarizes:

- keyword/device
- AI Overview presence
- whether overview text exists
- overview text
- source count
- whether target domain is cited
- source domains
- fetched timestamp
