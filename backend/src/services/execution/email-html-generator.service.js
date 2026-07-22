/**
 * Email HTML Template Generator Service
 * Professional responsive email HTML template generation
 */

/**
 * Generate professional responsive HTML email template
 */
export function generateEmailHtmlTemplate(emailData) {
  const {
    subject,
    previewText,
    greeting,
    headline,
    opening,
    painPoint,
    solution,
    benefits,
    bodyParagraphs,
    socialProof,
    primaryCta,
    secondaryCta,
    closing,
    signature,
    postscript,
    complianceFooter,
    unsubscribeText,
    sender,
    recipient,
    productIdentity
  } = emailData;

  // Apply personalization if recipient data is available
  const personalizedGreeting = recipient?.firstName 
    ? greeting.replace(/\{\{firstName\}\}/g, recipient.firstName)
    : greeting;

  const personalizedBody = bodyParagraphs?.map(para => {
    let personalized = para;
    if (recipient?.firstName) personalized = personalized.replace(/\{\{firstName\}\}/g, recipient.firstName);
    if (recipient?.lastName) personalized = personalized.replace(/\{\{lastName\}\}/g, recipient.lastName);
    if (recipient?.companyName) personalized = personalized.replace(/\{\{companyName\}\}/g, recipient.companyName);
    if (sender?.name) personalized = personalized.replace(/\{\{senderName\}\}/g, sender.name);
    if (productIdentity?.displayName) personalized = personalized.replace(/\{\{productName\}\}/g, productIdentity.displayName);
    return personalized;
  });

  const benefitsHtml = benefits?.map(benefit => `
    <li style="margin: 8px 0; padding-left: 8px;">${benefit}</li>
  `).join('') || '';

  const bodyParagraphsHtml = personalizedBody?.map(para => `
    <p style="margin: 16px 0; line-height: 1.6;">${para}</p>
  `).join('') || '';

  const secondaryCtaHtml = secondaryCta ? `
    <div style="text-align: center; margin: 15px 0;">
      <a href="${secondaryCta.url}" style="color: #0066cc; text-decoration: none; border-bottom: 1px solid #0066cc;">${secondaryCta.label}</a>
    </div>
  ` : '';

  const socialProofHtml = socialProof ? `
    <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 3px solid #0066cc; border-radius: 3px;">
      <p style="margin: 0; font-style: italic; color: #555;">${socialProof}</p>
    </div>
  ` : '';

  const postscriptHtml = postscript ? `
    <p style="margin: 30px 0; font-size: 14px; color: #555;"><strong>P.S.</strong> ${postscript}</p>
  ` : '';

  const brandColor = '#0066cc';
  const brandColorLight = '#e6f0ff';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <style type="text/css">
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    
    /* Mobile responsive */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 15px !important; }
      .cta-button { width: 100% !important; }
      .hero-section { padding: 20px !important; }
      .benefit-item { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  
  <!-- Email container -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <!-- Main content -->
        <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
          
          <!-- Header with brand color -->
          <tr>
            <td class="hero-section" style="background: linear-gradient(135deg, ${brandColor} 0%, #004499 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${headline || subject}</h1>
              ${previewText ? `<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${previewText}</p>` : ''}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="email-content" style="padding: 35px;">
              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 17px; color: #333; font-weight: 500;">${personalizedGreeting}</p>
              
              <!-- Opening -->
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #444; line-height: 1.7;">${opening}</p>
              
              <!-- Pain Point -->
              <div style="background-color: ${brandColorLight}; padding: 20px; margin: 24px 0; border-radius: 8px; border-left: 4px solid ${brandColor};">
                <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.6;">${painPoint}</p>
              </div>
              
              <!-- Solution -->
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #444; line-height: 1.7;"><strong>${solution}</strong></p>
              
              <!-- Body paragraphs -->
              ${bodyParagraphsHtml}
              
              <!-- Benefits -->
              ${benefits && benefits.length > 0 ? `
              <div style="background-color: #f8f9fa; padding: 24px; margin: 24px 0; border-radius: 8px; border: 1px solid #e9ecef;">
                <h3 style="margin: 0 0 16px 0; color: ${brandColor}; font-size: 18px; font-weight: 600;">Key Benefits:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.6;">
                  ${benefitsHtml}
                </ul>
              </div>
              ` : ''}
              
              <!-- Social Proof -->
              ${socialProofHtml}
              
              <!-- Primary CTA -->
              <div style="text-align: center; margin: 32px 0;">
                <a class="cta-button" href="${primaryCta?.url || '#'}" style="background: linear-gradient(135deg, ${brandColor} 0%, #004499 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,102,204,0.3); transition: transform 0.2s;">${primaryCta?.label || 'Learn More'}</a>
              </div>
              
              <!-- Secondary CTA -->
              ${secondaryCtaHtml}
              
              <!-- Closing -->
              <p style="margin: 32px 0 20px 0; font-size: 16px; color: #444; line-height: 1.7;">${closing}</p>
              
              <!-- Signature -->
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Best regards,<br>
                <strong>${signature || sender?.name || 'The Team'}</strong>
              </p>
              
              <!-- Postscript -->
              ${postscriptHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #666; line-height: 1.5;">${complianceFooter}</p>
              <p style="margin: 0; font-size: 13px; color: #666;">
                <a href="#" style="color: #666; text-decoration: underline;">${unsubscribeText}</a>
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #999;">
                ${productIdentity?.displayName || 'Our Company'} • ${sender?.email || 'contact@example.com'}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return html;
}

/**
 * Generate mobile-optimized HTML email template
 */
export function generateMobileEmailHtmlTemplate(emailData) {
  const html = generateEmailHtmlTemplate(emailData);
  
  // Add additional mobile-specific optimizations
  return html.replace(
    '<style type="text/css">',
    `<style type="text/css">
    /* Mobile-specific styles */
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-content { padding: 15px !important; }
      .cta-button { width: 100% !important; padding: 12px 20px !important; font-size: 14px !important; }
      h1 { font-size: 20px !important; }
      h3 { font-size: 16px !important; }
      p { font-size: 14px !important; }
    }
    `
  );
}

/**
 * Generate plain text version from email data
 */
export function generatePlainTextFromEmailData(emailData) {
  const {
    subject,
    greeting,
    headline,
    opening,
    painPoint,
    solution,
    benefits,
    bodyParagraphs,
    socialProof,
    primaryCta,
    secondaryCta,
    closing,
    signature,
    postscript,
    complianceFooter,
    unsubscribeText,
    sender,
    recipient
  } = emailData;

  // Apply personalization
  const personalizedGreeting = recipient?.firstName 
    ? greeting.replace(/\{\{firstName\}\}/g, recipient.firstName)
    : greeting;

  const personalizedBody = bodyParagraphs?.map(para => {
    let personalized = para;
    if (recipient?.firstName) personalized = personalized.replace(/\{\{firstName\}\}/g, recipient.firstName);
    if (recipient?.lastName) personalized = personalized.replace(/\{\{lastName\}\}/g, recipient.lastName);
    if (recipient?.companyName) personalized = personalized.replace(/\{\{companyName\}\}/g, recipient.companyName);
    if (sender?.name) personalized = personalized.replace(/\{\{senderName\}\}/g, sender.name);
    return personalized;
  });

  const benefitsText = benefits?.map(benefit => `- ${benefit}`).join('\n') || '';

  const bodyText = personalizedBody?.join('\n\n') || '';

  const secondaryCtaText = secondaryCta ? `\n\nSecondary: ${secondaryCta.label} - ${secondaryCta.url}` : '';

  const socialProofText = socialProof ? `\n\n"${socialProof}"` : '';

  const postscriptText = postscript ? `\n\nP.S. ${postscript}` : '';

  const plainText = `${headline || subject}

${personalizedGreeting}

${opening}

${painPoint}

${solution}

${bodyText}

Key Benefits:
${benefitsText}
${socialProofText}

${primaryCta?.label ? primaryCta.label.toUpperCase() : 'LEARN MORE'}: ${primaryCta?.url || '#'}${secondaryCtaText}

${closing}

${signature || sender?.name || 'The Team'}${postscriptText}

---
${complianceFooter}

${unsubscribeText}: [unsubscribe link]`;

  return plainText;
}

/**
 * Validate generated HTML for email compatibility
 */
export function validateEmailHtml(html) {
  const issues = [];

  // Check for required elements
  if (!html.includes('<!DOCTYPE html>')) {
    issues.push('Missing DOCTYPE declaration');
  }

  if (!html.includes('<meta name="viewport"')) {
    issues.push('Missing viewport meta tag for mobile responsiveness');
  }

  if (!html.includes('style')) {
    issues.push('Missing inline styles');
  }

  // Check for unsupported CSS
  const unsupportedCss = [
    'position: fixed',
    'position: absolute',
    'float:',
    'display: flex',
    'display: grid',
    'transform:',
    'transition:',
    'animation:'
  ];

  unsupportedCss.forEach(css => {
    if (html.includes(css)) {
      issues.push(`Unsupported CSS detected: ${css}`);
    }
  });

  // Check for JavaScript
  if (html.includes('<script') || html.includes('javascript:')) {
    issues.push('JavaScript detected (not supported in email clients)');
  }

  // Check for external CSS
  if (html.includes('<link rel="stylesheet"')) {
    issues.push('External CSS detected (use inline styles instead)');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
