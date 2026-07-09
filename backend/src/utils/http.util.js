import https from "https";
import http from "http";

export function fetchText(url, maxLength = 5000, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk.toString(); });
      res.on("end", () => resolve(data.slice(0, maxLength)));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

export function fetchJson(url, timeoutMs = 30000) {
  return new Promise((resolve) => {
    https.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk.toString(); });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    }).on("error", () => resolve(null))
      .on("timeout", function () { this.destroy(); resolve(null); });
  });
}
