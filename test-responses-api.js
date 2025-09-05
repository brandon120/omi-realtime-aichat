const http = require('http');

// Test the new OpenAI Responses API integration
async function testResponsesAPI() {
  console.log('🧪 Testing OpenAI Responses API Integration...\n');
  
  // Test health endpoint to see API info
  console.log('1. Testing /health endpoint:');
  try {
    const healthResponse = await makeRequest('GET', '/health');
    console.log('✅ Health check successful');
    console.log('📊 API info:', healthResponse.api);
    console.log('📊 Rate limiting info:', healthResponse.rate_limiting);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test webhook with a question that would benefit from web search
  console.log('\n2. Testing webhook with current time question:');
  try {
    const webhookResponse = await makeRequest('POST', '/omi-webhook', {
      session_id: 'test123',
      segments: [
        { text: 'Hey Omi, what time is it in New York right now?' }
      ]
    });
    console.log('✅ Webhook response received');
    console.log('🤖 AI Response:', webhookResponse.message);
    console.log('📊 Response details:', {
      success: webhookResponse.success,
      question: webhookResponse.question,
      session_id: webhookResponse.session_id
    });
  } catch (error) {
    console.log('❌ Webhook failed:', error.message);
  }
  
  // Test natural language detection
  console.log('\n3. Testing natural language detection:');
  try {
    const naturalResponse = await makeRequest('POST', '/omi-webhook', {
      session_id: 'test456',
      segments: [
        { text: 'What is the current weather in London?' }
      ]
    });
    console.log('✅ Natural language response received');
    console.log('🤖 AI Response:', naturalResponse.message);
  } catch (error) {
    console.log('❌ Natural language test failed:', error.message);
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
  testResponsesAPI().catch(console.error);
}

module.exports = { testResponsesAPI };
