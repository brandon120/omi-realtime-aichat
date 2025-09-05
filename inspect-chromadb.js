// Script to inspect ChromaDB contents
const { ChromaClient } = require('chromadb');
const { OpenAI } = require('openai');
require('dotenv').config();

// Manual embedding generation using OpenAI API
async function generateEmbedding(text) {
    if (!process.env.OPENAI_KEY) {
        throw new Error('OPENAI_KEY is required for embedding generation');
    }
    
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_KEY
    });
    
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
    });
    
    return response.data[0].embedding;
}

async function inspectChromaDB() {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    const chromaAuthToken = process.env.CHROMA_AUTH_TOKEN;
    
    console.log('🔍 Inspecting ChromaDB contents...');
    console.log('ChromaDB URL:', chromaUrl);
    console.log('Auth Token:', chromaAuthToken ? 'Set' : 'Not set');
    console.log('OpenAI Key:', process.env.OPENAI_KEY ? 'Set' : 'Not set');
    console.log('');

    try {
        // Connect to ChromaDB
        const clientConfig = {
            path: chromaUrl
        };
        
        if (chromaAuthToken) {
            clientConfig.auth = {
                provider: 'token',
                credentials: chromaAuthToken
            };
        }
        
        const chromaClient = new ChromaClient(clientConfig);
        
        // Get the collection
        const collection = await chromaClient.getCollection({
            name: "omi_memories"
        });
        
        console.log('✅ Connected to ChromaDB');
        console.log('📊 Collection metadata:', collection.metadata);
        console.log('');
        
        // Get all memories
        const allMemories = await collection.get();
        
        console.log(`📚 Total memories in database: ${allMemories.ids.length}`);
        console.log('');
        
        if (allMemories.ids.length === 0) {
            console.log('📝 No memories found in the database.');
            return;
        }
        
        // Group memories by user
        const userMemories = {};
        allMemories.ids.forEach((id, index) => {
            const metadata = allMemories.metadatas[index];
            const userId = metadata.userId || 'unknown';
            
            if (!userMemories[userId]) {
                userMemories[userId] = [];
            }
            
            userMemories[userId].push({
                id: id,
                content: allMemories.documents[index],
                metadata: metadata,
                hasEmbedding: allMemories.embeddings && allMemories.embeddings[index] ? true : false
            });
        });
        
        // Display memories by user
        Object.keys(userMemories).forEach(userId => {
            const memories = userMemories[userId];
            console.log(`👤 User: ${userId} (${memories.length} memories)`);
            console.log('─'.repeat(50));
            
            memories.forEach((memory, index) => {
                console.log(`${index + 1}. ID: ${memory.id}`);
                console.log(`   Content: ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`);
                console.log(`   Category: ${memory.metadata.category || 'N/A'}`);
                console.log(`   Timestamp: ${memory.metadata.timestamp || 'N/A'}`);
                console.log(`   Has Embedding: ${memory.hasEmbedding ? '✅' : '❌'}`);
                console.log('');
            });
        });
        
        // Show statistics
        console.log('📊 Database Statistics:');
        console.log('─'.repeat(30));
        
        const categories = {};
        const types = {};
        const monthlyCounts = {};
        
        allMemories.metadatas.forEach(metadata => {
            // Category stats
            const category = metadata.category || 'uncategorized';
            categories[category] = (categories[category] || 0) + 1;
            
            // Type stats
            const type = metadata.type || 'memory';
            types[type] = (types[type] || 0) + 1;
            
            // Monthly stats
            if (metadata.timestamp) {
                const month = metadata.timestamp.substring(0, 7); // YYYY-MM
                monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
            }
        });
        
        console.log('Categories:', categories);
        console.log('Types:', types);
        console.log('Monthly breakdown:', monthlyCounts);
        console.log('');
        
        // Test search functionality if OpenAI key is available
        if (process.env.OPENAI_KEY) {
            console.log('🔍 Testing search functionality...');
            try {
                const searchQuery = 'test';
                const queryEmbedding = await generateEmbedding(searchQuery);
                
                const searchResults = await collection.query({
                    queryEmbeddings: [queryEmbedding],
                    nResults: 3
                });
                
                console.log(`✅ Search test successful - found ${searchResults.metadatas[0].length} results for "${searchQuery}"`);
            } catch (searchError) {
                console.log('⚠️ Search test failed:', searchError.message);
            }
        } else {
            console.log('⚠️ Skipping search test - OPENAI_KEY not available');
        }
        
        console.log('');
        console.log('🎉 ChromaDB inspection complete!');
        
    } catch (error) {
        console.error('❌ Error inspecting ChromaDB:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('1. Make sure CHROMA_URL is set correctly');
        console.log('2. Verify your ChromaDB service is running');
        console.log('3. Check that the URL is accessible');
        console.log('4. Ensure ChromaDB is properly deployed');
    }
}

// Run the inspection
inspectChromaDB();
