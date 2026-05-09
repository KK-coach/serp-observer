function normalizeDomain(input) {
  if (!input) return null;
  const cleaned = input.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
  return cleaned.split('/')[0] || null;
}

function extractDomainFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return normalizeDomain(u.hostname);
  } catch (err) {
    return normalizeDomain(url);
  }
}

module.exports = { normalizeDomain, extractDomainFromUrl };
