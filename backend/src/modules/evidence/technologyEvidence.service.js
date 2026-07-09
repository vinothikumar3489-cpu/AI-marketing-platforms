export function collectTechnologyEvidence($) {
  const result = {
    detected: [],
    hints: [],
  };

  try {
    const html = ($("html").attr("lang")) || null;
    const bodyHtml = $("body").html()?.toLowerCase() || "";
    const headHtml = $("head").html()?.toLowerCase() || "";
    const scripts = [];
    $("script[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src) scripts.push(src.toLowerCase());
    });
    const allScripts = scripts.join(" ");

    if (html) result.hints.push(`lang="${html}"`);
    if ($('meta[name="generator"]').attr("content")) result.hints.push(`generator=${$('meta[name="generator"]').attr("content")}`);

    // CMS detection
    if (/(wp-content|wp-includes|wordpress)/.test(bodyHtml)) result.detected.push("WordPress");
    if (/(squarespace)/.test(bodyHtml) || /squarespace/.test(headHtml)) result.detected.push("Squarespace");
    if (/(shopify|myshopify)/.test(bodyHtml)) result.detected.push("Shopify");
    if (/(webflow)/.test(bodyHtml)) result.detected.push("Webflow");
    if (/(wix)/.test(bodyHtml)) result.detected.push("Wix");

    // Framework detection
    if (/__NEXT_DATA__|next\.js|_next\/static/.test(bodyHtml)) result.detected.push("Next.js");
    if (/(react(-dom)?|react\.js|react\/)/.test(allScripts) || /id="root"/.test(bodyHtml) || /id="__next"/.test(bodyHtml)) result.detected.push("React");
    if (/(vue|__VUE__|vue\.js)/.test(allScripts)) result.detected.push("Vue.js");
    if (/(angular|ng-app|ng-version)/.test(bodyHtml)) result.detected.push("Angular");
    if (/(svelte)/.test(bodyHtml)) result.detected.push("Svelte");

    // CSS framework detection
    if (/(tailwind|\.tw-)/.test(bodyHtml)) result.detected.push("Tailwind CSS");
    if (/(bootstrap)/.test(allScripts) || /class="[^"]*col-(xs|sm|md|lg)-/.test(bodyHtml)) result.detected.push("Bootstrap");

    // Analytics detection
    if (/google-analytics|gtag|ga\.js/.test(allScripts)) result.detected.push("Google Analytics");
    if (/fbevents\.js|fbq\(/.test(bodyHtml)) result.detected.push("Facebook Pixel");
    if (/hotjar/.test(allScripts)) result.detected.push("Hotjar");
    if (/clarity/.test(allScripts)) result.detected.push("Microsoft Clarity");
    if (/intercom/.test(allScripts)) result.detected.push("Intercom");
    if (/hubspot/.test(allScripts) || /hs-script/.test(bodyHtml)) result.detected.push("HubSpot");
    if (/drip\.getdrip/.test(allScripts)) result.detected.push("Drip");

    // CDN / hosting hints
    if (/cloudflare/.test(bodyHtml) || /cf-ray/.test(headHtml)) result.hints.push("Cloudflare");

    result.detected = [...new Set(result.detected)];
    result.hints = [...new Set(result.hints)];
  } catch {
    // Silently handle
  }

  return result;
}
