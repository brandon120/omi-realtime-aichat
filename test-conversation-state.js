/**
 * Test script to demonstrate conversation state management
 * This script simulates multiple interactions with the AI to show how context is maintained
 * 
 * Usage:
 * - Local: node test-conversation-state.js
 * - Railway: RAILWAY_URL=https://your-app.railway.app node test-conversation-state.js
 */

const https = require('https');

// Configuration
const SERVER_URL = process.env.RAILWAY_URL || 'http://localhost:3000';
const TEST_SESSION_ID = 'test-conversation-session-123';

/**
 * Simulates sending a message to the Omi webhook
 */
async function sendMessage(message) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            session_id: TEST_SESSION_ID,
            segments: [
                {
                    text: message,
                    start: Date.now() / 1000 - 1,
                    end: Date.now() / 1000
                }
            ]
        });

        const url = new URL(SERVER_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: '/omi-webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Gets conversation history for the test session
 */
async function getConversationHistory() {
    return new Promise((resolve, reject) => {
        const url = new URL(SERVER_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: `/conversation/${TEST_SESSION_ID}`,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Main test function
 */
async function testConversationState() {
    console.log('🧪 Testing Conversation State Management');
    console.log('=====================================\n');

    try {
        // Test 1: Initial question
        console.log('📝 Test 1: Initial question about weather');
        const response1 = await sendMessage('Hey Omi, what is the weather like in New York?');
        console.log('Response:', response1.message || response1.raw);
        console.log('Context maintained:', response1.conversation_context);
        console.log('');

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 2: Follow-up question (should maintain context)
        console.log('📝 Test 2: Follow-up question (should remember previous context)');
        const response2 = await sendMessage('What about the temperature?');
        console.log('Response:', response2.message || response2.raw);
        console.log('Context maintained:', response2.conversation_context);
        console.log('');

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 3: Another follow-up (should maintain full context)
        console.log('📝 Test 3: Another follow-up (should remember both previous questions)');
        const response3 = await sendMessage('Is it raining there?');
        console.log('Response:', response3.message || response3.raw);
        console.log('Context maintained:', response3.conversation_context);
        console.log('');

        // Check conversation history
        console.log('📚 Checking conversation history:');
        const history = await getConversationHistory();
        console.log('Session ID:', history.session_id);
        console.log('Message count:', history.message_count);
        console.log('Has context:', history.has_context);
        console.log('History:', JSON.stringify(history.conversation_history, null, 2));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testConversationState().then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test error:', error);
        process.exit(1);
    });
}

module.exports = { testConversationState, sendMessage, getConversationHistory };
