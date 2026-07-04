import puppeteer from 'puppeteer';

export async function generatePdf(htmlContent, options = {}) {
  const {
    format = 'A4',
    margin = { top: '60px', bottom: '60px', left: '50px', right: '50px' },
    landscape = false,
    printBackground = true,
    preferCSSPageSize = true
  } = options;

  console.log('[Report][PDF] Generating PDF...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      format,
      margin,
      landscape,
      printBackground,
      preferCSSPageSize,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%;font-size:8px;color:#9ca3af;text-align:center;padding:4px 40px;">
          <span>AI Marketing Platform v3.0 — Confidential</span>
          <span style="float:right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });

    console.log('[Report][PDF] PDF generated successfully:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
  } catch (error) {
    console.error('[Report][PDF] PDF generation failed:', error.message);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
  }
}

export async function generatePdfFromUrl(url, options = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      ...options
    });
  } finally {
    await browser.close();
  }
}
