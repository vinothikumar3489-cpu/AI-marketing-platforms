export const buildProductAnalysisPrompt = (productData, scrapedData) => {
  const { productName, description, targetMarket } = productData;
  const { title, features, benefits, cleanedText } = scrapedData || {};

  return `You are a Senior Product Marketing Analyst. Analyze this product and generate comprehensive marketing insights.

PRODUCT DETAILS:
- Name: ${productName}
- Description: ${description || 'Not provided'}
- Target Market: ${targetMarket || 'Not specified'}

WEBSITE DATA:
- Title: ${title || 'Not found'}
- Features: ${(features || []).join(', ')}
- Benefits: ${(benefits || []).join(', ')}
- Content: ${cleanedText ? cleanedText.slice(0, 1500) : 'Not available'}

Return a valid JSON object with these exact fields (no markdown, no extra text):
{
  "productSummary": "Brief 2-3 sentence product overview",
  "targetAudience": ["Audience segment 1", "Audience segment 2", "Audience segment 3"],
  "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3", "Pain point 4"],
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "pricing": ["Pricing detail 1", "Pricing detail 2"],
  "integrations": ["Integration 1", "Integration 2"],
  "useCases": ["Use case 1", "Use case 2"],
  "cta": ["CTA 1", "CTA 2"],
  "industries": ["Industry 1", "Industry 2"],
  "uniqueValueProposition": "Clear statement of what makes this product unique",
  "marketOpportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "competitorIdeas": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "seoSuggestions": ["Keyword 1", "Keyword 2", "Keyword 3", "Keyword 4"],
  "campaignIdeas": ["Campaign idea 1", "Campaign idea 2", "Campaign idea 3"],
  "finalRecommendation": "Actionable recommendation for next steps"
}

Ensure all arrays have at least 3 items. Return ONLY valid JSON.`;
};
