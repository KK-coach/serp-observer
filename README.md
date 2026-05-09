# Agrobook SERP Monitor (Cloud Functions v2 + BigQuery)

Node.js 22 backend for SERP monitoring MVP using DataForSEO Standard Queue APIs and BigQuery.

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

- `GOOGLE_CLOUD_PROJECT=agrobook-serp-monitor`
- `BQ_DATASET=agrobook_serp_monitor`
- `DATAFORSEO_LOGIN=...`
- `DATAFORSEO_PASSWORD=...`
- `TARGET_DOMAIN=agrobook.hu`
- `GOOGLE_LOCATION_NAME=Hungary`
- `GOOGLE_LANGUAGE_NAME=Hungarian`
- `GOOGLE_DOMAIN=google.hu`
- `SERP_DEPTH=20`

> Use Secret Manager for production secrets and map them as env vars in deploy.

## 4) Deploy to Google Cloud Functions v2

Deploy each HTTP function:

```bash
gcloud functions deploy postSerpTasks --gen2 --runtime=nodejs22 --region=europe-west1 --trigger-http --allow-unauthenticated --entry-point=postSerpTasks --set-env-vars=GOOGLE_CLOUD_PROJECT=agrobook-serp-monitor,BQ_DATASET=agrobook_serp_monitor,TARGET_DOMAIN=agrobook.hu,GOOGLE_LOCATION_NAME=Hungary,GOOGLE_LANGUAGE_NAME=Hungarian,GOOGLE_DOMAIN=google.hu,SERP_DEPTH=20 --set-secrets=DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest

gcloud functions deploy fetchSerpResults --gen2 --runtime=nodejs22 --region=europe-west1 --trigger-http --allow-unauthenticated --entry-point=fetchSerpResults --set-env-vars=GOOGLE_CLOUD_PROJECT=agrobook-serp-monitor,BQ_DATASET=agrobook_serp_monitor,TARGET_DOMAIN=agrobook.hu --set-secrets=DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest

gcloud functions deploy postSearchVolumeTasks --gen2 --runtime=nodejs22 --region=europe-west1 --trigger-http --allow-unauthenticated --entry-point=postSearchVolumeTasks --set-env-vars=GOOGLE_CLOUD_PROJECT=agrobook-serp-monitor,BQ_DATASET=agrobook_serp_monitor,GOOGLE_LOCATION_NAME=Hungary,GOOGLE_LANGUAGE_NAME=Hungarian --set-secrets=DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest

gcloud functions deploy fetchSearchVolumeResults --gen2 --runtime=nodejs22 --region=europe-west1 --trigger-http --allow-unauthenticated --entry-point=fetchSearchVolumeResults --set-env-vars=GOOGLE_CLOUD_PROJECT=agrobook-serp-monitor,BQ_DATASET=agrobook_serp_monitor --set-secrets=DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest
```

## 5) Trigger `postSerpTasks`

```bash
curl -X POST "https://<region>-<project>.cloudfunctions.net/postSerpTasks"
```

## 6) Trigger `fetchSerpResults`

```bash
curl -X POST "https://<region>-<project>.cloudfunctions.net/fetchSerpResults"
```

## 7) Schedule weekly SERP monitoring

Use Cloud Scheduler:

1. Weekly cron for `postSerpTasks` (e.g. Monday 06:00 UTC)
2. Frequent follow-up cron for `fetchSerpResults` (e.g. every 30 min)

Example:

```bash
gcloud scheduler jobs create http serp-post-weekly --schedule="0 6 * * 1" --uri="https://<url>/postSerpTasks" --http-method=POST

gcloud scheduler jobs create http serp-fetch-halfhourly --schedule="*/30 * * * *" --uri="https://<url>/fetchSerpResults" --http-method=POST
```

## 8) Schedule monthly search volume refresh

```bash
gcloud scheduler jobs create http volume-post-monthly --schedule="0 4 1 * *" --uri="https://<url>/postSearchVolumeTasks" --http-method=POST

gcloud scheduler jobs create http volume-fetch-daily --schedule="0 5 * * *" --uri="https://<url>/fetchSearchVolumeResults" --http-method=POST
```

## Local testing (Functions Framework)

```bash
npm install
npm run start:post-serp
npm run start:fetch-serp
npm run start:post-volume
npm run start:fetch-volume
```

Then call local endpoints with `curl -X POST http://localhost:<port>`.
