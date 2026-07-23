import { z } from "zod";
import { scrapeWebsite } from "../services/scraper.service.js";
import { getScrapingQueue } from "../../../jobs/queues.js";

const scrapeSchema = z.object({
  websiteUrl: z.string().url(),
  productName: z.string().optional(),
  companyName: z.string().optional(),
});

export const scrapeWebsiteHandler = async (req, res) => {
  const parse = scrapeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0].message });

  const { websiteUrl, productName, companyName } = parse.data;
  const queue = getScrapingQueue();
  if (queue && process.env.REDIS_URL) {
    try {
      const job = await queue.add('website-scrape', { websiteUrl, productName, companyName });
      return res.status(202).json({ 
        success: true, 
        message: "Scraping started in the background",
        jobId: job.id,
        statusUrl: `/api/jobs/scraping/${job.id}/status`
      });
    } catch (queueErr) {
      console.warn('[SCRAPE QUEUE FAILED] falling back to sync:', queueErr.message);
    }
  } else {
    console.log('[SCRAPE SYNC MODE] Redis unavailable, executing synchronously');
  }

  try {
    const result = await scrapeWebsite({ websiteUrl, productName, companyName });
    return res.json({ success: true, message: "Website scraping completed.", data: result });
  } catch (syncErr) {
    console.error("[SCRAPE SYNC FAILED]", syncErr);
    return res.status(500).json({ success: false, error: syncErr.message || "Website scraping failed" });
  }
};
