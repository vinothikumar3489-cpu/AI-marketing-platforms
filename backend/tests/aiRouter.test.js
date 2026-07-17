import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

before(() => {
  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
});

after(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

function groqOkResponse(data) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(data || { test: true }) } }] }),
  };
}

function geminiOkResponse(data) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: JSON.stringify(data || { test: true }) }] } }] }),
  };
}

function providerError(status) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message: 'error' } }),
  };
}

describe('aiRouter - provider fallback chain', () => {
  it('returns groq result on first provider success', async () => {
    mock.method(global, 'fetch', () => Promise.resolve(groqOkResponse({ msg: 'ok' })));

    const { callAI } = await import('../src/ai/services/aiRouter.service.js');
    const result = await callAI('test');
    assert.equal(result.success, true);
    assert.equal(result.provider, 'groq');
    assert.deepEqual(result.data, { msg: 'ok' });

    mock.restoreAll();
  });

  it('falls through all providers when all return 500', async () => {
    mock.method(global, 'fetch', () => Promise.resolve(providerError(500)));

    const { callAI } = await import('../src/ai/services/aiRouter.service.js');
    const result = await callAI('test');
    assert.equal(result.success, false);
    assert.equal(result.diagnostics.length, 4);

    mock.restoreAll();
  });

  it('recovers from Groq 429 to Gemini', async () => {
    let callCount = 0;
    mock.method(global, 'fetch', () => {
      callCount++;
      if (callCount === 1) return Promise.resolve(providerError(429));
      return Promise.resolve(geminiOkResponse({ msg: 'gemini-ok' }));
    });

    const { callAI } = await import('../src/ai/services/aiRouter.service.js');
    const result = await callAI('test');
    assert.equal(result.success, true);
    assert.equal(result.provider, 'gemini');
    assert.deepEqual(result.data, { msg: 'gemini-ok' });

    mock.restoreAll();
  });
});
