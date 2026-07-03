function scoreAuthority(url) {
  if (!url) return 30;
  if (url.includes("wikipedia.org")) return 95;
  if (url.includes("gov") || url.includes(".edu")) return 90;
  if (url.includes("medium.com") || url.includes("blog")) return 50;
  if (url.includes("press")) return 60;
  return 50;
}

function scoreRecency(publishedDate) {
  if (!publishedDate) return 40;
  try {
    const d = new Date(publishedDate);
    const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 30) return 90;
    if (days < 180) return 70;
    if (days < 365) return 50;
    return 30;
  } catch {
    return 40;
  }
}

export function normalizeEvidence(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 50)
    .map((it, idx) => {
      const sourceUrl = it.sourceUrl || it.url || it.link || null;
      const title = it.title || it.name || (it.content || "").slice(0, 120) || `source-${idx}`;
      const snippet = (it.snippet || (it.content || "")).slice(0, 400);
      const publishedDate = it.publishedDate || it.date || null;
      const authorityScore = scoreAuthority(sourceUrl);
      const recencyScore = scoreRecency(publishedDate);
      return {
        evidenceId: it.id || `ev_${idx}_${Date.now().toString().slice(-5)}`,
        sourceUrl,
        sourceType: it.sourceType || "research",
        title,
        snippet,
        content: (it.content || it.raw || snippet || "").slice(0, 3000),
        publishedDate,
        authorityScore,
        recencyScore,
      };
    })
    .filter(Boolean);
}
