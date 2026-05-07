const express = require('express');
const handlers = require('./src/handlers');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'serp-monitor',
    timestamp: new Date().toISOString(),
  });
});

app.post('/post-serp-tasks', handlers.postSerpTasks);
app.post('/fetch-serp-results', handlers.fetchSerpResults);
app.post('/post-search-volume-tasks', handlers.postSearchVolumeTasks);
app.post('/fetch-search-volume-results', handlers.fetchSearchVolumeResults);

app.use((err, req, res, next) => {
  console.error('Unhandled server error', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`serp-monitor listening on ${port}`);
});
