const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'agrobook-serp-monitor',
  dataset: process.env.BQ_DATASET || 'agrobook_serp_monitor',
  dataforseoLogin: process.env.DATAFORSEO_LOGIN,
  dataforseoPassword: process.env.DATAFORSEO_PASSWORD,
  targetDomain: (process.env.TARGET_DOMAIN || 'agrobook.hu').toLowerCase(),
  googleLocationName: process.env.GOOGLE_LOCATION_NAME || 'Hungary',
  googleLanguageName: process.env.GOOGLE_LANGUAGE_NAME || 'Hungarian',
  googleDomain: process.env.GOOGLE_DOMAIN || 'google.hu',
  serpDepth: Number(process.env.SERP_DEPTH || 20),
  maxTasksPerPost: Number(process.env.MAX_TASKS_PER_POST || 100),
};

function validateConfig() {
  const missing = [];
  if (!config.dataforseoLogin) missing.push('DATAFORSEO_LOGIN');
  if (!config.dataforseoPassword) missing.push('DATAFORSEO_PASSWORD');

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
