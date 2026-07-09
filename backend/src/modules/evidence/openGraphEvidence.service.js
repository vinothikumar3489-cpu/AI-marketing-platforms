export async function collectOpenGraphEvidence($, websiteUrl) {
  const result = {
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogType: null,
    twitterTitle: null,
    twitterDescription: null,
    twitterImage: null,
    canonicalUrl: null,
    metaDescription: null,
  };

  try {
    result.ogTitle = $('meta[property="og:title"]').attr('content') || null;
    result.ogDescription = $('meta[property="og:description"]').attr('content') || null;
    result.ogImage = $('meta[property="og:image"]').attr('content') || null;
    result.ogType = $('meta[property="og:type"]').attr('content') || null;
    result.twitterTitle = $('meta[name="twitter:title"]').attr('content') || null;
    result.twitterDescription = $('meta[name="twitter:description"]').attr('content') || null;
    result.twitterImage = $('meta[name="twitter:image"]').attr('content') || null;
    result.canonicalUrl = $('link[rel="canonical"]').attr('href') || null;
    result.metaDescription = $('meta[name="description"]').attr('content') || null;
  } catch {
    // Silently handle — return nulls
  }

  return result;
}
