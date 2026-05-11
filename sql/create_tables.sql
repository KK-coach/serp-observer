CREATE SCHEMA IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor` OPTIONS(location="EU");

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.keyword_targets` (
  keyword STRING NOT NULL,
  is_active BOOL NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.tracked_domains` (
  domain STRING NOT NULL,
  is_active BOOL NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.serp_runs` (
  run_id STRING NOT NULL,
  run_type STRING,
  status STRING,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.api_tasks` (
  run_id STRING,
  task_id STRING NOT NULL,
  task_type STRING NOT NULL,
  keyword STRING,
  device STRING,
  status STRING,
  posted_at TIMESTAMP,
  fetched_at TIMESTAMP,
  created_at TIMESTAMP,
  http_code INT64,
  error_message STRING
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.serp_items` (
  run_id STRING,
  task_id STRING,
  keyword STRING,
  device STRING,
  item_type STRING,
  rank_absolute INT64,
  rank_group INT64,
  title STRING,
  url STRING,
  domain STRING,
  is_target_domain BOOL,
  is_organic_top20 BOOL,
  raw_item JSON,
  fetched_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.serp_domain_snapshot` (
  run_id STRING,
  task_id STRING,
  keyword STRING,
  device STRING,
  domain STRING,
  appearances INT64,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.domain_positions` (
  run_id STRING,
  task_id STRING,
  keyword STRING,
  device STRING,
  domain STRING,
  rank_absolute INT64,
  url STRING,
  is_target_domain BOOL,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.serp_ai_overviews` (
  overview_id STRING,
  run_id STRING,
  task_id STRING,
  keyword STRING,
  device STRING,
  text STRING,
  raw_item JSON,
  fetched_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.serp_ai_overview_sources` (
  overview_id STRING,
  source_order INT64,
  source_title STRING,
  source_url STRING,
  source_domain STRING,
  is_target_domain BOOL,
  raw_source JSON,
  fetched_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `agrobook-serp-monitor.agrobook_serp_monitor.keyword_metrics_monthly` (
  keyword STRING,
  year INT64,
  month INT64,
  search_volume INT64,
  cpc FLOAT64,
  competition STRING,
  competition_index INT64,
  monthly_searches JSON,
  created_at TIMESTAMP
);
