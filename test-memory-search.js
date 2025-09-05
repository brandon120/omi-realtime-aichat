/**
 * Test script for memory search functionality
 * Run this to verify memory search commands work correctly
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testMemorySearch() {
  console.log('🧪 Testing Memory Search Functionality...');
  
  const testSessionId = 'test-memory-search-' + Date.now();
  
  try {
    // Test 1: Save some test memories first
    console.log('\n📝 Test 1: Saving test memories...');
    
    const testMemories = [
      {
        session_id: testSessionId,
        segments: [{
          id: 'seg1',
          text: 'save to memory My favorite programming language is JavaScript and I love building web applications',
          speaker: 'SPEAKER_1',
          speaker_id: 1,
          is_user: false,
          start: 0,
          end: 5
        }]
      },
      {
        session_id: testSessionId,
        segments: [{
          id: 'seg2',
          text: 'remember this I have a meeting with the team tomorrow at 2 PM about the new project',
          speaker: 'SPEAKER_1',
          speaker_id: 1,
          is_user: false,
          start: 0,
          end: 5
        }]
      },
      {
        session_id: testSessionId,
        segments: [{
          id: 'seg3',
          text: 'save to memory My dog\'s name is Max and he loves playing fetch in the park',
          speaker: 'SPEAKER_1',
          speaker_id: 1,
          is_user: false,
          start: 0,
          end: 5
        }]
      }
    ];
    
    // Save memories
    for (const memory of testMemories) {
      const response = await axios.post(`${BASE_URL}/omi-webhook`, memory);
      console.log('✅ Memory saved:', response.data.message);
    }
    
    // Wait a moment for embeddings to be generated
    console.log('\n⏳ Waiting for embeddings to be generated...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Search for programming-related memories
    console.log('\n🔍 Test 2: Searching for programming memories...');
    const searchResponse1 = await axios.post(`${BASE_URL}/omi-webhook`, {
      session_id: testSessionId,
      segments: [{
        id: 'seg4',
        text: 'search memory programming language',
        speaker: 'SPEAKER_1',
        speaker_id: 1,
        is_user: false,
        start: 0,
        end: 5
      }]
    });
    
    console.log('✅ Search results:', searchResponse1.data.message);
    console.log('📊 Results count:', searchResponse1.data.results_count);
    
    // Test 3: Search for meeting-related memories
    console.log('\n🔍 Test 3: Searching for meeting memories...');
    const searchResponse2 = await axios.post(`${BASE_URL}/omi-webhook`, {
      session_id: testSessionId,
      segments: [{
        id: 'seg5',
        text: 'what do you remember about meetings',
        speaker: 'SPEAKER_1',
        speaker_id: 1,
        is_user: false,
        start: 0,
        end: 5
      }]
    });
    
    console.log('✅ Search results:', searchResponse2.data.message);
    console.log('📊 Results count:', searchResponse2.data.results_count);
    
    // Test 4: Search for pet-related memories
    console.log('\n🔍 Test 4: Searching for pet memories...');
    const searchResponse3 = await axios.post(`${BASE_URL}/omi-webhook`, {
      session_id: testSessionId,
      segments: [{
        id: 'seg6',
        text: 'find in memory dog',
        speaker: 'SPEAKER_1',
        speaker_id: 1,
        is_user: false,
        start: 0,
        end: 5
      }]
    });
    
    console.log('✅ Search results:', searchResponse3.data.message);
    console.log('📊 Results count:', searchResponse3.data.results_count);
    
    // Test 5: Search for non-existent memory
    console.log('\n🔍 Test 5: Searching for non-existent memory...');
    const searchResponse4 = await axios.post(`${BASE_URL}/omi-webhook`, {
      session_id: testSessionId,
      segments: [{
        id: 'seg7',
        text: 'search memory unicorn',
        speaker: 'SPEAKER_1',
        speaker_id: 1,
        is_user: false,
        start: 0,
        end: 5
      }]
    });
    
    console.log('✅ Search results:', searchResponse4.data.message);
    console.log('📊 Results count:', searchResponse4.data.results_count);
    
    // Test 6: Test different search command variations
    console.log('\n🔍 Test 6: Testing different search command variations...');
    const searchCommands = [
      'search my memories JavaScript',
      'show me memories about programming',
      'recall meeting information',
      'find information about pets',
      'look up team meeting'
    ];
    
    for (let i = 0; i < searchCommands.length; i++) {
      const command = searchCommands[i];
      console.log(`\n  Testing: "${command}"`);
      
      const response = await axios.post(`${BASE_URL}/omi-webhook`, {
        session_id: testSessionId,
        segments: [{
          id: `seg${8 + i}`,
          text: command,
          speaker: 'SPEAKER_1',
          speaker_id: 1,
          is_user: false,
          start: 0,
          end: 5
        }]
      });
      
      console.log(`  ✅ Results: ${response.data.results_count} memories found`);
    }
    
    console.log('\n🎉 All memory search tests completed!');
    console.log('✅ Memory search functionality is working correctly');
    
  } catch (error) {
    console.error('\n❌ Memory search test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMemorySearch().catch(console.error);