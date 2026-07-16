#!/usr/bin/env node

/**
 * Provider Audit Script
 * Runs health checks on all AI and research providers
 */

import { logProviderConfig, checkGroqHealth, checkGeminiHealth, checkOpenRouterHealth, checkDataForSeoHealth, checkFirecrawlHealth, checkPageSpeedHealth } from '../src/services/provider-health.service.js';

async function runAudit() {
  console.log('============================================================');
  console.log('PROVIDER AUDIT - Environment Configuration');
  console.log('============================================================\n');
  
  logProviderConfig();
  
  console.log('\n============================================================');
  console.log('PROVIDER AUDIT - Health Checks');
  console.log('============================================================\n');
  
  const checks = [
    checkGroqHealth(),
    checkGeminiHealth(),
    checkOpenRouterHealth(),
    checkDataForSeoHealth(),
    checkFirecrawlHealth(),
    checkPageSpeedHealth(),
  ];
  
  const results = await Promise.allSettled(checks);
  
  const summary = {
    total: checks.length,
    available: 0,
    notConfigured: 0,
    authFailed: 0,
    rateLimited: 0,
    quotaExhausted: 0,
    modelNotFound: 0,
    endpointNotFound: 0,
    networkFailed: 0,
    timeout: 0,
    invalidResponse: 0,
    jsonParseFailed: 0,
  };
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const health = result.value;
      console.log(`[${health.provider}]`);
      console.log(`  Configured: ${health.configured}`);
      console.log(`  Authenticated: ${health.authenticated}`);
      console.log(`  Endpoint Valid: ${health.endpointValid}`);
      console.log(`  Model Valid: ${health.modelValid}`);
      console.log(`  Response Valid: ${health.responseValid}`);
      console.log(`  Status Code: ${health.statusCode}`);
      console.log(`  Failure Type: ${health.failureType}`);
      console.log(`  Message: ${health.message}`);
      console.log('');
      
      summary[health.failureType.toLowerCase()] = (summary[health.failureType.toLowerCase()] || 0) + 1;
      if (health.failureType === 'AVAILABLE') {
        summary.available++;
      }
    } else {
      console.error(`[Check ${index}] Failed:`, result.reason);
    }
  });
  
  console.log('============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(JSON.stringify(summary, null, 2));
  
  console.log('\n============================================================');
  console.log('MANUAL ACTION REQUIRED');
  console.log('============================================================');
  
  if (summary.notConfigured > 0) {
    console.log(`⚠️  ${summary.notConfigured} provider(s) not configured - add API keys to .env`);
  }
  if (summary.authFailed > 0) {
    console.log(`❌ ${summary.authFailed} provider(s) have invalid credentials - replace API keys in Render`);
  }
  if (summary.quotaExhausted > 0) {
    console.log(`💳 ${summary.quotaExhausted} provider(s) have quota exhausted - check billing or upgrade plan`);
  }
  if (summary.modelNotFound > 0) {
    console.log(`🔧 ${summary.modelNotFound} provider(s) have invalid model - update model in .env`);
  }
  if (summary.endpointNotFound > 0) {
    console.log(`🔗 ${summary.endpointNotFound} provider(s) have wrong endpoint - fix endpoint URL`);
  }
  if (summary.available > 0) {
    console.log(`✅ ${summary.available} provider(s) working correctly`);
  }
}

runAudit().catch(console.error);
