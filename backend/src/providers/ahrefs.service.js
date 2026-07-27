import fetch from "node-fetch";

const AHREFS_KEY = process.env.AHREFS_API_KEY;

export async function fetchAhrefsData(domain) {
  if (!AHREFS_KEY) return null;

  try {
    // Placeholder: real Ahrefs API call
    return null;
  } catch (err) {
    console.error("Ahrefs fetch error", err);
    return null;
  }
}

export default { fetchAhrefsData };
