const config = {
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'agrobook-serp-monitor',
  dataset: process.env.BIGQUERY_DATASET || process.env.BQ_DATASET || 'agrobook_serp_monitor',
  bigQueryLocation: process.env.BIGQUERY_LOCATION || 'EU',
  dataforseoLogin: process.env.DATAFORSEO_LOGIN,
  dataforseoPassword: process.env.DATAFORSEO_PASSWORD,
  targetDomain: (process.env.TARGET_DOMAIN || 'agrobook.hu').toLowerCase(),
  googleDomain: process.env.GOOGLE_DOMAIN || 'google.hu',
  locationCode: Number(process.env.LOCATION_CODE || 2348),
  languageCode: process.env.LANGUAGE_CODE || 'hu',
  serpDepth: Number(process.env.SERP_DEPTH || 20),
  devices: (process.env.SERP_DEVICES || 'desktop,mobile').split(',').map((d) => d.trim()).filter(Boolean),
  maxTasksPerPost: Number(process.env.MAX_TASKS_PER_POST || 100),
};

function validateConfig() {
  const missing = [];
  if (!config.dataforseoLogin) missing.push('DATAFORSEO_LOGIN');
  if (!config.dataforseoPassword) missing.push('DATAFORSEO_PASSWORD');
  if (!config.projectId) missing.push('GCP_PROJECT_ID');
  if (!config.dataset) missing.push('BIGQUERY_DATASET');

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
