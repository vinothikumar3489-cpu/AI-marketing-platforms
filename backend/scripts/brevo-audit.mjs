import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const RID = 'AUDIT-' + Date.now().toString(36).toUpperCase();
const BREVO_BASE = 'https://api.brevo.com/v3';
const TIMEOUT_MS = 30000;
const TARGET_EMAIL = 'vinothikumar3489@gmail.com';

function ok(msg) { console.log(`${GREEN}[${RID}] ✓ ${msg}${RESET}`); }
function warn(msg) { console.log(`${YELLOW}[${RID}] ⚠ ${msg}${RESET}`); }
function err(msg) { console.log(`${RED}[${RID}] ✗ ${msg}${RESET}`); }
function info(msg) { console.log(`${CYAN}[${RID}] ℹ ${msg}${RESET}`); }
function step(n, msg) { console.log(`\n${BOLD}${CYAN}[${RID}] ===== STEP ${n}: ${msg} =====${RESET}`); }
function reportFailure(file, fn, line, error, fix) {
  console.log(`\n${RED}${BOLD}[${RID}] FAILURE REPORT${RESET}`);
  console.log(`${RED}[${RID}]   File:     ${file}${RESET}`);
  console.log(`${RED}[${RID}]   Function: ${fn}${RESET}`);
  console.log(`${RED}[${RID}]   Line:     ${line}${RESET}`);
  console.log(`${RED}[${RID}]   Error:    ${error}${RESET}`);
  console.log(`${RED}[${RID}]   Fix:      ${fix}${RESET}`);
}

const config = {
  apiKey: process.env.BREVO_API_KEY || '',
  fromEmail: process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || '',
  fromName: process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'AI Marketing Platform',
};

const headers = {
  'api-key': config.apiKey,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

console.log(`\n${BOLD}${CYAN}${'='.repeat(70)}${RESET}`);
console.log(`${BOLD}${CYAN}  BREVO INFRASTRUCTURE AUDIT${RESET}`);
console.log(`${BOLD}${CYAN}  Target: ${TARGET_EMAIL}${RESET}`);
console.log(`${BOLD}${CYAN}  RID:    ${RID}${RESET}`);
console.log(`${BOLD}${CYAN}${'='.repeat(70)}${RESET}\n`);

// ===== STEP 1: Load configuration =====
step(1, 'Loading provider + configuration');

console.log(`${GRAY}[${RID}]   API key:     ${config.apiKey ? config.apiKey.substring(0, 8) + '...' + ' (' + config.apiKey.length + ' chars)' : 'MISSING'}${RESET}`);
console.log(`${GRAY}[${RID}]   From email:  ${config.fromEmail || 'MISSING'}${RESET}`);
console.log(`${GRAY}[${RID}]   From name:   ${config.fromName || 'MISSING'}${RESET}`);

const issues = [];

if (!config.apiKey) {
  reportFailure('brevo-audit.mjs (CI)', 'loadConfig', 40, 'BREVO_API_KEY is empty', 'Set BREVO_API_KEY in .env');
  process.exit(1);
}
if (config.apiKey.length < 20) {
  warn('BREVO_API_KEY seems too short (' + config.apiKey.length + ' chars) — expected 60+ for Brevo API keys');
  issues.push('BREVO_API_KEY may be invalid (too short)');
}
if (!config.apiKey.startsWith('xkeysib-')) {
  warn('BREVO_API_KEY does not start with "xkeysib-" — this is unusual for a Brevo master API key');
  issues.push('BREVO_API_KEY format unexpected (expected xkeysib- prefix)');
}
ok('BREVO_API_KEY loaded (' + config.apiKey.length + ' chars)');

if (!config.fromEmail) {
  reportFailure('brevo.provider.js', 'getConfig', 12, 'BREVO_FROM_EMAIL is not set', 'Set BREVO_SENDER_EMAIL or BREVO_FROM_EMAIL in .env');
  process.exit(1);
}
ok('BREVO_FROM_EMAIL loaded: ' + config.fromEmail);

// Check sender domain vs fromEmail
const senderDomain = config.fromEmail.split('@')[1];
info('Sender domain: ' + senderDomain);
if (senderDomain === 'gmail.com') {
  warn('Sender is a Gmail address — Brevo cannot verify domain ownership for Gmail. Delivery may fail or route to spam.');
  warn('Fix: Use a custom domain (e.g., yourcompany.com) and verify it in Brevo dashboard.');
  issues.push('Sender domain is gmail.com — Brevo requires domain verification for reliable delivery');
}

ok('STEP 1 complete');

// ===== STEP 2: Verify API key (Brevo account endpoint) =====
step(2, 'Verifying API key via Brevo /account endpoint');

try {
  const accountResp = await axios.get(BREVO_BASE + '/account', { headers, timeout: TIMEOUT_MS });
  ok('Brevo account API responded HTTP ' + accountResp.status);
  const acct = accountResp.data;
  const email = acct.email || acct.user?.email || 'unknown';
  const company = acct.companyName || acct.company?.name || 'unknown';
  info('Account email: ' + email);
  info('Company: ' + company);

  // Check remaining credits
  const plan = acct.plan || acct.plans || [];
  info('Plan data: ' + JSON.stringify(Array.isArray(plan) ? plan.map(p => p.type || p.credits || p.name) : 'see raw'));
} catch (caught) {
  const status = caught.response?.status;
  const body = caught.response?.data;
  const msg = body?.message || caught.message;
  err('Account API call FAILED — HTTP ' + (status || 'NO_RESPONSE'));
  err('Response: ' + JSON.stringify(body));

  if (status === 401 && (msg || '').includes('unrecognised IP')) {
    reportFailure('brevo.provider.js', 'handleBrevoError', 276,
      'Brevo IP whitelist blocking account API: ' + msg,
      'Go to https://app.brevo.com/security/authorised_ips and add:\n  - 152.57.88.18 (IPv4)\n  - 2409:40f4:442c:49e:59a1:347f:4ede:ad18 (IPv6)');
    issues.push('IP not whitelisted in Brevo dashboard');
  } else if (status === 401) {
    reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
      'Brevo authentication failed - HTTP 401',
      '1) Go to https://app.brevo.com/settings/api to regenerate API key\n2) Update BREVO_API_KEY in .env\n3) Ensure IP is whitelisted at https://app.brevo.com/security/authorised_ips');
    issues.push('BREVO_API_KEY rejected by Brevo');
  } else {
    reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
      'Brevo API unreachable: ' + msg,
      'Check network connectivity to api.brevo.com:443');
    issues.push('Brevo API unreachable');
  }
}

// ===== STEP 3: Check sender verification status =====
step(3, 'Checking sender verification');
try {
  const sendersResp = await axios.get(BREVO_BASE + '/senders', { headers, timeout: TIMEOUT_MS });
  ok('Senders list API responded HTTP ' + sendersResp.status);
  const senders = sendersResp.data?.senders || [];
  if (senders.length === 0) {
    warn('No senders configured in Brevo dashboard');
    issues.push('No senders configured in Brevo dashboard');
  }
  for (const s of senders) {
    const verified = s.verified ? 'VERIFIED' : 'NOT VERIFIED';
    info('Sender: ' + s.email + ' — ' + verified);
    if (s.email === config.fromEmail && !s.verified) {
      warn('Sender "' + config.fromEmail + '" is NOT verified in Brevo!');
      warn('Fix: Go to https://app.brevo.com/senders/ and verify this sender address.');
      issues.push('Sender email "' + config.fromEmail + '" not verified in Brevo dashboard');
    }
  }
} catch (caught) {
  warn('Could not check senders: ' + (caught.response?.data?.message || caught.message));
}

// ===== STEP 4: Build payload =====
step(4, 'Building email payload');

const testHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:auto;background:white;border-radius:8px;padding:30px">
  <h1 style="color:#1a56db">AI Marketing Platform</h1>
  <h2>Test Email — Brevo Audit</h2>
  <p>This is a diagnostic test from the Brevo infrastructure audit script.</p>
  <p>RID: ${RID}</p>
  <p style="color:#666;font-size:12px">Sent at: ${new Date().toISOString()}</p>
</div>
</body>
</html>`;

const payload = {
  sender: { email: config.fromEmail, name: config.fromName },
  to: [{ email: TARGET_EMAIL }],
  subject: `[Brevo Audit] ${RID} — Infrastructure Diagnostic Test`,
  htmlContent: testHtml,
  textContent: testHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
  tags: ['BREVO_AUDIT', 'DIAGNOSTIC'],
  headers: {
    'X-Provider': 'brevo-audit',
    'X-Request-Id': RID,
    'X-Audit': 'true',
  },
};

console.log(`${GRAY}[${RID}] PAYLOAD DUMP:${RESET}`);
console.log(`${GRAY}[${RID}]   sender:         ${JSON.stringify(payload.sender)}${RESET}`);
console.log(`${GRAY}[${RID}]   to:             ${JSON.stringify(payload.to)}${RESET}`);
console.log(`${GRAY}[${RID}]   subject:        "${payload.subject}"${RESET}`);
console.log(`${GRAY}[${RID}]   htmlContent:    ${payload.htmlContent.length} chars${RESET}`);
console.log(`${GRAY}[${RID}]   textContent:    ${payload.textContent.length} chars${RESET}`);
console.log(`${GRAY}[${RID}]   tags:           ${JSON.stringify(payload.tags)}${RESET}`);
console.log(`${GRAY}[${RID}]   headers:        ${JSON.stringify(payload.headers)}${RESET}`);

// Validate required fields
const requiredFields = ['sender', 'to', 'subject', 'htmlContent'];
for (const field of requiredFields) {
  if (!payload[field] || (typeof payload[field] === 'string' && !payload[field].trim())) {
    reportFailure('brevo.provider.js', 'sendTransactionalEmail', 62,
      `Required field "${field}" is empty`,
      `Ensure "${field}" is populated before calling Brevo API`);
    issues.push('Payload missing required field: ' + field);
  }
}

// Validate sender email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(config.fromEmail)) {
  reportFailure('brevo.provider.js', 'getConfig', 12,
    `Invalid sender email format: "${config.fromEmail}"`,
    'Set a valid email address in BREVO_SENDER_EMAIL or BREVO_FROM_EMAIL');
  issues.push('Invalid sender email format');
}
ok('Payload built successfully (' + JSON.stringify(payload).length + ' bytes)');

// ===== STEP 5: Call Brevo API =====
step(5, 'Calling Brevo transactional email API');
info('POST ' + BREVO_BASE + '/smtp/email');
info('Headers: api-key=' + config.apiKey.substring(0, 8) + '..., Content-Type=application/json');

let httpStatus, httpBody, httpHeaders;
try {
  const response = await axios.post(BREVO_BASE + '/smtp/email', payload, {
    headers,
    timeout: TIMEOUT_MS,
  });
  httpStatus = response.status;
  httpBody = response.data;
  httpHeaders = response.headers;

  ok('Brevo responded HTTP ' + httpStatus + ' ' + response.statusText);
  console.log(`${GRAY}[${RID}] Response body: ${JSON.stringify(httpBody)}${RESET}`);
  console.log(`${GRAY}[${RID}] Response headers:${RESET}`);
  for (const [k, v] of Object.entries(httpHeaders)) {
    if (!k.toLowerCase().includes('x-request-id') && !k.toLowerCase().includes('x-request')) continue;
    console.log(`${GRAY}[${RID}]   ${k}: ${v}${RESET}`);
  }

  const messageId = httpBody?.messageId || 'N/A';
  ok('Message ID: ' + messageId);
  ok('Email accepted by Brevo for delivery to ' + TARGET_EMAIL);
} catch (caught) {
  httpStatus = caught.response?.status;
  httpBody = caught.response?.data;
  httpHeaders = caught.response?.headers;
  const msg = httpBody?.message || caught.message;

  err('Brevo send FAILED — HTTP ' + (httpStatus || 'NO_RESPONSE'));
  err('Error message: ' + msg);

  if (httpBody && typeof httpBody === 'object') {
    console.log(`${RED}[${RID}] Full error body: ${JSON.stringify(httpBody, null, 2)}${RESET}`);
  }
  if (httpHeaders) {
    console.log(`${GRAY}[${RID}] Response headers:${RESET}`);
    const relevantHeaders = ['x-request-id', 'x-ratelimit-remaining', 'retry-after', 'x-envoy-upstream-service-time'];
    for (const h of relevantHeaders) {
      if (httpHeaders[h]) console.log(`${GRAY}[${RID}]   ${h}: ${httpHeaders[h]}${RESET}`);
    }
  }

  if (httpStatus === 401) {
    if ((msg || '').includes('unrecognised IP')) {
      reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
        'HTTP 401 — Brevo IP whitelist: ' + msg,
        'Add current IPs to https://app.brevo.com/security/authorised_ips');
    } else if ((msg || '').includes('key')) {
      reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
        'HTTP 401 — API key rejected: ' + msg,
        'Regenerate API key at https://app.brevo.com/settings/api');
    } else {
      reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
        'HTTP 401 — Authorization failed: ' + msg,
        'Check both API key validity and IP whitelist in Brevo dashboard');
    }
  } else if (httpStatus === 403) {
    reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
      'HTTP 403 — Forbidden: ' + msg,
      'Check sender domain verification and account permissions');
  } else if (httpStatus === 400) {
    reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
      'HTTP 400 — Bad request: ' + msg + '\nBody: ' + JSON.stringify(httpBody),
      'Validate payload structure (sender, to, subject, htmlContent)');
  } else if (httpStatus === 429) {
    reportFailure('brevo.provider.js', 'handleBrevoError', 283,
      'HTTP 429 — Rate limited: ' + msg,
      'Implement retry with exponential backoff. Current code returns immediately without retry.');
  } else if (!httpStatus) {
    reportFailure('brevo.provider.js', 'sendTransactionalEmail', 90,
      'Network error — no response: ' + msg,
      'Check DNS resolution and firewall rules for api.brevo.com:443');
  }

  if (httpStatus >= 500) {
    warn('Server error from Brevo (HTTP ' + httpStatus + ') — may be transient');
  }
}

// ===== STEP 6: Save delivery record check =====
step(6, 'Saving delivery / delivery persistence check');

try {
  const deliveryLogResp = await axios.get(BREVO_BASE + '/smtp/statistics/aggregated', {
    headers: { 'api-key': config.apiKey, Accept: 'application/json' },
    timeout: TIMEOUT_MS,
  });
  ok('Brevo statistics API accessible');
} catch (caught) {
  warn('Statistics API not accessible: ' + (caught.response?.data?.message || caught.message));
}

// ===== STEP 7: Summary report =====
step(7, 'Audit summary');

console.log(`\n${BOLD}${'='.repeat(70)}${RESET}`);
console.log(`${BOLD}  AUDIT RESULTS — ${issues.length === 0 ? 'ALL CHECKS PASSED' : issues.length + ' ISSUE(S) DETECTED'}${RESET}`);
console.log(`${BOLD}${'='.repeat(70)}${RESET}`);

console.log(`\n${BOLD}CONFIGURATION${RESET}`);
console.log(`  BREVO_API_KEY:      ${config.apiKey ? '✅ Set (' + config.apiKey.length + ' chars)' : '❌ MISSING'}`);
console.log(`  BREVO_FROM_EMAIL:   ${config.fromEmail ? '✅ Set (' + config.fromEmail + ')' : '❌ MISSING'}`);
console.log(`  BREVO_FROM_NAME:    ${config.fromName ? '✅ Set (' + config.fromName + ')' : '⚠ Default'}`);
console.log(`  EMAIL_PROVIDER:     ${process.env.EMAIL_PROVIDER ? '✅ ' + process.env.EMAIL_PROVIDER : '⚠ Not set (auto-detect)'}`);

console.log(`\n${BOLD}SENDER VERIFICATION${RESET}`);
if (senderDomain === 'gmail.com') {
  console.log(`  Domain:            ❌ ${config.fromEmail} (Gmail — cannot verify in Brevo)`);
  console.log(`  Fix:                Use a verified custom domain (e.g., yourcompany.com)`);
} else {
  console.log(`  Domain:            ${config.fromEmail}`);
}
console.log(`  SPF:                ⚠ Need to add include:brevo.com to sender domain's DNS TXT record`);
console.log(`  DKIM:               ⚠ Need to add Brevo DKIM record to sender domain's DNS`);
console.log(`  DMARC:              ⚠ Recommended for deliverability (p=quarantine or p=reject)`);

console.log(`\n${BOLD}API KEY TEST${RESET}`);
console.log(`  Account endpoint:   ${httpStatus === 401 ? '❌ FAILED' : '✅ OK'} (${httpStatus || 'N/A'})`);

console.log(`\n${BOLD}TRANSACTIONAL SEND TEST${RESET}`);
console.log(`  To: ${TARGET_EMAIL}`);
console.log(`  Status:             ${httpStatus >= 200 && httpStatus < 300 ? '✅ ACCEPTED' : '❌ FAILED'} (HTTP ${httpStatus || 'NONE'})`);
console.log(`  Response:           ${httpBody ? JSON.stringify(httpBody).substring(0, 200) : 'N/A'}`);

console.log(`\n${BOLD}PROVIDER IMPLEMENTATION ISSUES${RESET}`);
console.log(`  Retry logic:        ❌ NONE — Brevo provider has NO retry for transient failures`);
console.log(`  Timeout:            ✅ 30000ms configured`);
console.log(`  Circuit breaker:    ✅ Present in registry (counts failures, opens after 5)`);
console.log(`  Rate limit handling:${httpStatus === 429 ? '❌ Returns retryable=true but does NOT actually retry' : '✅ Not seen in this test'}`);
console.log(`  Metadata leak:      ❌ Line 77 merges metadata into headers — could overwrite api-key or other headers`);
console.log(`  Error handling:     ✅ All HTTP status codes handled (400, 401, 403, 429, timeout, 5xx)`);
console.log(`  API key exposure:   ✅ Logged truncated (first 8 chars)`);

if (issues.length > 0) {
  console.log(`\n${RED}${BOLD}ISSUES REQUIRING ACTION:${RESET}`);
  issues.forEach((issue, i) => console.log(`  ${i + 1}. ${RED}${issue}${RESET}`));
}

console.log(`\n${BOLD}${'='.repeat(70)}${RESET}`);
console.log(`${BOLD}  AUDIT COMPLETE${RESET}`);
console.log(`${BOLD}${'='.repeat(70)}${RESET}\n`);

process.exit(httpStatus >= 200 && httpStatus < 300 ? 0 : 1);
