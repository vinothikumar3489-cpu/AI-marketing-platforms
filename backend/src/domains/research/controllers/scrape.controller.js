import { z } from "zod";
import { scrapeWebsite } from "../services/scraper.service.js";
import { scrapingQueue } from "../../../jobs/queues.js";

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
    const job = await scrapingQueue.add('website-scrape', { websiteUrl, productName, companyName });
    return res.status(202).json({ 
      success: true, 
      message: "Scraping started in the background",
      jobId: job.id,
      statusUrl: `/api/jobs/scraping/${job.id}/status`
    });
  } catch (err) {
    console.error("Scrape enqueue error", err);
    return res.status(500).json({ success: false, error: "Failed to enqueue scraping task" });
  }
};
