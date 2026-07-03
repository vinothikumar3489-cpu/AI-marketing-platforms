import fetch from "node-fetch";

export async function fetchGSCData(siteUrl, startDate, endDate) {
  // Basic placeholder: real implementation requires OAuth2 and Search Console API client.
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;

  // Return null for now — integration point placeholder.
  return null;
}

export default { fetchGSCData };
