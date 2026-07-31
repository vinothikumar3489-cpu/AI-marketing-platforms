import https from "https";
import http from "http";

export function fetchText(url, maxLength = 5000, timeoutMs = 8000, onError = null) {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        if (onError) onError(new Error(`HTTP ${res.statusCode} for ${url}`));
        resolve(null);
        return;
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk.toString(); });
      res.on("end", () => resolve(data.slice(0, maxLength)));
    });
    req.on("error", (err) => { if (onError) onError(err); resolve(null); });
    req.on("timeout", () => { req.destroy(); if (onError) onError(new Error(`Request timed out after ${timeoutMs}ms: ${url}`)); resolve(null); });
  });
}

export function fetchJson(url, timeoutMs = 30000, onError = null) {
  return new Promise((resolve) => {
    https.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk.toString(); });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (err) { if (onError) onError(new Error(`Invalid JSON from ${url}: ${err.message}`)); resolve(null); }
      });
    }).on("error", (err) => { if (onError) onError(err); resolve(null); })
      .on("timeout", function () { this.destroy(); if (onError) onError(new Error(`Request timed out after ${timeoutMs}ms: ${url}`)); resolve(null); });
  });
}
