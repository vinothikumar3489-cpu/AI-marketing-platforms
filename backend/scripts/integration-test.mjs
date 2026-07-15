import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:5000/api';
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_phase_a_testing_at_least_64_chars_long_here';

function log(...a) { console.log(...a); }

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/chats`, { headers: { Authorization: 'Bearer x' } });
      if (r.status === 401 || r.status === 500) return true; // server is responding
    } catch {}
    await sleep(500);
  }
  throw new Error('Server did not start in time');
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function main() {
  // --- Seed a chat with Product Intelligence (minimum required) ---
  const email = `integration_test_${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: { email, password: 'x', name: 'Integration Test' },
  });
  const chat = await prisma.chat.create({
    data: { userId: user.id, title: 'Test Product', productName: 'Test Product', websiteUrl: 'https://example.com' },
  });
  const productIntel = await prisma.productIntelligence.create({
    data: {
      userId: user.id,
      chatId: chat.id,
      status: 'completed',
      productAnalysis: {
        name: 'Test Product',
        industry: 'SaaS',
        usp: 'Best-in-class automation',
        summary: 'A product for testing',
        features: ['Feature A', 'Feature B'],
        targetAudience: 'SaaS founders',
      },
      audienceIntelligence: {
        primaryAudience: 'SaaS founders',
        buyerPersonas: [{ name: 'Founder Fay', painPoints: ['time'], goals: ['growth'] }],
      },
      marketDiscovery: {},
    },
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  const chatId = chat.id;

  const results = [];
  const run = async (label, fn) => {
    try {
      const r = await fn();
      results.push({ label, ...r });
      log(`\n=== ${label} === status=${r.status}`);
      if (r.data) log(JSON.stringify(r.data, null, 2).slice(0, 1200));
    } catch (e) {
      results.push({ label, error: e.message });
      log(`\n=== ${label} === ERROR: ${e.message}`);
    }
  };

  await run('GET full-results', () => api('GET', `/chats/${chatId}/full-results`, token));
  await run('GET evidence-readiness', () => api('GET', `/chats/${chatId}/evidence-readiness`, token));
  await run('POST campaign generate', () => api('POST', `/campaign/${chatId}/generate`, token, {}));
  await run('GET campaign plan', () => api('GET', `/campaign/${chatId}/plan`, token));
  await run('POST automation generate', () => api('POST', `/automation/${chatId}/generate`, token, {}));
  await run('GET automation plan', () => api('GET', `/automation/${chatId}/plan`, token));
  await run('GET content brief', () => api('GET', `/automation/${chatId}/content-brief`, token));
  await run('POST content generation', () => api('POST', `/automation/${chatId}/content`, token, { contentType: 'blog_article' }));
  await run('GET content assets', () => api('GET', `/automation/${chatId}/content/assets`, token));

  log('\n=== SUMMARY ===');
  for (const r of results) {
    log(`${r.label}: ${r.status ?? 'ERR(' + r.error + ')'}`);
  }

  // Cleanup
  await prisma.automationAsset.deleteMany({ where: { automationPlan: { chatId } } }).catch(() => {});
  await prisma.automationPlan.deleteMany({ where: { chatId } }).catch(() => {});
  await prisma.campaignPlan.deleteMany({ where: { chatId } }).catch(() => {});
  await prisma.productIntelligence.deleteMany({ where: { chatId } }).catch(() => {});
  await prisma.chat.deleteMany({ where: { id: chatId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {});
  await prisma.$disconnect();
}

const server = spawn('node', ['src/server.js'], { cwd: process.cwd(), stdio: 'ignore', env: process.env });
try {
  await waitForServer();
  await main();
} catch (e) {
  log('FATAL', e);
} finally {
  server.kill('SIGTERM');
}
