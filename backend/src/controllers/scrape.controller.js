import { z } from "zod";
import { scrapeWebsite } from "../services/scraper.service.js";

const scrapeSchema = z.object({
  websiteUrl: z.string().url(),
  productName: z.string().optional(),
  companyName: z.string().optional(),
});

export const scrapeWebsiteHandler = async (req, res) => {
  const parse = scrapeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0].message });

  const { websiteUrl, productName, companyName } = parse.data;
  try {
    const scraped = await scrapeWebsite({ websiteUrl, productName, companyName });
    if (!scraped.success) return res.status(500).json({ success: false, error: scraped.error || "Scraping failed" });
    return res.json({ success: true, scrapedData: scraped.scrapedData });
  } catch (err) {
    console.error("scrape error", err);
    return res.status(500).json({ success: false, error: "Scraping failed" });
  }
};
