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
    se_domain: config.googleDomain,
  };
}

async function postSerpTasks(req, res) {
  try {
    validateConfig();
    const keywords = await bq.loadActiveKeywords();
    const trackedDomains = await bq.loadTrackedDomains();

    console.log(`[postSerpTasks] resolved GCP_PROJECT_ID=${config.projectId}`);
    console.log(`[postSerpTasks] resolved BIGQUERY_DATASET=${config.dataset}`);
    console.log(`[postSerpTasks] resolved BIGQUERY_LOCATION=${config.bigQueryLocation}`);
    console.log(`[postSerpTasks] active keyword count=${keywords.length}`);
    console.log(`[postSerpTasks] active tracked domain count=${trackedDomains.length}`);
    if (!keywords.length) return res.status(200).json({ message: 'No active keywords found' });

    const runId = await bq.createSerpRun({ run_type: 'weekly_serp', status: 'posted' });
    const taskPayload = [];

    console.log(`[postSerpTasks] devices used=${config.devices.join(',')}`);
    for (const row of keywords) {
      for (const device of config.devices) {
        taskPayload.push(buildSerpTask(row.keyword, device));
      }
    }
    console.log(`[postSerpTasks] generated task payload count=${taskPayload.length}`);

    let totalPosted = 0;
    for (const chunk of chunkArray(taskPayload, config.maxTasksPerPost)) {
      const response = await d4s.postSerpTasks(chunk);
      const postedTasks = response.tasks || [];
      console.log(`[postSerpTasks] DataForSEO post response count=${postedTasks.length}`);
      const apiRows = postedTasks.map((t) => ({
        run_id: runId,
        task_id: t.id,
        task_type: 'serp_organic_advanced',
        keyword: t.data?.keyword || null,
        device: t.data?.device || null,
        status: 'posted',
        posted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        http_code: t.status_code || null,
      }));
      await bq.insertApiTasks(apiRows);
      console.log(`[postSerpTasks] inserted api_tasks row count=${apiRows.length}`);
      totalPosted += apiRows.length;
    }

    console.log(`postSerpTasks run_id=${runId} posted=${totalPosted}`);
    return res.status(200).json({ runId, totalPosted });
  } catch (err) {
    console.error('postSerpTasks failed', err);
    return res.status(500).json({ error: err.message });
  }
}

async function fetchSerpResults(req, res) {
  try {
    validateConfig();
    const tasks = await bq.getPendingApiTasks('serp_organic_advanced');
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
          .filter(r => r.item_type === 'organic' && r.rank_absolute && r.rank_absolute <= 20)
          .filter(r => r.domain === config.targetDomain || trackedDomains.includes(r.domain))
          .map(r => ({
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
    const keywords = (await bq.getActiveKeywords()).map(r => r.keyword).slice(0, 1000);
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
      created_at: new Date().toISOString(),
      http_code: taskObj?.status_code || null,
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
        const rows = (result?.items || []).map(item => ({
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
