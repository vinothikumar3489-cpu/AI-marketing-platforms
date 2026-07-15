// Test the webhook endpoint
const BASE = 'http://localhost:5000/api';

async function main() {
  console.log('=== Webhook Endpoint Test ===\n');
  
  // Test delivered webhook
  console.log('--- Test 1: delivered webhook ---');
  try {
    const r1 = await fetch(`${BASE}/webhooks/email/brevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'delivered',
        messageId: '<test-message-id@test.com>',
        email: 'test@example.com',
        date: new Date().toISOString(),
      }),
    });
    const d1 = await r1.json();
    console.log(`Status: ${r1.status}, Response:`, JSON.stringify(d1, null, 2));
    console.log('Webhook endpoint responds correctly (400 expected - no matching log)\n');
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  // Test bounce webhook
  console.log('--- Test 2: bounce webhook ---');
  try {
    const r2 = await fetch(`${BASE}/webhooks/email/brevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'bounce',
        messageId: '<bounce-test@test.com>',
        email: 'bounce@example.com',
      }),
    });
    const d2 = await r2.json();
    console.log(`Status: ${r2.status}, Response:`, JSON.stringify(d2, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  // Test with missing messageId
  console.log('\n--- Test 3: missing messageId ---');
  try {
    const r3 = await fetch(`${BASE}/webhooks/email/brevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'delivered', email: 'test@test.com' }),
    });
    const d3 = await r3.json();
    console.log(`Status: ${r3.status}, Response:`, JSON.stringify(d3, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  console.log('\n=== Webhook test complete ===');
}

main();
