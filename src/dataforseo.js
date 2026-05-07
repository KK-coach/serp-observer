const axios = require('axios');
const { config } = require('./config');

const client = axios.create({
  baseURL: 'https://api.dataforseo.com/v3',
  auth: {
    username: config.dataforseoLogin,
    password: config.dataforseoPassword,
  },
  timeout: 60000,
});

async function postSerpTasks(tasks) {
  // Endpoint: POST /v3/serp/google/organic/task_post
  const res = await client.post('/serp/google/organic/task_post', tasks);
  return res.data;
}

async function getSerpTaskResult(taskId) {
  // Endpoint: GET /v3/serp/google/organic/task_get/advanced/{task_id}
  const res = await client.get(`/serp/google/organic/task_get/advanced/${taskId}`);
  return res.data;
}

async function postSearchVolumeTask(taskPayload) {
  // Endpoint: POST /v3/keywords_data/google_ads/search_volume/task_post
  const res = await client.post('/keywords_data/google_ads/search_volume/task_post', taskPayload);
  return res.data;
}

async function getSearchVolumeTaskResult(taskId) {
  // Endpoint: GET /v3/keywords_data/google_ads/search_volume/task_get/{task_id}
  const res = await client.get(`/keywords_data/google_ads/search_volume/task_get/${taskId}`);
  return res.data;
}

module.exports = {
  postSerpTasks,
  getSerpTaskResult,
  postSearchVolumeTask,
  getSearchVolumeTaskResult,
};
