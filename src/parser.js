const { extractDomainFromUrl } = require('./domain');

function parseSerpItems({ taskId, runId, keyword, device, targetDomain, resultItems }) {
  const items = [];
  const aiOverviews = [];
  const aiSources = [];

  for (const item of resultItems || []) {
    const itemType = item.type || 'unknown';
    const rankAbsolute = item.rank_absolute || null;
    const url = item.url || null;
    const domain = extractDomainFromUrl(url);
    const isTargetDomain = domain === targetDomain;

    const parsed = {
      run_id: runId,
      task_id: taskId,
      keyword,
      device,
      item_type: itemType,
      rank_absolute: rankAbsolute,
      rank_group: item.rank_group || null,
      title: item.title || null,
      url,
      domain,
      is_target_domain: isTargetDomain,
      is_organic_top20: itemType === 'organic' && rankAbsolute && rankAbsolute <= 20,
      raw_item: JSON.stringify(item),
      fetched_at: new Date().toISOString(),
    };

    items.push(parsed);

    if (itemType === 'ai_overview') {
      const overviewId = `${taskId}:${item.position || 0}`;
      aiOverviews.push({
        overview_id: overviewId,
        run_id: runId,
        task_id: taskId,
        keyword,
        device,
        text: item.description || item.text || null,
        raw_item: JSON.stringify(item),
        fetched_at: new Date().toISOString(),
      });

      const refs = item.references || item.items || [];
      refs.forEach((ref, index) => {
        aiSources.push({
          overview_id: overviewId,
          source_order: index + 1,
          source_title: ref.title || null,
          source_url: ref.url || null,
          source_domain: extractDomainFromUrl(ref.url || ''),
          raw_source: JSON.stringify(ref),
          fetched_at: new Date().toISOString(),
        });
      });
    }
  }

  return { items, aiOverviews, aiSources };
}

module.exports = { parseSerpItems };
