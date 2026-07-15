
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBullets(items) {
  if (!items || items.length === 0) return '';
  return items.map(item => `<tr><td style="padding:4px 0 4px 20px;font-size:15px;line-height:1.5;color:#334155;">
    <span style="color:#2563eb;margin-right:8px;">•</span>${escapeHtml(item)}
  </td></tr>`).join('');
}

function renderCtaButton(cta) {
  if (!cta || !cta.text) return '';
  const url = cta.url || '#';
  return `<tr><td style="text-align:center;padding:24px 0 16px;">
    <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;text-decoration:none;line-height:1;">
      ${escapeHtml(cta.text)}
    </a>
  </td></tr>`;
}

export function renderEmailHtml(structuredEmail) {
  const e = structuredEmail || {};
  const greeting = e.greeting || '';
  const opening = e.opening || '';
  const bodyParagraphs = e.bodyParagraphs || [];
  const bulletPoints = e.bulletPoints || [];
  const cta = e.cta || {};
  const closing = e.closing || '';
  const signature = e.signature || '';
  const previewText = e.previewText || '';

  const bodyHtml = bodyParagraphs.map(p => `<tr><td style="padding:8px 0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(p)}</td></tr>`).join('');
  const bulletsHtml = renderBullets(bulletPoints);
  const ctaHtml = renderCtaButton(cta);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  ${previewText ? `<meta name="description" content="${escapeHtml(previewText)}">` : ''}
  <title>${escapeHtml(e.subject || '')}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${previewText ? `<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr><td style="padding:24px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${greeting ? `<tr><td style="padding:0 0 8px;font-size:16px;line-height:1.5;color:#334155;">${escapeHtml(greeting)}</td></tr>` : ''}
            ${opening ? `<tr><td style="padding:8px 0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(opening)}</td></tr>` : ''}
            ${bodyHtml}
            ${bulletsHtml ? `<tr><td style="padding:8px 0;"><table role="presentation" cellpadding="0" cellspacing="0">${bulletsHtml}</table></td></tr>` : ''}
            ${ctaHtml}
            ${closing ? `<tr><td style="padding:8px 0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(closing)}</td></tr>` : ''}
            ${signature ? `<tr><td style="padding:16px 0 0;font-size:14px;line-height:1.5;color:#64748b;">${escapeHtml(signature)}</td></tr>` : ''}
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
              <p style="margin:0 0 4px;">You received this email because you signed up or expressed interest.</p>
              <p style="margin:0 0 4px;"><a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
              <p style="margin:0;">{{company_address}}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return html;
}

export function renderPlainText(structuredEmail) {
  const e = structuredEmail || {};
  const parts = [];
  if (e.greeting) parts.push(e.greeting);
  if (e.opening) parts.push(e.opening);
  if (e.bodyParagraphs) parts.push(...e.bodyParagraphs);
  if (e.bulletPoints && e.bulletPoints.length > 0) {
    parts.push(e.bulletPoints.map(b => `  • ${b}`).join('\n'));
  }
  if (e.closing) parts.push(e.closing);
  if (e.signature) parts.push(e.signature);
  if (e.cta?.text) {
    const url = e.cta?.url ? ` (${e.cta.url})` : '';
    parts.push(`---\n${e.cta.text}${url}`);
  }
  return parts.join('\n\n');
}
