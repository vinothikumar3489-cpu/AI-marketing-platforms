import { generateProductIntelligence } from "../services/aiProvider.service.js";

export const analyzeProductIntelligence = async (productData, scrapedData) => {
  return await generateProductIntelligence({ productData, scrapedData });
};
