export function extractJsonLd($) {
  const schemas = [];
  try {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const items = parsed["@graph"] || [parsed];
        for (const item of items) {
          schemas.push({
            type: item["@type"] || null,
            name: item.name || null,
            url: item.url || null,
            description: item.description || null,
          });
        }
      } catch {
        // Skip invalid JSON-LD
      }
    });
  } catch {
    // Silently handle
  }
  return schemas;
}

export function summarizeSchemas(schemas) {
  if (!schemas || schemas.length === 0) return { types: [], count: 0, schemas: [] };

  const typeCounts = {};
  for (const s of schemas) {
    const t = s.type || "Unknown";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const foundTypes = [];
  const priority = ["Organization", "Product", "FAQPage", "Article", "BreadcrumbList", "Review", "AggregateRating"];
  for (const pt of priority) {
    if (typeCounts[pt]) foundTypes.push(pt);
  }
  for (const t of Object.keys(typeCounts)) {
    if (!foundTypes.includes(t)) foundTypes.push(t);
  }

  return {
    types: foundTypes,
    count: schemas.length,
    schemas: schemas.slice(0, 20),
    hasOrganization: !!typeCounts["Organization"],
    hasProduct: !!typeCounts["Product"],
    hasFAQPage: !!typeCounts["FAQPage"],
    hasArticle: !!typeCounts["Article"],
    hasBreadcrumbList: !!typeCounts["BreadcrumbList"],
    hasReview: !!typeCounts["Review"],
    hasAggregateRating: !!typeCounts["AggregateRating"],
  };
}
