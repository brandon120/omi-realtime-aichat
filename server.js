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
    
    // Check if transcript contains "hey omi" (case insensitive)
    if (!fullTranscript.toLowerCase().includes('hey omi')) {
      console.log('⏭️ Skipping transcript - does not contain "hey omi":', fullTranscript);
      return res.status(200).json({ 
        message: 'Transcript ignored - does not contain "hey omi"' 
      });
    }
    
    // Find the segment that contains "hey omi" and get everything after it
    let question = '';
    for (const segment of segments) {
      const segmentText = segment.text.toLowerCase();
      if (segmentText.includes('hey omi')) {
        const heyOmiIndex = segmentText.indexOf('hey omi');
        question = segment.text.substring(heyOmiIndex + 8).trim();
        
        // If this segment doesn't have enough content after "hey omi", 
        // look for content in subsequent segments
        if (!question) {
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
    
    // Send response back to Omi notification API (Updated)
    const omiResponse = await axios.post(
      `https://api.omi.me/v2/integrations/${process.env.OMI_APP_ID}/notification?uid=${encodeURIComponent(session_id)}&message=${encodeURIComponent(aiResponse)}`,
      {}, // Empty body since we're using query parameters
      {
        headers: {
          'Authorization': `Bearer ${process.env.OMI_APP_SECRET}`,
          'Content-Type': 'application/json',
          'Content-Length': '0'
        }
      }
    );
    
    console.log('📤 Successfully sent response to Omi:', omiResponse.status);
    
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
      res.status(error.response.status).json({
        error: 'API Error',
        details: error.response.data
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