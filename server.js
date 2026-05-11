const express = require('express');
const {
  postSerpTasks,
  fetchSerpResults,
  postSearchVolumeTasks,
  fetchSearchVolumeResults,
} = require('./src/handlers');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  console.log('ROUTE HIT: GET /health');
  res.status(200).json({ ok: true, service: 'serp-monitor', timestamp: new Date().toISOString() });
});

app.post('/post-serp-tasks', (req, res) => {
  console.log('ROUTE HIT: POST /post-serp-tasks');
  return postSerpTasks(req, res);
});

app.post('/fetch-serp-results', (req, res) => {
  console.log('ROUTE HIT: POST /fetch-serp-results');
  return fetchSerpResults(req, res);
});

app.post('/post-search-volume-tasks', (req, res) => {
  console.log('ROUTE HIT: POST /post-search-volume-tasks');
  return postSearchVolumeTasks(req, res);
});

app.post('/fetch-search-volume-results', (req, res) => {
  console.log('ROUTE HIT: POST /fetch-search-volume-results');
  return fetchSearchVolumeResults(req, res);
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('SERP MONITOR EXPRESS SERVICE BOOTED');
  console.log(`Listening on port ${port}`);
});
