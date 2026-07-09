import { fetchText } from "../../utils/http.util.js";
import { logEvidenceError } from "../../utils/evidence-logger.js";
import { parseString } from "xml2js";

export async function collectSitemapEvidence(websiteUrl) {
  const result = {
    exists: false,
    urlCount: null,
    sampleUrls: [],
    blogUrls: [],
    productUrls: [],
    categoryUrls: [],
    lastmodValues: [],
  };

  try {
    const url = new URL(websiteUrl);
    const sitemapUrl = `${url.protocol}//${url.hostname}/sitemap.xml`;

    const content = await fetchText(sitemapUrl, 10000, 8000);
    if (!content) return result;

    result.exists = true;

    const parsed = await new Promise((resolve, reject) => {
      parseString(content, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    const urlset = parsed?.urlset?.url || [];
    if (urlset.length === 0) return result;

    result.urlCount = urlset.length;

    const urls = [];
    for (const entry of urlset) {
      const loc = entry.loc?.[0] || null;
      const lastmod = entry.lastmod?.[0] || null;
      if (loc) urls.push({ loc, lastmod });
      if (lastmod) result.lastmodValues.push(lastmod);
    }

    result.sampleUrls = urls.slice(0, 10).map(u => u.loc);

    for (const u of urls) {
      const path = new URL(u.loc).pathname.toLowerCase();
      if (path.includes("/blog") || path.includes("/article") || path.includes("/news") || path.includes("/post")) {
        result.blogUrls.push(u.loc);
      } else if (path.includes("/product") || path.includes("/shop") || path.includes("/item") || path.includes("/p/")) {
        result.productUrls.push(u.loc);
      } else if (path.includes("/category") || path.includes("/collection") || path.includes("/browse")) {
        result.categoryUrls.push(u.loc);
      }
    }
  } catch (err) {
    logEvidenceError("sitemapEvidence", websiteUrl, err);
  }

  return result;
}
