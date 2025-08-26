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
    
    const { transcript, user_id } = req.body;
    
    // Validate required fields
    if (!transcript || !user_id) {
      console.error('❌ Missing required fields:', { transcript, user_id });
      return res.status(400).json({ 
        error: 'Missing required fields: transcript and user_id are required' 
      });
    }
    
    // Check if transcript starts with "hey omi"
    if (!transcript.toLowerCase().startsWith('hey omi')) {
      console.log('⏭️ Skipping transcript - does not start with "hey omi":', transcript);
      return res.status(200).json({ 
        message: 'Transcript ignored - does not start with "hey omi"' 
      });
    }
    
    // Extract the question (everything after "hey omi")
    const question = transcript.substring(8).trim();
    
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
    
    // Send response back to Omi notification API
    const omiResponse = await axios.post('https://api.omi.me/notify', {
      user_id: user_id,
      message: aiResponse
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OMI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 Successfully sent response to Omi:', omiResponse.status);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Question processed and response sent to Omi',
      question: question,
      ai_response: aiResponse,
      omi_status: omiResponse.status
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Handle specific error types
    if (error.response) {
      // API error response
      console.error('API Error:', error.response.status, error.response.data);
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
  
  // Check environment variables
  if (!process.env.OPENAI_KEY) {
    console.warn('⚠️  OPENAI_KEY environment variable is not set');
  }
  if (!process.env.OMI_API_KEY) {
    console.warn('⚠️  OMI_API_KEY environment variable is not set');
  }
  
  console.log('✅ Server ready to receive Omi webhooks');
});
