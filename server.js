const express = require('express');
const https = require('https');
const OpenAI = require('openai');
require('dotenv').config();

/**
 * Omi AI Chat Plugin Server
 * 
 * TRIGGER PHRASES: Users must start their message with one of these to activate the AI:
 * - "Hey Omi" (most common)
 * - "Hey, Omi" (with comma)
 * - "Hey Omi," (with trailing comma)
 * - "Hey, Omi," (with both commas)
 * 
 * HELP KEYWORDS: Users can ask for help using these words:
 * - "help", "what can you do", "how to use", "instructions", "guide"
 * - "what do you do", "how does this work", "what are the commands"
 * - "keywords", "trigger words", "how to talk to you"
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// Create an assistant with web search capability
let assistant = null;
async function createAssistant() {
  try {
    assistant = await openai.beta.assistants.create({
      name: "Omi AI Assistant",
      instructions: "You are a helpful AI assistant. Use web search when needed to provide accurate, up-to-date information.",
      model: "gpt-4o",
      tools: [
        {
          type: "function",
          function: {
            name: "searchWeb",
            description: "Performs a real-time web search for the user's query.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query." }
              },
              required: ["query"]
            }
          }
        }
      ],
    });
    console.log('✅ Created OpenAI assistant with web search function:', assistant.id);
  } catch (error) {
    console.error('❌ Failed to create assistant:', error);
  }
}

/**
 * Sends a direct notification to an Omi user.
 * @param {string} userId - The Omi user's unique ID
 * @param {string} message - The notification text
 * @returns {Promise<object>} Response data or error
 */
function sendOmiNotification(userId, message) {
    const appId = process.env.OMI_APP_ID;
    const appSecret = process.env.OMI_APP_SECRET;

    if (!appId) throw new Error("OMI_APP_ID not set");
    if (!appSecret) throw new Error("OMI_APP_SECRET not set");

    const options = {
        hostname: 'api.omi.me',
        path: `/v2/integrations/${appId}/notification?uid=${encodeURIComponent(userId)}&message=${encodeURIComponent(message)}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${appSecret}`,
            'Content-Type': 'application/json',
            'Content-Length': 0
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve({ raw: data });
                    }
                } else {
                    reject(new Error(`API Error (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

/**
 * Performs a web search using DuckDuckGo (free, no API key required)
 * @param {string} query - The search query
 * @returns {Promise<object>} Search results
 */
async function performWebSearch(query) {
    try {
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        
        return new Promise((resolve, reject) => {
            const req = https.get(searchUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const results = JSON.parse(data);
                        resolve(results);
                    } catch (e) {
                        reject(new Error('Failed to parse search results'));
                    }
                });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Search timeout')));
        });
    } catch (error) {
        console.error('❌ Web search error:', error);
        return { error: 'Search failed', message: error.message };
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Omi AI Chat Plugin is running',
    trigger_phrases: [
      'Hey Omi',
      'Hey, Omi', 
      'Hey omi,',
      'Hey, omi,'
    ],
    help_keywords: [
      'help', 'what can you do', 'how to use', 'instructions', 'guide',
      'what do you do', 'how does this work', 'what are the commands',
      'keywords', 'trigger words', 'how to talk to you'
    ],
    example_usage: 'Hey Omi, what is the weather like in Sydney, Australia?'
  });
});

// Help endpoint
app.get('/help', (req, res) => {
  res.status(200).json({
    title: 'Omi AI Chat Plugin - How to Use',
    description: 'Learn how to interact with the Omi AI assistant',
    trigger_phrases: {
      description: 'Start your message with one of these phrases to activate the AI:',
      phrases: [
        'Hey Omi',
        'Hey, Omi', 
        'Hey Omi,',
        'Hey, Omi,'
      ]
    },
    examples: [
      'Hey Omi, what is the weather like in Sydney, Australia?',
      'Hey, Omi, can you help me solve a math problem?',
      'Hey Omi, what are the latest news headlines?',
      'Hey, Omi, how do I make a chocolate cake?'
    ],
    help_keywords: {
      description: 'You can also ask for help using these words:',
      keywords: [
        'help', 'what can you do', 'how to use', 'instructions', 'guide',
        'what do you do', 'how does this work', 'what are the commands',
        'keywords', 'trigger words', 'how to talk to you'
      ]
    },
    note: 'The AI will only respond when you use the trigger phrases. Regular messages without these phrases will be ignored unless you\'re asking for help.'
  });
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
    
    // Check if transcript contains "hey omi" or similar variations (case insensitive)
    const transcriptLower = fullTranscript.toLowerCase();
    const hasHeyOmi = transcriptLower.includes('hey omi') || 
                      transcriptLower.includes('hey, omi') ||
                      transcriptLower.includes('hey omi,') ||
                      transcriptLower.includes('hey, omi,');
    
    // Check if user is asking for help or instructions
    const helpKeywords = [
      'help', 'what can you do', 'how to use', 'instructions', 'guide',
      'what do you do', 'how does this work', 'what are the commands',
      'keywords', 'trigger words', 'how to talk to you'
    ];
    
    const isAskingForHelp = helpKeywords.some(keyword => 
      transcriptLower.includes(keyword)
    );
    
    if (!hasHeyOmi) {
      if (isAskingForHelp) {
        // User is asking for help, provide helpful response
        const helpMessage = `Hi! I'm Omi, your AI assistant. To talk to me, start your message with "Hey Omi" or "Hey, Omi" followed by your question. For example: "Hey Omi, what's the weather like?" or "Hey, Omi, can you help me with math?"`;
        
        console.log('💡 User asked for help, providing instructions');
        return res.status(200).json({ 
          message: 'Start your message with "Hey Omi" to get help from the AI assistant',
          help_response: helpMessage,
          instructions: 'Start your message with "Hey Omi" to get help from the AI assistant.'
        });
             } else {
         // User didn't use trigger phrase and isn't asking for help - silently ignore
         console.log('⏭️ Skipping transcript - does not contain "hey omi" and no help requested:', fullTranscript);
         return res.status(200).json({}); // Return empty response - no message
       }
    }
    
    // Find the segment that contains "hey omi" or similar and get everything after it
    let question = '';
    for (const segment of segments) {
      const segmentText = segment.text.toLowerCase();
      
      // Define all possible variations of "hey omi"
      const heyOmiPatterns = ['hey, omi', 'hey omi,', 'hey, omi,', 'hey omi', 'Hey, Omi', 'Hey Omi.', 'Hey Omi,'];
      
      // Find which pattern exists in this segment
      let foundPattern = null;
      let patternIndex = -1;
      
      for (const pattern of heyOmiPatterns) {
        if (segmentText.includes(pattern)) {
          foundPattern = pattern;
          patternIndex = segmentText.indexOf(pattern);
          break;
        }
      }
      
      if (foundPattern) {
        // Extract the question after the found pattern
        question = segment.text.substring(patternIndex + foundPattern.length).trim();
        
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
    
    // Use OpenAI Assistants API with built-in web search
    console.log('🤖 Using OpenAI Assistant with web search for:', question);
    
    let aiResponse = '';
    
         try {
         // Create a thread
         const thread = await openai.beta.threads.create();
         
         // Add the user's question to the thread
         await openai.beta.threads.messages.create(thread.id, {
             role: "user",
             content: question,
         });
         
         // Run the assistant
         const run = await openai.beta.threads.runs.create(thread.id, {
             assistant_id: assistant.id,
         });
         
         // Wait for the run to complete or require action
         let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
         while (runStatus.status === "in_progress" || runStatus.status === "queued") {
             await new Promise(resolve => setTimeout(resolve, 1000));
             runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
         }
         
         // Handle tool calls if required
         if (runStatus.status === "requires_action" && runStatus.required_action?.type === "submit_tool_outputs") {
             console.log('🔍 Tool call required, processing searchWeb function');
             
             const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
             const toolOutputs = [];
             
             for (const toolCall of toolCalls) {
                 if (toolCall.function.name === "searchWeb") {
                     try {
                         const args = JSON.parse(toolCall.function.arguments);
                         const query = args.query;
                         
                         console.log('🔍 Searching web for:', query);
                         const results = await performWebSearch(query);
                         
                         // Extract summary from search results
                         const summary = results?.Abstract || results?.RelatedTopics?.[0]?.Text || "No relevant information found.";
                         
                         toolOutputs.push({
                             tool_call_id: toolCall.id,
                             output: summary
                         });
                         
                         console.log('✨ Web search completed, summary:', summary);
                     } catch (error) {
                         console.error('❌ Error processing searchWeb tool call:', error);
                         toolOutputs.push({
                             tool_call_id: toolCall.id,
                             output: "Search failed. Please try again later."
                         });
                     }
                 }
             }
             
             // Submit tool outputs
             if (toolOutputs.length > 0) {
                 await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
                     tool_outputs: toolOutputs
                 });
                 
                 // Wait for the assistant to finish processing
                 runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
                 while (runStatus.status === "in_progress" || runStatus.status === "queued") {
                     await new Promise(resolve => setTimeout(resolve, 1000));
                     runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
                 }
             }
         }
         
         // Get the final response
         const messages = await openai.beta.threads.messages.list(thread.id);
         aiResponse = messages.data[0].content[0].text.value;
         
         console.log('✨ OpenAI Assistant response:', aiResponse);
         
     } catch (error) {
         console.error('❌ OpenAI Assistant error:', error);
         // Fallback to regular chat completion
         const openaiResponse = await openai.chat.completions.create({
             model: 'gpt-4',
             messages: [
                 { role: 'system', content: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.' },
                 { role: 'user', content: question }
             ],
             max_tokens: 800,
             temperature: 0.7,
         });
         aiResponse = openaiResponse.choices[0].message.content;
         console.log('✨ Fallback OpenAI response:', aiResponse);
     }
    
    // Send response back to Omi using the new function
    const omiResponse = await sendOmiNotification(session_id, aiResponse);
    
    console.log('📤 Successfully sent response to Omi:', omiResponse);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: aiResponse,
      question: question,
      ai_response: aiResponse,
      omi_response: omiResponse,
      session_id: session_id
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Handle specific error types
    if (error.message && error.message.includes('API Error')) {
      // Omi API error response
      console.error('Omi API Error:', error.message);
      res.status(500).json({
        error: 'Omi API Error',
        message: error.message
      });
    } else if (error.message && (error.message.includes('OMI_APP_ID not set') || error.message.includes('OMI_APP_SECRET not set'))) {
      // Configuration error
      console.error('Configuration Error:', error.message);
      res.status(500).json({
        error: 'Configuration Error',
        message: error.message
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
app.listen(PORT, async () => {
  console.log('🚀 Omi AI Chat Plugin server started');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Help & instructions: http://localhost:${PORT}/help`);
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
  
  // Create OpenAI assistant with web search
  await createAssistant();
  
  console.log('✅ Server ready to receive Omi webhooks');
});