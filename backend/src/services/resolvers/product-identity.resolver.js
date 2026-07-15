const GENERIC_LABELS = new Set([
  'new analysis', 'untitled project', 'growth analysis', 'new project',
  'untitled', 'new & featured', 'featured', 'home', 'courses',
  'project', 'analysis', 'my', 'the', 'test', 'demo', 'sample',
  'unknown product', 'product', 'website', 'landing', 'page',
]);

function isGeneric(label) {
  if (!label || typeof label !== 'string') return true;
  const t = label.trim();
  if (t.length < 2) return true;
  return GENERIC_LABELS.has(t.toLowerCase());
}

function extractDomain(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch { return null; }
}

function domainToBrand(domain) {
  if (!domain) return null;
  const parts = domain.split('.');
  if (parts.length < 2) return null;
  const name = parts[0];
  if (!name || name.length < 2 || GENERIC_LABELS.has(name)) return null;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function extractBrandFromTitle(title) {
  if (!title || typeof title !== 'string') return null;
  // Try "Brand: Subtitle" or "Brand - Subtitle" or "Subtitle | Brand"
  const pipe = title.split('|').map(s => s.trim()).filter(Boolean);
  if (pipe.length >= 2) {
    const candidate = pipe[pipe.length - 1];
    if (!isGeneric(candidate)) return candidate;
  }
  const colon = title.split(':').map(s => s.trim()).filter(Boolean);
  if (colon.length >= 2) {
    const candidate = colon[0];
    if (!isGeneric(candidate)) return candidate;
  }
  const dash = title.split('—').map(s => s.trim()).filter(Boolean);
  if (dash.length >= 2) {
    const candidate = dash[dash.length - 1];
    if (!isGeneric(candidate)) return candidate;
  }
  const hyphen = title.split(' - ').map(s => s.trim()).filter(Boolean);
  if (hyphen.length >= 2) {
    const candidate = hyphen[hyphen.length - 1];
    if (!isGeneric(candidate)) return candidate;
  }
  return null;
}

function extractBrandFromStructuredData(data) {
  if (!data || typeof data !== 'object') return null;
  return data.organizationName || data.brandName || data.name || data.productName || null;
}

export function resolveProductIdentity({ chat, productIntelligence, evidenceSnapshot, website }) {
  const projectTitle = chat?.title || 'New Analysis';
  const websiteUrl = chat?.websiteUrl || website?.url || null;
  const domain = extractDomain(websiteUrl);

  let productName = null;
  let brandName = null;
  let companyName = null;
  let source = null;
  let evidenceReference = null;

  // Priority 1: ProductIntelligence explicit brand/product fields
  const pi = productIntelligence;
  const analysis = pi?.productAnalysis || {};

  if (!isGeneric(pi?.productName)) {
    productName = pi.productName; source = 'pi_productName'; evidenceReference = 'ProductIntelligence.productName';
  } else if (!isGeneric(analysis?.productName)) {
    productName = analysis.productName; source = 'pi_analysis_productName'; evidenceReference = 'ProductIntelligence.productAnalysis.productName';
  } else if (!isGeneric(pi?.name)) {
    productName = pi.name; source = 'pi_name'; evidenceReference = 'ProductIntelligence.name';
  } else if (!isGeneric(pi?.brandName)) {
    productName = pi.brandName; source = 'pi_brandName'; evidenceReference = 'ProductIntelligence.brandName';
    brandName = pi.brandName;
  } else if (!isGeneric(pi?.companyName)) {
    productName = pi.companyName; source = 'pi_companyName'; evidenceReference = 'ProductIntelligence.companyName';
    companyName = pi.companyName;
  }

  if (!brandName && !isGeneric(pi?.brandName)) brandName = pi.brandName;
  if (!companyName && !isGeneric(pi?.companyName)) companyName = pi.companyName;

  // Priority 2: EvidenceSnapshot product data
  if (!productName || isGeneric(productName)) {
    const sd = evidenceSnapshot?.evidence?.product || evidenceSnapshot?.evidence?.company || {};
    if (!isGeneric(sd?.name)) { productName = sd.name; source = 'evidence_product_name'; evidenceReference = 'EvidenceSnapshot.product.name'; }
    else if (!isGeneric(sd?.brandName)) { productName = sd.brandName; source = 'evidence_brand_name'; evidenceReference = 'EvidenceSnapshot.product.brandName'; }
    if (!brandName && !isGeneric(sd?.brandName)) brandName = sd.brandName;
  }

  // Priority 3: Structured data org/product name
  if (!productName || isGeneric(productName)) {
    const sdName = extractBrandFromStructuredData(evidenceSnapshot?.evidence?.structuredData);
    if (sdName && !isGeneric(sdName)) { productName = sdName; source = 'structured_data'; evidenceReference = 'structuredData.organizationName'; }
  }

  // Priority 4: Website title/H1 → extract brand
  if (!productName || isGeneric(productName)) {
    const title = website?.title || evidenceSnapshot?.evidence?.website?.title || null;
    const extracted = extractBrandFromTitle(title);
    if (extracted && !isGeneric(extracted)) { productName = extracted; source = 'website_title_brand'; evidenceReference = 'Website.title'; }
  }

  // Priority 5: Website H1
  if (!productName || isGeneric(productName)) {
    const h1 = website?.heroText || evidenceSnapshot?.evidence?.website?.heroText || null;
    if (h1 && !isGeneric(h1) && h1.length < 100) { productName = h1; source = 'website_h1'; evidenceReference = 'Website.heroText'; }
  }

  // Priority 6: Domain → brand
  if (!productName || isGeneric(productName)) {
    const db = domainToBrand(domain);
    if (db && !isGeneric(db)) { productName = db; brandName = brandName || db; source = 'domain'; evidenceReference = 'Domain'; }
  }

  // Priority 7: Product summary brand detection
  if (!productName || isGeneric(productName)) {
    const summary = analysis.summary || analysis.productSummary || '';
    const brandMatch = summary.match(/^([A-Z][a-zA-Z0-9]+)\s+is/i);
    if (brandMatch && !isGeneric(brandMatch[1])) { productName = brandMatch[1]; brandName = brandName || productName; source = 'summary_brand'; evidenceReference = 'ProductIntelligence.productAnalysis.summary'; }
  }

  // Priority 8: chat.productName
  if (!productName || isGeneric(productName)) {
    if (chat?.productName && !isGeneric(chat.productName)) { productName = chat.productName; source = 'chat_productName'; evidenceReference = 'Chat.productName'; }
  }

  const resolved = Boolean(productName && !isGeneric(productName));

  if (!resolved) {
    return {
      projectTitle,
      productName: null,
      brandName: null,
      companyName: null,
      websiteUrl,
      domain,
      category: null,
      source: 'unresolved',
      evidenceReference: 'No valid product identity found',
      resolved: false,
    };
  }

  if (!brandName) brandName = productName;
  if (!companyName) brandName = productName;
  if (!brandName) brandName = productName;

  const category = analysis?.category || analysis?.industry || null;

  return {
    projectTitle,
    productName,
    brandName,
    companyName,
    websiteUrl,
    domain,
    category,
    source,
    evidenceReference,
    resolved: true,
  };
}

export default { resolveProductIdentity };
