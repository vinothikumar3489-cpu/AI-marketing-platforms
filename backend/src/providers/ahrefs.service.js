const AHREFS_KEY = process.env.AHREFS_API_KEY;
const AHREFS_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AHREFS_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${AHREFS_KEY}` },
    });
    if (!response.ok) {
      throw new Error(`Ahrefs API responded with HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAhrefsData(domain) {
  if (!AHREFS_KEY) return null;
  if (!domain) return null;

  try {
    // Documented Ahrefs v3 API: Site Explorer domain overview.
    const params = new URLSearchParams({ target: domain, limit: '5' });
    const data = await fetchWithTimeout(`https://api.ahrefs.com/v3/stats?${params.toString()}`);

    return {
      provider: 'ahrefs',
      domain,
      domainRating: data.domain_rating != null ? Number(data.domain_rating) : null,
      organicTraffic: data.org_keywords != null ? data.org_keywords : null,
      organicKeywords: data.org_keywords != null ? Number(data.org_keywords) || null : null,
      backlinks: data.backlinks != null ? Number(data.backlinks) || null : null,
      referringDomains: data.refdomains != null ? Number(data.refdomains) || null : null,
      topKeyword: data.top_keyword || null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Ahrefs] fetch error:", err.message);
    return null;
  }
}

export default { fetchAhrefsData };
