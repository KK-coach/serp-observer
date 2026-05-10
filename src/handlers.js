const { config, validateConfig } = require('./config');
const bq = require('./bigquery');
const d4s = require('./dataforseo');
const { parseSerpItems } = require('./parser');

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildSerpTask(keyword, device) {
  return {
    keyword,
    location_code: config.locationCode,
    language_code: config.languageCode,
    device,
    os: device === 'mobile' ? 'android' : 'windows',
    depth: config.serpDepth,
  };
}

async function postSerpTasks(req, res) {
  try {
    console.log('POST SERP TASKS HANDLER ACTIVE');
    validateConfig();

    console.log(`resolved GCP_PROJECT_ID: ${config.projectId}`);
    console.log(`resolved BIGQUERY_DATASET: ${config.dataset}`);
    console.log(`resolved BIGQUERY_LOCATION: ${config.bigQueryLocation}`);

    const keywords = await bq.getActiveKeywords();
    const trackedDomains = await bq.getTrackedDomains();

    console.log(`active keyword count: ${keywords.length}`);
    console.log(`active tracked domain count: ${trackedDomains.length}`);
    console.log(`devices: ${JSON.stringify(config.serpDevices)}`);

    if (!keywords.length) return res.status(200).json({ message: 'No active keywords found' });

    const runId = await bq.createSerpRun({ run_type: 'weekly_serp', status: 'posted' });
    const taskPayload = [];

    for (const row of keywords) {
      for (const device of config.serpDevices) {
        taskPayload.push(buildSerpTask(row.keyword, device));
      }
    }

    console.log(`generated payload count: ${taskPayload.length}`);

    let totalPosted = 0;
    for (const chunk of chunkArray(taskPayload, config.maxTasksPerPost)) {
      const response = await d4s.postSerpTasks(chunk);
      const responseTasks = response.tasks || [];
      console.log(`DataForSEO top-level status_code: ${response.status_code}`);
      console.log(`DataForSEO top-level status_message: ${response.status_message}`);
      console.log(`DataForSEO response count: ${responseTasks.length}`);

      const firstTask = responseTasks[0] || null;
      if (firstTask) {
        console.log(`first task id: ${firstTask.id || null}`);
        console.log(`first task status_code: ${firstTask.status_code || null}`);
        console.log(`first task status_message: ${firstTask.status_message || null}`);
        console.log(`first task has result: ${Boolean(firstTask.result)}`);
        console.log(`first task keys: ${JSON.stringify(Object.keys(firstTask))}`);
      }

      const apiRows = responseTasks
        .map((task, index) => {
          const payload = chunk[index] || {};
          const statusCode = Number(task.status_code || 0);
          const isAccepted = statusCode >= 20000 && statusCode < 30000;

          if (!task.id) return null;
          if (!isAccepted) {
            console.warn(
              `Unaccepted DataForSEO task status_code=${task.status_code} status_message=${task.status_message}`,
            );
          }

          return {
        run_id: runId,
        task_id: task.id,
        task_type: 'serp',
        keyword: payload.keyword || task.data?.keyword || null,
        device: payload.device || task.data?.device || null,
        status: isAccepted ? 'posted' : 'failed',
        posted_at: new Date().toISOString(),
        fetched_at: null,
        created_at: new Date().toISOString(),
        http_code: task.status_code || null,
        error_message: isAccepted ? null : (task.status_message || 'Task post not accepted'),
          };
        })
        .filter(Boolean);

      await bq.insertApiTasks(apiRows);
      console.log(`inserted api_tasks count: ${apiRows.length}`);
      totalPosted += apiRows.length;
    }

    console.log(`final posted count: ${totalPosted}`);
    return res.status(200).json({ runId, totalPosted });
  } catch (err) {
    console.error('postSerpTasks failed', err);
    return res.status(500).json({ error: err.message });
  }
}

async function fetchSerpResults(req, res) {
  try {
    validateConfig();
    const tasks = await bq.getPendingApiTasks('serp');
    const trackedDomains = await bq.getTrackedDomains();

    let completed = 0;
    for (const task of tasks) {
      try {
        const data = await d4s.getSerpTaskResult(task.task_id);
        const wrapperTask = (data.tasks || [])[0];
        const result = (wrapperTask?.result || [])[0];
        const items = result?.items || [];

        const parsed = parseSerpItems({
          taskId: task.task_id,
          runId: task.run_id,
          keyword: task.keyword,
          device: task.device,
          targetDomain: config.targetDomain,
          resultItems: items,
        });

        await bq.insertSerpItems(parsed.items);
        await bq.insertAiOverviews(parsed.aiOverviews);
        await bq.insertAiSources(parsed.aiSources);

        const domainSnapshotMap = new Map();
        for (const row of parsed.items) {
          if (!row.domain) continue;
          domainSnapshotMap.set(row.domain, (domainSnapshotMap.get(row.domain) || 0) + 1);
        }

        const snapshotRows = [...domainSnapshotMap.entries()].map(([domain, appearances]) => ({
          run_id: task.run_id,
          task_id: task.task_id,
          keyword: task.keyword,
          device: task.device,
          domain,
          appearances,
          created_at: new Date().toISOString(),
        }));

        const domainPositionRows = parsed.items
          .filter((r) => r.item_type === 'organic' && r.rank_absolute && r.rank_absolute <= 20)
          .filter((r) => r.domain === config.targetDomain || trackedDomains.includes(r.domain))
          .map((r) => ({
            run_id: r.run_id,
            task_id: r.task_id,
            keyword: r.keyword,
            device: r.device,
            domain: r.domain,
            rank_absolute: r.rank_absolute,
            url: r.url,
            is_target_domain: r.is_target_domain,
            created_at: new Date().toISOString(),
          }));

        await bq.insertDomainSnapshots(snapshotRows);
        await bq.insertDomainPositions(domainPositionRows);

        await bq.markApiTaskCompleted(task.task_id, { http_code: wrapperTask?.status_code || null });
        completed += 1;
      } catch (taskErr) {
        console.error(`Failed task ${task.task_id}`, taskErr.message);
        await bq.markApiTaskFailed(task.task_id, taskErr.message);
      }
    }

    return res.status(200).json({ processed: tasks.length, completed });
  } catch (err) {
    console.error('fetchSerpResults failed', err);
    return res.status(500).json({ error: err.message });
  }
}

async function postSearchVolumeTasks(req, res) {
  try {
    validateConfig();
    const keywords = (await bq.getActiveKeywords()).map((r) => r.keyword).slice(0, 1000);
    if (!keywords.length) return res.status(200).json({ message: 'No active keywords found' });

    const payload = [{
      location_code: config.locationCode,
      language_code: config.languageCode,
      keywords,
    }];

    const response = await d4s.postSearchVolumeTask(payload);
    const taskObj = (response.tasks || [])[0]?.result?.[0];

    await bq.insertApiTasks([{
      run_id: null,
      task_id: taskObj?.id,
      task_type: 'search_volume',
      keyword: null,
      device: null,
      status: 'posted',
      posted_at: new Date().toISOString(),
      fetched_at: null,
      created_at: new Date().toISOString(),
      http_code: taskObj?.status_code || null,
      error_message: null,
    }]);

    return res.status(200).json({ taskId: taskObj?.id, keywordCount: keywords.length });
  } catch (err) {
    console.error('postSearchVolumeTasks failed', err);
    return res.status(500).json({ error: err.message });
  }
}

async function fetchSearchVolumeResults(req, res) {
  try {
    validateConfig();
    const tasks = await bq.getPendingApiTasks('search_volume');
    let completed = 0;

    for (const task of tasks) {
      try {
        const data = await d4s.getSearchVolumeTaskResult(task.task_id);
        const payload = (data.tasks || [])[0];
        const result = (payload?.result || [])[0];
        const rows = (result?.items || []).map((item) => ({
          keyword: item.keyword,
          year: item.year || null,
          month: item.month || null,
          search_volume: item.search_volume || null,
          cpc: item.cpc || null,
          competition: item.competition || null,
          competition_index: item.competition_index || null,
          monthly_searches: JSON.stringify(item.monthly_searches || []),
          created_at: new Date().toISOString(),
        }));

        await bq.insertKeywordMetrics(rows);
        await bq.markApiTaskCompleted(task.task_id, { http_code: payload?.status_code || null });
        completed += 1;
      } catch (taskErr) {
        console.error(`Failed volume task ${task.task_id}`, taskErr.message);
        await bq.markApiTaskFailed(task.task_id, taskErr.message);
      }
    }

    return res.status(200).json({ processed: tasks.length, completed });
  } catch (err) {
    console.error('fetchSearchVolumeResults failed', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { postSerpTasks, fetchSerpResults, postSearchVolumeTasks, fetchSearchVolumeResults };
