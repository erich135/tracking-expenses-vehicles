// Quick production API test
// Usage: node test-prod-api.js

const API_URL = 'https://ars.lmwfinance.app/api/reports-monthly';

async function testPublicAccess() {
  console.log('1. Testing public access (should fail with 401)...');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: 2024, month: 12 }),
    });
    const data = await res.json();
    if (res.status === 401) {
      console.log('✅ Public access blocked correctly (401)');
    } else {
      console.log(`❌ Unexpected response: ${res.status}`, data);
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

async function testWithToken(token) {
  console.log('\n2. Testing with valid token...');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ year: 2024, month: 12 }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      console.log('✅ Authenticated access works');
      console.log(`   - Costing entries: ${data.costing?.length || 0}`);
      console.log(`   - Rental entries: ${data.rental?.length || 0}`);
      console.log(`   - SLA entries: ${data.sla?.length || 0}`);
    } else {
      console.log(`❌ Failed: ${res.status}`, data);
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

async function main() {
  console.log('Testing Production Monthly Report API\n');
  console.log('API:', API_URL, '\n');
  
  await testPublicAccess();
  
  console.log('\n' + '='.repeat(60));
  console.log('To test authenticated access:');
  console.log('1. Login at https://ars.lmwfinance.app/login');
  console.log('2. Open DevTools → Application → Local Storage');
  console.log('3. Find "sb-wvbmgdrsxqsmlvpzxqrx-auth-token"');
  console.log('4. Copy the "access_token" value');
  console.log('5. Run: node test-prod-api.js YOUR_TOKEN_HERE');
  console.log('='.repeat(60));
  
  const token = process.argv[2];
  if (token) {
    await testWithToken(token);
  }
}

main();
