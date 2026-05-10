const rawLocation = (process.env.BIGQUERY_LOCATION || '').trim();

const config = {
  projectId: (process.env.GCP_PROJECT_ID || '').trim(),
  dataset: (process.env.BIGQUERY_DATASET || '').trim(),
  bigQueryLocation: rawLocation || 'EU',
  dataforseoLogin: process.env.DATAFORSEO_LOGIN,
  dataforseoPassword: process.env.DATAFORSEO_PASSWORD,
  targetDomain: (process.env.TARGET_DOMAIN || 'agrobook.hu').toLowerCase(),
  locationCode: Number(process.env.LOCATION_CODE || 2348),
  languageCode: (process.env.LANGUAGE_CODE || 'hu').trim(),
  serpDepth: Number(process.env.SERP_DEPTH || 20),
  serpDevices: (process.env.SERP_DEVICES || 'desktop,mobile')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  maxTasksPerPost: Number(process.env.MAX_TASKS_PER_POST || 100),
};

function validateConfig() {
  const missing = [];
  if (!config.projectId) missing.push('GCP_PROJECT_ID');
  if (!config.dataset) missing.push('BIGQUERY_DATASET');
  if (!config.dataforseoLogin) missing.push('DATAFORSEO_LOGIN');
  if (!config.dataforseoPassword) missing.push('DATAFORSEO_PASSWORD');

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
