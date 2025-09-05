const http = require('http');

// Test rate limiting functionality
async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting...\n');
  
  // Test health endpoint
  console.log('1. Testing /health endpoint:');
  try {
    const healthResponse = await makeRequest('GET', '/health');
    console.log('✅ Health check successful');
    console.log('📊 Rate limiting info:', healthResponse.rate_limiting);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  console.log('\n2. Testing rate limit status for user "test123":');
  try {
    const rateLimitResponse = await makeRequest('GET', '/rate-limit/test123');
    console.log('✅ Rate limit status:', rateLimitResponse);
  } catch (error) {
    console.log('❌ Rate limit check failed:', error.message);
  }
  
  console.log('\n3. Testing webhook with rate limit handling:');
  try {
    const webhookResponse = await makeRequest('POST', '/omi-webhook', {
      session_id: 'test123',
      segments: [
        { text: 'Hey Omi, what time is it?' }
      ]
    });
    console.log('✅ Webhook response:', webhookResponse);
  } catch (error) {
    console.log('❌ Webhook failed:', error.message);
  }
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = data ? JSON.parse(data) : {};
          resolve(response);
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Run test if this file is executed directly
if (require.main === module) {
  testRateLimit().catch(console.error);
}

module.exports = { testRateLimit };
