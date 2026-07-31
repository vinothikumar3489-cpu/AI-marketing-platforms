const SEMRUSH_KEY = process.env.SEMRUSH_API_KEY;
const SEMRUSH_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEMRUSH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Semrush API responded with HTTP ${response.status}`);
    }
    const text = await response.text();
    return { status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function parseSemrushRows(text) {
  // Semrush returns newline-separated rows; first line is the header,
  // rows are pipe-separated by default unless 'export_columns' specified.
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const isCsv = lines[0].includes(",") && !lines[0].includes("|");
  const parseLine = (line) => isCsv ? line.split(",") : line.split("|");
  const header = parseLine(lines[0]).map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const cells = parseLine(line).map(c => c.replace(/"/g, "").trim());
    const row = {};
    header.forEach((col, i) => { row[col] = cells[i] !== undefined ? cells[i] : null; });
    return row;
  });
}

export async function fetchSemrushData(domain) {
  if (!SEMRUSH_KEY) return null;
  if (!domain) return null;

  try {
    // Documented Semrush API (api.semrush.com): domain organic keywords report.
    const url = "https://api.semrush.com/?"
      + `type=domain_organic`
      + `&key=${encodeURIComponent(SEMRUSH_KEY)}`
      + `&domain=${encodeURIComponent(domain)}`
      + `&display_limit=10`
      + `&export_columns=Ph,Nq,Cp,Co,Np,Po`;
    const { text } = await fetchWithTimeout(url);
    const rows = parseSemrushRows(text);

    const keywords = rows.map(r => ({
      keyword: r.Ph || r.Keyword || null,
      volume: r.Nq != null ? Number(r.Nq) || null : null,
      cpc: r.Cp != null ? Number(r.Cp) || null : null,
      competition: r.Co != null ? Number(r.Co) || null : null,
      difficulty: r.Np != null ? Number(r.Np) || null : null,
      position: r.Po != null ? Number(r.Po) || null : null,
    })).filter(k => k.keyword);

    return {
      provider: 'semrush',
      domain,
      keywords,
      totalKeywords: keywords.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Semrush] fetch error:", err.message);
    return null;
  }
}

export default { fetchSemrushData };
