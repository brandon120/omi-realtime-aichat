# Omi Real-Time AI Chat Plugin

A Node.js backend plugin for Omi that provides real-time AI chat capabilities using OpenAI's GPT-4 model. When users say "hey omi" followed by a question, the plugin automatically processes the question through GPT-4 and sends the response back to the user via Omi's notification system.

## 🚀 Features

- **Voice Activation**: Listens for transcripts starting with "hey omi"
- **GPT-4 Integration**: Uses OpenAI's latest GPT-4 model for intelligent responses
- **Real-time Notifications**: Sends responses back to users through Omi's notification API
- **Error Handling**: Comprehensive error handling and logging
- **Health Monitoring**: Built-in health check endpoint
- **Railway Ready**: Optimized for Railway deployment

## 📋 Prerequisites

- Node.js 18+ installed
- OpenAI API key
- Omi API key
- Railway account (for deployment)

## 🛠️ Local Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd omi-realtime-aichat
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your API keys:

```bash
cp env.example .env
```

Edit `.env` with your actual API keys:

```env
OPENAI_KEY=sk-your-openai-api-key-here
OMI_API_KEY=your-omi-api-key-here
PORT=3000
```

### 3. Run Locally

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

### 4. Test the Webhook

You can test the webhook locally using curl or Postman:

```bash
curl -X POST http://localhost:3000/omi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "hey omi what is the weather like today?",
    "user_id": "test_user_123"
  }'
```

## 🚀 Railway Deployment

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Initialize Railway Project

```bash
railway init
```

### 4. Set Environment Variables

```bash
railway variables set OPENAI_KEY=sk-your-openai-api-key-here
railway variables set OMI_API_KEY=your-omi-api-key-here
```

### 5. Deploy

```bash
railway up
```

### 6. Get Your Webhook URL

```bash
railway domain
```

Your webhook URL will be: `https://your-app-name.railway.app/omi-webhook`

## 🔌 Omi Plugin Registration

### 1. Access Omi Plugin Dashboard

1. Go to [Omi Plugin Dashboard](https://omi.me/plugins)
2. Click "Create New Plugin"

### 2. Plugin Configuration

- **Plugin Name**: Omi AI Chat
- **Description**: Real-time AI chat using GPT-4
- **Webhook URL**: `https://your-app-name.railway.app/omi-webhook`
- **Trigger Phrase**: `hey omi`
- **Permissions**: 
  - Read transcripts
  - Send notifications

### 3. Webhook Payload Format

The plugin expects webhook payloads in this format:

```json
{
  "transcript": "hey omi what is artificial intelligence?",
  "user_id": "user_12345"
}
```

### 4. Response Format

The plugin responds with:

```json
{
  "success": true,
  "message": "Question processed and response sent to Omi",
  "question": "what is artificial intelligence?",
  "ai_response": "Artificial intelligence (AI) is...",
  "omi_status": 200
}
```

## 📊 Monitoring and Health Checks

### Health Check Endpoint

```
GET /health
```

Returns server status and confirms the plugin is running.

### Logging

The plugin provides comprehensive logging:
- 📥 Incoming webhooks
- 🤖 AI processing status
- 📤 Omi notification status
- ❌ Error details
- ⚠️ Environment variable warnings

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_KEY` | OpenAI API key | Yes | - |
| `OMI_API_KEY` | Omi API key | Yes | - |
| `PORT` | Server port | No | 3000 |

### OpenAI Configuration

The plugin uses these GPT-4 settings:
- **Model**: `gpt-4`
- **Max Tokens**: 500
- **Temperature**: 0.7
- **System Prompt**: "You are a helpful AI assistant. Provide clear, concise, and helpful responses."

## 🚨 Error Handling

The plugin handles various error scenarios:

- **Missing Fields**: Returns 400 for incomplete webhook data
- **API Errors**: Handles OpenAI and Omi API errors gracefully
- **Network Issues**: Retries and provides clear error messages
- **Validation**: Ensures transcripts start with "hey omi"

## 🔒 Security Considerations

- API keys are stored as environment variables
- Input validation prevents malicious payloads
- HTTPS enforced in production (Railway)
- Rate limiting can be added if needed

## 🧪 Testing

### Manual Testing

1. Start the server locally
2. Send test webhook payloads
3. Verify OpenAI responses
4. Check Omi notification delivery

### Automated Testing

```bash
# Run tests (if implemented)
npm test
```

## 📈 Scaling and Performance

- **Stateless**: No database dependencies
- **Async Processing**: Non-blocking webhook handling
- **Railway Auto-scaling**: Automatically scales based on traffic
- **Response Time**: Typically 2-5 seconds for full request cycle

## 🆘 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check Railway variables are configured
   - Verify `.env` file exists locally

2. **OpenAI API Errors**
   - Verify API key is valid
   - Check OpenAI account has credits
   - Ensure API key has GPT-4 access

3. **Omi Notification Failures**
   - Verify Omi API key is correct
   - Check user_id format
   - Ensure plugin has notification permissions

4. **Webhook Not Receiving Data**
   - Verify webhook URL in Omi plugin settings
   - Check Railway deployment status
   - Test with health check endpoint

### Debug Mode

Enable verbose logging by setting:

```bash
railway variables set DEBUG=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the troubleshooting section above
- Review Railway deployment logs
- Open an issue on GitHub
- Contact Omi support for plugin-specific issues

---

**Happy coding with Omi! 🎉**
