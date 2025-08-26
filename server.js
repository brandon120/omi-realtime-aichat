const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Omi AI Chat Plugin is running' });
});

// Main Omi webhook endpoint
app.post('/omi-webhook', async (req, res) => {
  try {
    console.log('📥 Received webhook from Omi:', JSON.stringify(req.body, null, 2));
    
    const { session_id, segments } = req.body;
    
    // Validate required fields
    if (!session_id || !segments || !Array.isArray(segments)) {
      console.error('❌ Missing required fields:', { session_id, segments });
      return res.status(400).json({ 
        error: 'Missing required fields: session_id and segments array are required' 
      });
    }
    
    // Extract all text from segments and join them
    const fullTranscript = segments
      .map(segment => segment.text)
      .join(' ')
      .trim();
    
    console.log('📝 Full transcript:', fullTranscript);
    
    // Check if transcript contains both "hey" and "omi" (case insensitive)
    const transcriptLower = fullTranscript.toLowerCase();
    const hasHey = transcriptLower.includes('hey');
    const hasOmi = transcriptLower.includes('omi');
    
    console.log('🔍 Checking for trigger words:', { hasHey, hasOmi });
    
    if (!hasHey || !hasOmi) {
      console.log('⏭️ SKIPPING - Missing required trigger words. Transcript:', fullTranscript);
      console.log('📤 NO NOTIFICATION will be sent');
      return res.status(200).json({ 
        message: 'Transcript ignored - does not contain both "hey" and "omi"',
        trigger_words_found: { hasHey, hasOmi }
      });
    }
    
    console.log('✅ TRIGGER WORDS FOUND - Both "hey" and "omi" detected');
    console.log('📤 NOTIFICATION WILL BE SENT after processing');
    
    // Find the segment that contains "hey" and get everything after it
    let question = '';
    for (const segment of segments) {
      const segmentText = segment.text.toLowerCase();
      if (segmentText.includes('hey')) {
        const heyIndex = segmentText.indexOf('hey');
        question = segment.text.substring(heyIndex + 3).trim(); // Remove "hey" and trim
        
        // If this segment doesn't have enough content after "hey", 
        // look for content in subsequent segments
        if (!question || question.length < 5) { // Less than 5 chars probably isn't a real question
          const currentIndex = segments.indexOf(segment);
          const remainingSegments = segments.slice(currentIndex + 1);
          question = remainingSegments
            .map(s => s.text)
            .join(' ')
            .trim();
        }
        break;
      }
    }
    
    // Clean up the question - remove "omi" and any punctuation around it
    if (question) {
      question = question.replace(/^[,.\s]*omi[,.\s]*/i, '').trim();
    }
    
    if (!question) {
      console.log('⏭️ Skipping transcript - no question after "hey omi"');
      return res.status(200).json({ 
        message: 'Transcript ignored - no question provided' 
      });
    }
    
    console.log('🤖 Processing question:', question);
    
    // Send question to OpenAI GPT-4
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.'
        },
        {
          role: 'user',
          content: question
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const aiResponse = openaiResponse.choices[0].message.content;
    console.log('✨ OpenAI response:', aiResponse);
    
    // ONLY REACH THIS POINT IF: both trigger words found AND valid question extracted
    // Now we can safely send the notification
    console.log('📤 Sending notification to Omi...');
    console.log('🔑 Debug - App ID:', process.env.OMI_APP_ID);
    console.log('🔑 Debug - App Secret length:', process.env.OMI_APP_SECRET ? process.env.OMI_APP_SECRET.length : 'undefined');
    console.log('🔑 Debug - Session ID:', session_id);
    console.log('🔑 Debug - Message length:', aiResponse.length);
    
    // Send notification using exact format from Omi documentation
    const omiResponse = await axios.post(
      `https://api.omi.me/v2/integrations/${process.env.OMI_APP_ID}/notification?uid=${encodeURIComponent(session_id)}&message=${encodeURIComponent(aiResponse)}`,
      {}, // Empty body as required by documentation
      {
        headers: {
          'Authorization': `Bearer ${process.env.OMI_APP_SECRET}`,
          'Content-Type': 'application/json',
          'Content-Length': 0  // Fixed: should be number 0, not string '0'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('📤 Successfully sent response to Omi:', omiResponse.status);
    console.log('📤 Omi response data:', omiResponse.data);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Question processed and response sent to Omi',
      question: question,
      ai_response: aiResponse,
      omi_status: omiResponse.status,
      session_id: session_id
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Handle specific error types
    if (error.response) {
      // API error response
      console.error('API Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config?.url
      });
      
      // Special handling for Omi API errors
      if (error.response.status === 401) {
        console.error('🔐 OMI API AUTHENTICATION ERROR:');
        console.error('   - Check if OMI_APP_ID is correct');
        console.error('   - Check if OMI_APP_SECRET is correct');
        console.error('   - Verify the App Secret has notification permissions');
        console.error('   - Current App ID:', process.env.OMI_APP_ID);
        console.error('   - Current App Secret length:', process.env.OMI_APP_SECRET ? process.env.OMI_APP_SECRET.length : 'undefined');
      }
      
      res.status(error.response.status).json({
        error: 'API Error',
        details: error.response.data,
        status: error.response.status
      });
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.request);
      res.status(500).json({
        error: 'Network Error',
        message: 'Failed to make request to external API'
      });
    } else {
      // Other errors
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on the server'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Omi AI Chat Plugin server started');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/omi-webhook`);
  
  // Check environment variables (Updated)
  if (!process.env.OPENAI_KEY) {
    console.warn('⚠️  OPENAI_KEY environment variable is not set');
  }
  if (!process.env.OMI_APP_ID) {
    console.warn('⚠️  OMI_APP_ID environment variable is not set');
  }
  if (!process.env.OMI_APP_SECRET) {
    console.warn('⚠️  OMI_APP_SECRET environment variable is not set');
  }
  
  console.log('✅ Server ready to receive Omi webhooks');
});
