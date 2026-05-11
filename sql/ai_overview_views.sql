CREATE OR REPLACE VIEW `gen-lang-client-0073794959.agrobook_serp_monitor.v_ai_overview_presence` AS
WITH overview_base AS (
  SELECT
    o.overview_id,
    o.keyword,
    o.device,
    o.text AS ai_overview_text,
    o.fetched_at
  FROM `gen-lang-client-0073794959.agrobook_serp_monitor.serp_ai_overviews` o
),
source_agg AS (
  SELECT
    s.overview_id,
    COUNT(1) AS source_count,
    LOGICAL_OR(COALESCE(s.is_target_domain, FALSE)) AS target_domain_cited,
    ARRAY_TO_STRING(ARRAY_AGG(DISTINCT s.source_domain IGNORE NULLS), ', ') AS source_domains
  FROM `gen-lang-client-0073794959.agrobook_serp_monitor.serp_ai_overview_sources` s
  GROUP BY s.overview_id
)
SELECT
  o.keyword,
  o.device,
  TRUE AS has_ai_overview,
  o.ai_overview_text IS NOT NULL AND LENGTH(TRIM(o.ai_overview_text)) > 0 AS has_ai_overview_text,
  o.ai_overview_text,
  COALESCE(sa.source_count, 0) AS source_count,
  COALESCE(sa.target_domain_cited, FALSE) AS target_domain_cited,
  sa.source_domains,
  o.fetched_at
FROM overview_base o
LEFT JOIN source_agg sa ON sa.overview_id = o.overview_id;
