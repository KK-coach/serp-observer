# SERP Monitor Backend (Cloud Run + Express)

Reusable SERP monitoring backend for any website/project.

It posts SERP tasks to DataForSEO, stores task metadata in BigQuery, fetches completed SERP results, parses organic and AI Overview data, and persists normalized output for analysis.

## Endpoints

- `GET /health`
- `POST /post-serp-tasks` ⚠️ creates paid DataForSEO tasks
- `POST /fetch-serp-results`
- `POST /post-search-volume-tasks`
- `POST /fetch-search-volume-results`

## Required environment variables

- `GCP_PROJECT_ID`
- `BIGQUERY_DATASET`
- `BIGQUERY_LOCATION` (default `EU`)
- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`

## Optional environment variables (with defaults)

- `LOCATION_CODE=2348`
- `LANGUAGE_CODE=hu`
- `SERP_DEVICES=desktop,mobile`
- `SERP_DEPTH=20`
- `LOAD_ASYNC_AI_OVERVIEW=false`
- `FETCH_BATCH_LIMIT=50`
- `MAX_SERP_TASKS_PER_RUN=300`
- `ALLOW_REPEAT_SERP_POSTS=false`

## Configure for any website/project

1. Insert keywords into `keyword_targets`.
2. Insert tracked domains into `tracked_domains` (example: `example.com`).
3. Deploy with your own project and dataset values.

Example keywords:
- `example product keyword`
- `example service keyword`

## BigQuery schema

Use `sql/schema.sql` and replace placeholders:
- `YOUR_PROJECT_ID`
- `YOUR_DATASET_ID`

Core tables:
- `keyword_targets`
- `tracked_domains`
- `serp_runs`
- `api_tasks`
- `serp_items`
- `serp_ai_overviews`
- `serp_ai_overview_sources`
- `serp_domain_snapshot`
- `domain_positions`
- `keyword_metrics_monthly`

Optional view:
- `sql/ai_overview_views.sql` → `v_ai_overview_presence`

## Add keywords and tracked domains

```sql
INSERT INTO `YOUR_PROJECT_ID.YOUR_DATASET_ID.keyword_targets` (keyword, is_active)
VALUES ('example product keyword', TRUE), ('example service keyword', TRUE);

INSERT INTO `YOUR_PROJECT_ID.YOUR_DATASET_ID.tracked_domains` (domain, is_active)
VALUES ('example.com', TRUE);
```

## Run locally

```bash
npm install
npm start
```

## Deploy to Cloud Run

```bash
gcloud run deploy serp-monitor \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=your-gcp-project-id,BIGQUERY_DATASET=serp_monitor,BIGQUERY_LOCATION=EU,LOCATION_CODE=2348,LANGUAGE_CODE=hu,SERP_DEVICES=desktop,mobile,SERP_DEPTH=20,LOAD_ASYNC_AI_OVERVIEW=false,FETCH_BATCH_LIMIT=50,MAX_SERP_TASKS_PER_RUN=300,ALLOW_REPEAT_SERP_POSTS=false \
  --set-secrets DATAFORSEO_LOGIN=DATAFORSEO_LOGIN:latest,DATAFORSEO_PASSWORD=DATAFORSEO_PASSWORD:latest
```

## Cloud Scheduler setup

Create HTTP jobs against your Cloud Run base URL:
- `POST /post-serp-tasks` (e.g. weekly)
- `POST /fetch-serp-results` (e.g. every 15-30 min)
- `POST /post-search-volume-tasks` (e.g. monthly)
- `POST /fetch-search-volume-results` (e.g. daily)

## AI Overview loading (optional)

If `LOAD_ASYNC_AI_OVERVIEW=true`, task payloads include `load_async_ai_overview: true`.

This can increase DataForSEO cost. Recommended rollout:
1. test 10–20 keywords,
2. use one device first,
3. expand only if results are useful.

## Cost safety notes

- `/post-serp-tasks` and `/post-search-volume-tasks` create paid API tasks.
- Use `MAX_SERP_TASKS_PER_RUN` and narrow `SERP_DEVICES` while validating.

## Migration note

Existing deployments must explicitly set:
- `GCP_PROJECT_ID`
- `BIGQUERY_DATASET`
- `BIGQUERY_LOCATION`
