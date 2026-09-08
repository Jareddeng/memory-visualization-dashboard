import rules from './intel-duplicate-rules.mjs';
// Shared by ingestion, generation and the browser. A shared URL alone is not a duplicate.
const aliases = new Map(rules.flatMap(rule => rule.duplicates.map(id => [id, rule.keep])));
const canonicalId = id => aliases.get(id) || id;
export function validIntelUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function intelUrlKey(value) {
  const valid = validIntelUrl(value);
  if (!valid) return '';
  const url = new URL(valid);
  url.protocol = 'https:';
  url.hostname = url.hostname.replace(/^www\./, '');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  return url.href;
}
export function isArticleUrl(value) {
  const valid = validIntelUrl(value);
  if (!valid) return false;
  const url = new URL(valid);
  return url.pathname !== '/' && !/\/tag\/|\/topic\/|\/subject\/|realtimenews|\/quote\/[^/]+\/?$|\/articles\/1234567/.test(url.pathname) && !/(^|\.)example\.(com|org|net)$/.test(url.hostname);
}
export function assertUniqueIntelUrls(records) {
  const seen = new Map();
  for (const record of records) {
    if (!isArticleUrl(record.url)) throw new Error(`情报缺少文章详情链接: ${record.id}`);
    const key = intelUrlKey(record.url);
    if (seen.has(key)) throw new Error(`情报 URL 重复，须核对原文后合并或纠正，不能清空链接: ${seen.get(key)} / ${record.id}`);
    seen.set(key, record.id);
  }
}
const textKey = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
export function sameIntel(a, b) {
  if (a.id && canonicalId(a.id) === canonicalId(b.id)) return true;
  // Preserve updates on different dates and distinct facts reported in the same article.
  return Boolean(a.date && a.date === b.date && textKey(a.title) &&
    textKey(a.title) === textKey(b.title) && textKey(a.summary) === textKey(b.summary));
}

export function dedupeIntel(records) {
  const result = [];
  // Canonical records have been manually selected for completeness.
  const ordered = [...records.filter(r => !aliases.has(r.id)), ...records.filter(r => aliases.has(r.id))];
  for (const record of ordered) {
    const existing = result.find(item => sameIntel(item, record));
    if (!existing) result.push({ ...record, url: validIntelUrl(record.url) });
    else {
      for (const [key, value] of Object.entries(record)) {
        if ((existing[key] == null || existing[key] === '') && value != null) existing[key] = value;
      }
      existing.url = validIntelUrl(existing.url) || validIntelUrl(record.url);
    }
  }
  return result;
}

export function mergeIntel(remote, local) {
  const overrides = new Map(local.map(record => [record.id, record]));
  const merged = remote.map(record => {
    const override = overrides.get(record.id);
    return override ? { ...record, ...override, url: validIntelUrl(override.url) || validIntelUrl(record.url) } : record;
  });
  return dedupeIntel([...merged, ...local.filter(record => !remote.some(item => item.id === record.id))]);
}
