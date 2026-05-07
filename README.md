# Agrobook SERP Monitor (Cloud Run + BigQuery)

Node.js 22 Express backend for SERP monitoring using DataForSEO Standard Queue APIs and BigQuery.

## 1) Create BigQuery dataset

```bash
bq --location=EU mk --dataset agrobook-serp-monitor:agrobook_serp_monitor
```

## 2) Run schema SQL

```bash
bq query --use_legacy_sql=false < sql/create_tables.sql
```

## 3) Required environment variables

Copy `.env.example` to `.env` for local development.

- `GCP_PROJECT_ID=agrobook-serp-monitor`
- `BIGQUERY_DATASET=agrobook_serp_monitor`
- `DATAFORSEO_LOGIN=...`
- `DATAFORSEO_PASSWORD=...`
- `TARGET_DOMAIN=agrobook.hu`
- `GOOGLE_LOCATION_NAME=Hungary`
- `GOOGLE_LANGUAGE_NAME=Hungarian`
- `GOOGLE_DOMAIN=google.hu`
- `SERP_DEPTH=20`
- `PORT=8080`

## 4) Run locally

```bash
npm install
npm start
```

Routes:
- `GET /health`
- `POST /post-serp-tasks`
- `POST /fetch-serp-results`
- `POST /post-search-volume-tasks`
- `POST /fetch-search-volume-results`

## 5) Deploy to Cloud Run (single service)

```bash
gcloud run deploy serp-monitor \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=agrobook-serp-monitor,BIGQUERY_DATASET=agrobook_serp_monitor,TARGET_DOMAIN=agrobook.hu,GOOGLE_LOCATION_NAME=Hungary,GOOGLE_LANGUAGE_NAME=Hungarian,GOOGLE_DOMAIN=google.hu,SERP_DEPTH=20 \
  --set-secrets DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest
```

## 6) Trigger endpoints manually

```bash
curl -X GET "https://<cloud-run-url>/health"
curl -X POST "https://<cloud-run-url>/post-serp-tasks"
curl -X POST "https://<cloud-run-url>/fetch-serp-results"
curl -X POST "https://<cloud-run-url>/post-search-volume-tasks"
curl -X POST "https://<cloud-run-url>/fetch-search-volume-results"
```

## 7) Schedule weekly SERP monitoring

- Weekly trigger: `POST /post-serp-tasks`
- Later trigger: `POST /fetch-serp-results` (e.g. every 30 minutes)

```bash
gcloud scheduler jobs create http serp-post-weekly \
  --schedule="0 6 * * 1" \
  --uri="https://<cloud-run-url>/post-serp-tasks" \
  --http-method=POST

gcloud scheduler jobs create http serp-fetch-halfhourly \
  --schedule="*/30 * * * *" \
  --uri="https://<cloud-run-url>/fetch-serp-results" \
  --http-method=POST
```

## 8) Schedule monthly search volume refresh

- Monthly trigger: `POST /post-search-volume-tasks`
- Later trigger: `POST /fetch-search-volume-results`

```bash
gcloud scheduler jobs create http volume-post-monthly \
  --schedule="0 4 1 * *" \
  --uri="https://<cloud-run-url>/post-search-volume-tasks" \
  --http-method=POST

gcloud scheduler jobs create http volume-fetch-daily \
  --schedule="0 5 * * *" \
  --uri="https://<cloud-run-url>/fetch-search-volume-results" \
  --http-method=POST
```
