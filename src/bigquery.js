const crypto = require('crypto');
const { BigQuery } = require('@google-cloud/bigquery');
const { config } = require('./config');

const bq = new BigQuery({ projectId: config.projectId });

function table(name) {
  return bq.dataset(config.dataset).table(name);
}

async function loadActiveKeywords() {
  console.log(`[BigQuery] loadActiveKeywords project=${config.projectId} dataset=${config.dataset} location=${config.bigQueryLocation}`);
  const query = `
    SELECT keyword
    FROM \`${config.projectId}.${config.dataset}.keyword_targets\`
    WHERE is_active = TRUE
    ORDER BY keyword
  `;
  const [rows] = await bq.query({ query, location: config.bigQueryLocation });
  console.log(`[BigQuery] loadActiveKeywords count=${rows.length}`);
  return rows;
}

async function loadTrackedDomains() {
  console.log(`[BigQuery] loadTrackedDomains project=${config.projectId} dataset=${config.dataset} location=${config.bigQueryLocation}`);
  const query = `
    SELECT domain
    FROM \`${config.projectId}.${config.dataset}.tracked_domains\`
    WHERE is_active = TRUE
    ORDER BY domain
  `;
  const [rows] = await bq.query({ query, location: config.bigQueryLocation });
  console.log(`[BigQuery] loadTrackedDomains count=${rows.length}`);
  return rows.map((r) => r.domain.toLowerCase());
}

async function createSerpRun(meta) {
  const runId = crypto.randomUUID();
  await table('serp_runs').insert([{ run_id: runId, ...meta, created_at: new Date().toISOString() }]);
  return runId;
}

async function insertApiTasks(rows) { if (rows.length) await table('api_tasks').insert(rows); }
async function insertSerpItems(rows) { if (rows.length) await table('serp_items').insert(rows); }
async function insertAiOverviews(rows) { if (rows.length) await table('serp_ai_overviews').insert(rows); }
async function insertAiSources(rows) { if (rows.length) await table('serp_ai_overview_sources').insert(rows); }
async function insertDomainSnapshots(rows) { if (rows.length) await table('serp_domain_snapshot').insert(rows); }
async function insertDomainPositions(rows) { if (rows.length) await table('domain_positions').insert(rows); }
async function insertKeywordMetrics(rows) { if (rows.length) await table('keyword_metrics_monthly').insert(rows); }

async function getPendingApiTasks(taskType) {
  const query = `
    SELECT *
    FROM \`${config.projectId}.${config.dataset}.api_tasks\`
    WHERE task_type = @taskType AND status IN ('posted','pending')
    ORDER BY created_at
    LIMIT 500
  `;
  const [rows] = await bq.query({ query, params: { taskType }, location: config.bigQueryLocation });
  return rows;
}

async function markApiTaskCompleted(taskId, extra = {}) {
  const query = `
    UPDATE \`${config.projectId}.${config.dataset}.api_tasks\`
    SET status = 'completed', fetched_at = CURRENT_TIMESTAMP(), http_code = @httpCode
    WHERE task_id = @taskId
  `;
  await bq.query({ query, params: { taskId, httpCode: extra.http_code || null }, location: config.bigQueryLocation });
}

async function markApiTaskFailed(taskId, reason) {
  const query = `
    UPDATE \`${config.projectId}.${config.dataset}.api_tasks\`
    SET status = 'failed', error_message = @reason, fetched_at = CURRENT_TIMESTAMP()
    WHERE task_id = @taskId
  `;
  await bq.query({ query, params: { taskId, reason }, location: config.bigQueryLocation });
}

module.exports = {
  getActiveKeywords: loadActiveKeywords,
  getTrackedDomains: loadTrackedDomains,
  loadActiveKeywords,
  loadTrackedDomains,
  createSerpRun,
  insertApiTasks,
  insertSerpItems,
  insertAiOverviews,
  insertAiSources,
  insertDomainSnapshots,
  insertDomainPositions,
  insertKeywordMetrics,
  getPendingApiTasks,
  markApiTaskCompleted,
  markApiTaskFailed,
};
