import puppeteer from 'puppeteer-core';

let chromium;
try {
  chromium = (await import('@sparticuz/chromium')).default;
} catch {
  chromium = null;
}

function getExecutablePath() {
  return process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
}

async function resolveExecutablePath() {
  const configured = getExecutablePath();
  if (configured) return configured;

  if (chromium && typeof chromium.executablePath === 'function') {
    try {
      const p = await chromium.executablePath();
      if (p) return p;
    } catch {
      /* fall through */
    }
  }

  if (typeof puppeteer.executablePath === 'function') {
    try {
      const p = puppeteer.executablePath();
      if (p) return p;
    } catch {
      /* fall through */
    }
  }

  return undefined;
}

async function createLaunchOptions() {
  const executablePath = await resolveExecutablePath();

  const args = chromium && Array.isArray(chromium.args)
    ? [...chromium.args]
    : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

  if (!args.includes('--disable-gpu')) args.push('--disable-gpu');
  if (!args.includes('--single-process')) args.push('--single-process');

  const options = {
    headless: chromium && chromium.headless !== undefined ? chromium.headless : true,
    args,
    executablePath
  };

  if (chromium && chromium.defaultViewport) {
    options.defaultViewport = chromium.defaultViewport;
  }

  return options;
}

export async function generatePdf(htmlContent, options = {}) {
  const {
    format = 'A4',
    margin = { top: '60px', bottom: '60px', left: '50px', right: '50px' },
    landscape = false,
    printBackground = true,
    preferCSSPageSize = true
  } = options;

  console.log('[Report][PDF] generator start');

  let browser;
  try {
    const launchOptions = await createLaunchOptions();
    browser = await puppeteer.launch(launchOptions);

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

    console.log('[Report][PDF] generator finish:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
  } catch (error) {
    console.error('[Report][PDF] generator failure:', error.message);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
  }
}

export async function generatePdfFromUrl(url, options = {}) {
  console.log('[Report][PDF] generator start (from URL)');

  let browser;
  try {
    const launchOptions = await createLaunchOptions();
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      ...options
    });

    console.log('[Report][PDF] generator finish:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
  } catch (error) {
    console.error('[Report][PDF] generator failure:', error.message);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
  }
}
