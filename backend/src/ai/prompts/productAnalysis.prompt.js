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
  "customerPainPoints": ["Pain point 1", "Pain point 2", "Pain point 3", "Pain point 4"],
  "uniqueValueProposition": "Clear statement of what makes this product unique",
  "marketOpportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "competitorIdeas": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "seoSuggestions": ["Keyword 1", "Keyword 2", "Keyword 3", "Keyword 4"],
  "campaignIdeas": ["Campaign idea 1", "Campaign idea 2", "Campaign idea 3"],
  "finalRecommendation": "Actionable recommendation for next steps"
}

Ensure all arrays have at least 3 items. Return ONLY valid JSON.`;
};
