const GENERIC_LABELS = new Set([
  'new analysis', 'new growth analysis', 'new seo analysis', 'new campaign',
  'growth analysis', 'seo analysis', 'campaign analysis',
  'untitled project', 'untitled', 'new project',
  'new & featured', 'featured', 'home', 'courses',
  'project', 'analysis', 'my', 'the', 'test', 'demo', 'sample',
  'unknown product', 'unknown company', 'unknown',
  'product', 'website', 'landing', 'page',
  'www', 'app', 'login', 'signin', 'signup', 'register',
  'general', 'technology', 'saas', 'none',
  'video conferencing for business', 'online video conferencing',
  'click here', 'learn more', 'get started', 'sign up',
  'documentation', 'docs', 'help center', 'support',
  'privacy policy', 'terms of service', 'cookie policy',
]);

function isGeneric(label) {
  if (!label || typeof label !== 'string') return true;
  const t = label.trim();
  if (t.length < 2) return true;
  if (t.length > 100) return true;
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
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractBrandFromTitle(title) {
  if (!title || typeof title !== 'string') return null;
  const separators = ['|', '–', '—', ' - ', ' : ', ': ', ' :: '];
  for (const sep of separators) {
    const parts = title.split(sep).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 1];
      if (!isGeneric(candidate) && candidate.length < 60) return candidate;
    }
  }
  return null;
}

function extractOpenGraph(website) {
  if (!website || typeof website !== 'object') return {};
  const og = website.openGraph || website.og || {};
  const result = {};
  if (og.siteName && !isGeneric(og.siteName)) result.siteName = og.siteName;
  if (og.title && !isGeneric(og.title)) result.title = og.title;
  if (og.description) result.description = og.description;
  if (og.url) result.url = og.url;
  if (og.type) result.type = og.type;
  return result;
}

function extractJsonLd(website) {
  if (!website || typeof website !== 'object') return null;
  const ld = website.structuredData || website.jsonLd || website.jsonld || null;
  if (!ld) return null;
  const entries = Array.isArray(ld) ? ld : [ld];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry['@type'] === 'Organization' || entry['@type'] === 'Product' || entry['@type'] === 'SoftwareApplication') {
      return {
        name: entry.name || null,
        brand: entry.brand?.name || entry.brand || null,
        alternateName: entry.alternateName || null,
        description: entry.description || null,
        url: entry.url || null,
        sameAs: entry.sameAs || null,
        type: entry['@type'],
      };
    }
  }
  return null;
}

function extractMeta(website) {
  if (!website || typeof website !== 'object') return {};
  const meta = website.meta || website.metaTags || {};
  return {
    title: meta.title || website.title || null,
    description: meta.description || website.description || null,
    keywords: meta.keywords || null,
  };
}

function extractH1(website) {
  if (!website || typeof website !== 'object') return [];
  const h1s = website.h1 || website.headings?.h1 || website.heroText || null;
  if (!h1s) return [];
  const arr = Array.isArray(h1s) ? h1s : [h1s];
  return arr.filter(h => h && typeof h === 'string' && !isGeneric(h) && h.length < 100);
}

export function resolveProductIdentity({ chat, productIntelligence, evidenceSnapshot, website }) {
  const projectTitle = chat?.title || 'New Analysis';
  const websiteUrl = chat?.websiteUrl || website?.url || null;
  const domain = extractDomain(websiteUrl);

  const candidates = [];
  const conflicts = [];

  function addCandidate(field, value, source, confidence) {
    if (!value || isGeneric(value)) return;
    const existing = candidates.find(c => c.field === field);
    if (existing) {
      if (existing.value !== value) {
        conflicts.push({ field, sourceA: existing.source, valueA: existing.value, sourceB: source, valueB: value });
      }
      if (confidence > existing.confidence) {
        existing.value = value;
        existing.source = source;
        existing.confidence = confidence;
      }
    } else {
      candidates.push({ field, value, source, confidence });
    }
  }

  function getBest(field) {
    const match = candidates.filter(c => c.field === field).sort((a, b) => b.confidence - a.confidence);
    return match.length > 0 ? match[0] : null;
  }

  const pi = productIntelligence;
  const analysis = pi?.productAnalysis || {};
  const inputJson = pi?.inputJson || {};

  const og = extractOpenGraph(website);
  const ld = extractJsonLd(website);
  const meta = extractMeta(website);
  const h1s = extractH1(website);

  addCandidate('productName', inputJson.productName, 'inputJson.productName', 100);
  addCandidate('brandName', inputJson.brandName, 'inputJson.brandName', 100);
  addCandidate('companyName', inputJson.companyName, 'inputJson.companyName', 100);

  addCandidate('productName', analysis?.productName, 'pi_analysis.productName', 85);
  addCandidate('productName', analysis?.name, 'pi_analysis.name', 80);
  addCandidate('companyName', analysis?.companyName, 'pi_analysis.companyName', 80);

  addCandidate('productName', pi?.productName, 'pi.productName', 75);
  addCandidate('brandName', pi?.brandName, 'pi.brandName', 75);
  addCandidate('companyName', pi?.companyName, 'pi.companyName', 75);
  addCandidate('companyName', pi?.name, 'pi.name', 70);

  const es = evidenceSnapshot?.evidence || {};
  const esProduct = es?.product || es?.company || {};
  addCandidate('productName', esProduct?.name, 'evidence.product.name', 80);
  addCandidate('brandName', esProduct?.brandName, 'evidence.product.brandName', 80);
  addCandidate('companyName', esProduct?.companyName, 'evidence.product.companyName', 80);

  if (ld) {
    addCandidate('productName', ld.name, `jsonLd.${ld.type}.name`, 75);
    addCandidate('brandName', ld.brand, `jsonLd.${ld.type}.brand`, 70);
    addCandidate('description', ld.description, `jsonLd.${ld.type}.description`, 60);
  }

  if (og?.siteName) addCandidate('companyName', og.siteName, 'openGraph.siteName', 70);

  const titleBrand = extractBrandFromTitle(og?.title || meta?.title || website?.title || null);
  if (titleBrand) addCandidate('brandName', titleBrand, 'title_extracted_brand', 60);

  if (meta?.title && !titleBrand && !isGeneric(meta.title)) {
    addCandidate('description', meta.title, 'meta.title', 40);
  }

  if (meta?.description) addCandidate('description', meta.description, 'meta.description', 30);

  for (const h1 of h1s.slice(0, 3)) {
    if (h1.length < 60) {
      addCandidate('productName', h1, 'h1', 40);
    }
  }

  const domainBrand = domainToBrand(domain);
  if (domainBrand) addCandidate('brandName', domainBrand, 'domain', 30);

  const summary = analysis.summary || analysis.productSummary || '';
  const brandMatch = summary.match(/^([A-Z][a-zA-Z0-9._-]{1,40})\s+is/i);
  if (brandMatch && !isGeneric(brandMatch[1])) {
    addCandidate('productName', brandMatch[1], 'summary_brand', 35);
  }

  if (chat?.productName && !isGeneric(chat.productName)) {
    addCandidate('productName', chat.productName, 'chat.productName', 50);
  }

  const productNameBest = getBest('productName');
  const brandNameBest = getBest('brandName');
  const companyNameBest = getBest('companyName');
  const descriptionBest = getBest('description');

  const productName = productNameBest?.value || null;
  const brandName = brandNameBest?.value || productName || null;
  const companyName = companyNameBest?.value || brandName || productName || null;
  const description = descriptionBest?.value || null;

  const aliases = [...new Set(
    candidates
      .filter(c => c.field === 'productName' || c.field === 'brandName')
      .map(c => c.value)
      .filter(Boolean)
  )];

  const resolved = Boolean(productName && !isGeneric(productName));

  const fieldConfidence = {
    productName: productNameBest?.confidence || 0,
    brandName: brandNameBest?.confidence || 0,
    companyName: companyNameBest?.confidence || 0,
    description: descriptionBest?.confidence || 0,
  };

  const category = analysis?.category || null;
  const industry = analysis?.industry || null;
  const businessModel = analysis?.businessModel || null;

  return {
    projectTitle,
    productName,
    brandName,
    companyName,
    displayName: productName || brandName || companyName || projectTitle,
    aliases,
    websiteUrl,
    domain,
    industry,
    category,
    businessModel,
    description,
    evidence: candidates.map(c => ({ field: c.field, value: c.value, source: c.source, confidence: c.confidence })),
    fieldConfidence,
    conflicts,
    source: resolved ? (productNameBest?.source || 'resolved') : 'unresolved',
    evidenceReference: resolved ? (productNameBest?.source || 'Unknown') : 'No valid product identity could be derived from evidence',
    resolved,
  };
}

export default { resolveProductIdentity };