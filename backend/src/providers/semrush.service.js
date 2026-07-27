import fetch from "node-fetch";

const SEMRUSH_KEY = process.env.SEMRUSH_API_KEY;

export async function fetchSemrushData(domain) {
  if (!SEMRUSH_KEY) return null;

  // Minimal implementation: call Semrush API endpoints if available.
  try {
    // Placeholder: the real Semrush API requires paid access and specific endpoints.
    return null;
  } catch (err) {
    console.error("Semrush fetch error", err);
    return null;
  }
}

export default { fetchSemrushData };
