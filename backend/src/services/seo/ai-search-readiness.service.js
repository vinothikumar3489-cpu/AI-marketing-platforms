
export function analyzeAiSearchReadiness(websiteData, keywords, identity) {
  const productName = identity?.productName || 'Product';
  const metadata = websiteData?.metadata || websiteData || {};
  const content = websiteData?.content || websiteData;

  const title = metadata.title || content.title || '';
  const description = metadata.description || content.description || '';
  const h1s = metadata.h1 || content.h1 || [];
  const h1Text = Array.isArray(h1s) ? h1s.map(h => typeof h === 'string' ? h : (h.text || h)).filter(Boolean).join(' ') : '';
  const schema = content.schema || metadata.schema;

  // Entity clarity - does the page clearly state who/what/why
  const hasProductName = title.toLowerCase().includes(productName.toLowerCase()) ||
    h1Text.toLowerCase().includes(productName.toLowerCase());
  const hasClearValue = description.includes(productName) || description.length > 50;
  let entityClarity = 'LOW';
  if (hasProductName && hasClearValue) entityClarity = 'HIGH';
  else if (hasProductName || hasClearValue) entityClarity = 'MEDIUM';

  // Answerability - does content directly answer likely questions
  const kwQuestions = (keywords || []).filter(k => k.type === 'QUESTION' || (k.keyword || '').startsWith('how') || (k.keyword || '').startsWith('what'));
  const answerability = kwQuestions.length >= 3 ? 'MEDIUM' : (kwQuestions.length >= 1 ? 'LOW' : 'LOW');

  // Structured data readiness
  const schemaTypes = Array.isArray(schema) ? schema : (schema?.types || []);
  const structuredDataReadiness = schemaTypes.length > 0 ? 'MEDIUM' : 'LOW';

  // Citation readiness - is content well-structured for citation
  const hasParagraphs = (content.text || '').length > 500;
  const citationReadiness = hasParagraphs && schemaTypes.length > 0 ? 'MEDIUM' : 'LOW';

  // Topical authority
  const primaryKwCount = (keywords || []).filter(k => k.type === 'BRAND' || k.type === 'CATEGORY').length;
  const topicalAuthority = primaryKwCount >= 5 ? 'MEDIUM' : (primaryKwCount >= 2 ? 'LOW' : 'LOW');

  // Trust signals
  const hasHttps = (websiteData?.url || '').startsWith('https');
  const trustSignals = hasHttps ? 'MEDIUM' : 'LOW';

  return {
    entityClarity,
    answerability,
    structuredDataReadiness,
    citationReadiness,
    topicalAuthority,
    trustSignals,
    platformVisibility: {
      chatGPT: 'Not measured',
      gemini: 'Not measured',
      claude: 'Not measured',
      perplexity: 'Not measured',
      googleAIO: 'Not measured'
    },
    inferenceStatus: 'AI_INFERRED'
  };
}
