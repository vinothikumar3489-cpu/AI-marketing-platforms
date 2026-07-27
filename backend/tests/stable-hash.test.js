import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStableHash } from '../src/utils/stable-hash.js';

describe('createStableHash', () => {
  it('returns empty string for null/undefined', () => {
    assert.equal(createStableHash(null), '');
    assert.equal(createStableHash(undefined), '');
  });

  it('returns deterministic output for the same input', () => {
    const input = { a: 1, b: 2, c: [3, 4, { d: 5 }] };
    const h1 = createStableHash(input);
    const h2 = createStableHash(input);
    assert.equal(h1, h2);
  });

  it('stable key ordering produces same hash regardless of key order', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { z: 3, y: 2, x: 1 };
    assert.equal(createStableHash(a), createStableHash(b));
  });

  it('different inputs produce different hashes', () => {
    const h1 = createStableHash({ name: 'Alice' });
    const h2 = createStableHash({ name: 'Bob' });
    assert.notEqual(h1, h2);
  });

  it('handles string input', () => {
    const h = createStableHash('hello world');
    assert.equal(typeof h, 'string');
    assert.ok(h.length > 0);
  });

  it('handles nested objects', () => {
    const input = {
      company: { name: { value: 'Test' } },
      product: { category: { value: 'SaaS' } },
    };
    const h = createStableHash(input);
    assert.equal(typeof h, 'string');
    assert.ok(h.length > 0);
  });

  it('no process-dependent randomness', () => {
    const input = { foo: 'bar', num: 42, arr: [1, 2, 3] };
    const results = new Set();
    for (let i = 0; i < 10; i++) {
      results.add(createStableHash(input));
    }
    assert.equal(results.size, 1);
  });

  it('works for campaign fingerprint parts', () => {
    const parts = [
      'TestCompany', 'SaaS', 'B2B',
      JSON.stringify(['developers', 'enterprise']),
      'signup', 'freemium', 'self-serve',
      JSON.stringify(['email', 'linkedin'].sort()),
      '',
    ];
    const hash = createStableHash(parts.join('::'));
    assert.equal(typeof hash, 'string');
    assert.ok(hash.length > 0);
    assert.equal(hash, createStableHash(parts.join('::')));
  });
});
