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

- `GCP_PROJECT_ID=xxx`
- `BIGQUERY_DATASET=xxx`
- `BIGQUERY_LOCATION=EU`
- `LOCATION_CODE=2348`
- `LANGUAGE_CODE=hu`
- `SERP_DEVICES=desktop,mobile`
- `DATAFORSEO_LOGIN=...`
- `DATAFORSEO_PASSWORD=...`
- `TARGET_DOMAIN=default.com`

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
  --set-env-vars GCP_PROJECT_ID=xxx,BIGQUERY_DATASET=xxx,BIGQUERY_LOCATION=EU,LOCATION_CODE=2348,LANGUAGE_CODE=hu,SERP_DEVICES=desktop,mobile,TARGET_DOMAIN=default.hu \
  --set-secrets DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest
```

## Scheduler URLs

Use Cloud Scheduler HTTP jobs against the deployed Cloud Run base URL:

- `POST https://<cloud-run-url>/post-serp-tasks`
- `POST https://<cloud-run-url>/fetch-serp-results`
- `POST https://<cloud-run-url>/post-search-volume-tasks`
- `POST https://<cloud-run-url>/fetch-search-volume-results`
