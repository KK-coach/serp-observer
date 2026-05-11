const { extractDomainFromUrl, normalizeDomain } = require('./domain');

function getAiOverviewText(item) {
  if (item.markdown) return item.markdown;
  if (item.text) return item.text;
  if (item.description) return item.description;

  const nestedItems = Array.isArray(item.items) ? item.items : [];
  const nestedMarkdown = nestedItems.map((x) => x?.markdown).filter(Boolean);
  if (nestedMarkdown.length) return nestedMarkdown.join('\n\n');

  const nestedText = nestedItems.map((x) => x?.text).filter(Boolean);
  if (nestedText.length) return nestedText.join('\n\n');

  return null;
}

function sourceFromValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'object') return [value];
  return [];
}

function getAiOverviewSources(item) {
  const sources = [
    ...sourceFromValue(item.references),
    ...sourceFromValue(item.sources),
    ...sourceFromValue(item.links),
  ];

  const nestedItems = Array.isArray(item.items) ? item.items : [];
  for (const nested of nestedItems) {
    sources.push(...sourceFromValue(nested?.references));
    sources.push(...sourceFromValue(nested?.sources));
    sources.push(...sourceFromValue(nested?.links));
  }

  return sources;
}

function parseSerpItems({ taskId, runId, keyword, device, trackedDomains = [], resultItems }) {
  const items = [];
  const aiOverviews = [];
  const aiSources = [];
  const trackedDomainSet = new Set((trackedDomains || []).map((d) => normalizeDomain(d)).filter(Boolean));

  for (const item of resultItems || []) {
    const itemType = item.type || item.item_type || 'unknown';
    const rankAbsolute = item.rank_absolute || null;
    const url = item.url || null;
    const domain = extractDomainFromUrl(url);
    const isTargetDomain = Boolean(domain && trackedDomainSet.has(domain));

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
      const overviewId = `${taskId}:${item.position || item.rank_group || 0}`;
      aiOverviews.push({
        overview_id: overviewId,
        run_id: runId,
        task_id: taskId,
        keyword,
        device,
        text: getAiOverviewText(item),
        raw_item: JSON.stringify(item),
        fetched_at: new Date().toISOString(),
      });

      const extractedSources = getAiOverviewSources(item);
      extractedSources.forEach((source, index) => {
        const sourceUrl = source?.url || source?.link || source?.source_url || null;
        const sourceTitle = source?.title || source?.text || source?.name || null;
        const sourceDomain = extractDomainFromUrl(sourceUrl);

        aiSources.push({
          overview_id: overviewId,
          source_order: index + 1,
          source_title: sourceTitle,
          source_url: sourceUrl,
          source_domain: sourceDomain,
          is_target_domain: Boolean(sourceDomain && trackedDomainSet.has(sourceDomain)),
          raw_source: JSON.stringify(source),
          fetched_at: new Date().toISOString(),
        });
      });
    }
  }

  return { items, aiOverviews, aiSources };
}

module.exports = { parseSerpItems };
