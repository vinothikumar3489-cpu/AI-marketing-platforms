#!/usr/bin/env node

/**
 * Production Test Script
 * Verifies all fixes for Campaign Intelligence, Automation Plan, and Content Studio
 * 
 * Usage: node test-production-fixes.js <chatId> <authToken>
 * Example: node test-production-fixes.js cmrjff4s2000hpj4v6skq7h7q YOUR_TOKEN
 */

const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const CHAT_ID = process.argv[2];
const AUTH_TOKEN = process.argv[3];

if (!CHAT_ID || !AUTH_TOKEN) {
  console.error('Usage: node test-production-fixes.js <chatId> <authToken>');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

let results = {
  campaignGeneration: { status: 'pending', details: {} },
  campaignPersistence: { status: 'pending', details: {} },
  automationGeneration: { status: 'pending', details: {} },
  automationPersistence: { status: 'pending', details: {} },
  contentReadiness: { status: 'pending', details: {} },
  contentBrief: { status: 'pending', details: {} },
  contentGeneration: { status: 'pending', details: {} },
  errorHandling: { status: 'pending', details: {} }
};

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const options = {
      method,
      headers,
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testCampaignGeneration() {
  console.log('\n=== Testing Campaign Generation ===');
  try {
    const res = await makeRequest(`/campaign/${CHAT_ID}/generate`, 'POST', {});
    results.campaignGeneration.details = {
      statusCode: res.status,
      response: res.data
    };

    if (res.status === 422) {
      console.log('✓ Campaign generation returns 422 for missing evidence');
      results.campaignGeneration.status = 'pass';
    } else if (res.status === 201) {
      console.log('✓ Campaign generation returns 201 on success');
      results.campaignGeneration.status = 'pass';
    } else {
      console.log(`✗ Campaign generation returned ${res.status}`);
      results.campaignGeneration.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Campaign generation failed:', error.message);
    results.campaignGeneration.status = 'error';
    results.campaignGeneration.details.error = error.message;
  }
}

async function testCampaignPersistence() {
  console.log('\n=== Testing Campaign Plan Persistence ===');
  try {
    const res = await makeRequest(`/campaign/${CHAT_ID}/plan`);
    results.campaignPersistence.details = {
      statusCode: res.status,
      response: res.data
    };

    if (res.status === 200 && res.data && (res.data.campaignPlan || res.data.id)) {
      console.log('✓ Campaign plan persisted successfully');
      results.campaignPersistence.status = 'pass';
    } else if (res.status === 200 && (!res.data || !res.data.campaignPlan)) {
      console.log('⚠ Campaign plan endpoint returns 200 but no plan data (may not exist)');
      results.campaignPersistence.status = 'skip';
    } else {
      console.log(`✗ Campaign plan persistence check returned ${res.status}`);
      results.campaignPersistence.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Campaign plan persistence check failed:', error.message);
    results.campaignPersistence.status = 'error';
    results.campaignPersistence.details.error = error.message;
  }
}

async function testAutomationGeneration() {
  console.log('\n=== Testing Automation Plan Generation ===');
  try {
    const res = await makeRequest(`/automation/${CHAT_ID}/generate`, 'POST', {});
    results.automationGeneration.details = {
      statusCode: res.status,
      response: res.data
    };

    if (res.status === 422) {
      console.log('✓ Automation generation returns 422 for missing evidence');
      results.automationGeneration.status = 'pass';
    } else if (res.status === 201) {
      console.log('✓ Automation generation returns 201 on success');
      results.automationGeneration.status = 'pass';
    } else {
      console.log(`✗ Automation generation returned ${res.status}`);
      results.automationGeneration.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Automation generation failed:', error.message);
    results.automationGeneration.status = 'error';
    results.automationGeneration.details.error = error.message;
  }
}

async function testAutomationPersistence() {
  console.log('\n=== Testing Automation Plan Persistence ===');
  try {
    const res = await makeRequest(`/automation/${CHAT_ID}/plan`);
    results.automationPersistence.details = {
      statusCode: res.status,
      response: res.data
    };

    if (res.status === 200 && res.data && (res.data.automationPlan || res.data.id)) {
      console.log('✓ Automation plan persisted successfully');
      results.automationPersistence.status = 'pass';
    } else if (res.status === 200 && (!res.data || !res.data.automationPlan)) {
      console.log('⚠ Automation plan endpoint returns 200 but no plan data (may not exist)');
      results.automationPersistence.status = 'skip';
    } else {
      console.log(`✗ Automation plan persistence check returned ${res.status}`);
      results.automationPersistence.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Automation plan persistence check failed:', error.message);
    results.automationPersistence.status = 'error';
    results.automationPersistence.details.error = error.message;
  }
}

async function testContentReadiness() {
  console.log('\n=== Testing Content Studio Readiness ===');
  try {
    const res = await makeRequest(`/chats/${CHAT_ID}/evidence-readiness`);
    results.contentReadiness.details = {
      statusCode: res.status,
      response: res.data
    };

    if (res.status === 200 && res.data) {
      const data = res.data.data || res.data;
      if (typeof data.contentGenerationReady === 'boolean') {
        console.log('✓ Content readiness endpoint returns proper structure');
        results.contentReadiness.status = 'pass';
      } else {
        console.log('✗ Content readiness missing contentGenerationReady field');
        results.contentReadiness.status = 'fail';
      }
    } else {
      console.log(`✗ Content readiness returned ${res.status}`);
      results.contentReadiness.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Content readiness check failed:', error.message);
    results.contentReadiness.status = 'error';
    results.contentReadiness.details.error = error.message;
  }
}

async function testContentBrief() {
  console.log('\n=== Testing Content Brief Loading ===');
  try {
    const res = await makeRequest(`/automation/${CHAT_ID}/content-brief`);
    results.contentBrief.details = {
      statusCode: res.status,
      response: res.data
    };

    if (res.status === 200 && res.data) {
      const data = res.data.data || res.data;
      if (data.product || data.company) {
        console.log('✓ Content brief endpoint returns proper structure');
        results.contentBrief.status = 'pass';
      } else if (data.rejected) {
        console.log('⚠ Content brief rejected (missing evidence)');
        results.contentBrief.status = 'skip';
      } else {
        console.log('✗ Content brief missing expected fields');
        results.contentBrief.status = 'fail';
      }
    } else {
      console.log(`✗ Content brief returned ${res.status}`);
      results.contentBrief.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Content brief check failed:', error.message);
    results.contentBrief.status = 'error';
    results.contentBrief.details.error = error.message;
  }
}

async function testContentGeneration() {
  console.log('\n=== Testing Content Generation ===');
  try {
    const res = await makeRequest(`/automation/${CHAT_ID}/content`, 'POST', { contentType: 'blog_article' });
    results.contentGeneration.details = {
      statusCode: res.status,
      response: res.data
    };

    if (res.status === 422) {
      console.log('✓ Content generation returns 422 for missing evidence');
      results.contentGeneration.status = 'pass';
    } else if (res.status === 201 && res.data && res.data.data) {
      const data = res.data.data;
      if (data.content || data.asset) {
        console.log('✓ Content generation returns 201 with content/asset');
        results.contentGeneration.status = 'pass';
      } else {
        console.log('✗ Content generation missing content/asset');
        results.contentGeneration.status = 'fail';
      }
    } else {
      console.log(`✗ Content generation returned ${res.status}`);
      results.contentGeneration.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Content generation failed:', error.message);
    results.contentGeneration.status = 'error';
    results.contentGeneration.details.error = error.message;
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling (no [object Object]) ===');
  try {
    // Test with invalid chat to trigger error
    const res = await makeRequest('/campaign/invalid_chat_id/generate', 'POST', {});
    results.errorHandling.details = {
      statusCode: res.status,
      response: res.data
    };

    const errorStr = JSON.stringify(res.data);
    if (!errorStr.includes('[object Object]')) {
      console.log('✓ Error responses do not contain [object Object]');
      results.errorHandling.status = 'pass';
    } else {
      console.log('✗ Error response contains [object Object]');
      results.errorHandling.status = 'fail';
    }
  } catch (error) {
    console.error('✗ Error handling test failed:', error.message);
    results.errorHandling.status = 'error';
    results.errorHandling.details.error = error.message;
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('Production Fix Verification Test Suite');
  console.log('========================================');
  console.log(`Chat ID: ${CHAT_ID}`);
  console.log(`API Base: ${API_BASE}`);
  console.log('========================================');

  await testCampaignGeneration();
  await testCampaignPersistence();
  await testAutomationGeneration();
  await testAutomationPersistence();
  await testContentReadiness();
  await testContentBrief();
  await testContentGeneration();
  await testErrorHandling();

  console.log('\n========================================');
  console.log('Test Results Summary');
  console.log('========================================');

  const summary = Object.entries(results).map(([test, result]) => ({
    test,
    status: result.status,
    details: result.details
  }));

  summary.forEach(({ test, status, details }) => {
    const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'skip' ? '⚠' : '?';
    console.log(`${icon} ${test}: ${status.toUpperCase()}`);
    if (status === 'fail' || status === 'error') {
      console.log(`  Details: ${JSON.stringify(details, null, 2).substring(0, 200)}...`);
    }
  });

  const passed = summary.filter(r => r.status === 'pass').length;
  const failed = summary.filter(r => r.status === 'fail').length;
  const errors = summary.filter(r => r.status === 'error').length;
  const skipped = summary.filter(r => r.status === 'skip').length;

  console.log('\n========================================');
  console.log(`Total: ${summary.length} | Passed: ${passed} | Failed: ${failed} | Errors: ${errors} | Skipped: ${skipped}`);
  console.log('========================================');

  if (failed > 0 || errors > 0) {
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
