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
  let mod;
  before(async () => {
    mod = await import('../src/domains/ai/services/aiOrchestrator.service.js');
  });

  it('returns groq result on first provider success', async () => {
    const orchestrator = mod.getAIOrchestrator();
    mock.method(orchestrator, '_callOpenAICompatible', () => Promise.resolve({ content: JSON.stringify({ msg: 'ok' }), usage: {} }));
    
    const result = await mod.callAI('test');
    assert.equal(result.success, true);
    assert.equal(result.provider, 'groq');
    assert.deepEqual(result.data, { msg: 'ok' });

    mock.restoreAll();
  });

  it('falls through all providers when all return 500', async () => {
    const orchestrator = mod.getAIOrchestrator();
    mock.method(orchestrator, '_callOpenAICompatible', () => Promise.reject(new Error('500')));
    mock.method(orchestrator, '_callGemini', () => Promise.reject(new Error('500')));

    const result = await mod.callAI('test');
    assert.equal(result.success, false);
    // diagnostics is no longer returned in callAI. Check error message.
    assert.ok(result.error.includes('All AI providers failed'));

    mock.restoreAll();
  });

  it('recovers from Groq error to Gemini', async () => {
    const orchestrator = mod.getAIOrchestrator();
    let groqCalls = 0;
    mock.method(orchestrator, '_callOpenAICompatible', () => {
      groqCalls++;
      return Promise.reject(new Error('429'));
    });
    mock.method(orchestrator, '_callGemini', () => Promise.resolve({ content: JSON.stringify({ msg: 'gemini-ok' }), usage: {} }));

    const result = await mod.callAI('test');
    assert.equal(result.success, true);
    assert.equal(result.provider, 'gemini');
    assert.deepEqual(result.data, { msg: 'gemini-ok' });

    mock.restoreAll();
  });
});
