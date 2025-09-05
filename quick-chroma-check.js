// Quick ChromaDB check script
const { ChromaClient } = require('chromadb');
require('dotenv').config();

async function quickCheck() {
    try {
        const clientConfig = {
            path: process.env.CHROMA_URL || 'http://localhost:8000'
        };
        
        if (process.env.CHROMA_AUTH_TOKEN) {
            clientConfig.auth = {
                provider: 'token',
                credentials: process.env.CHROMA_AUTH_TOKEN
            };
        }
        
        const chromaClient = new ChromaClient(clientConfig);
        const collection = await chromaClient.getCollection({ name: "omi_memories" });
        
        const allMemories = await collection.get();
        
        console.log(`📚 Total memories: ${allMemories.ids.length}`);
        
        if (allMemories.ids.length > 0) {
            console.log('\n📝 Recent memories:');
            allMemories.ids.slice(0, 5).forEach((id, index) => {
                const content = allMemories.documents[index];
                const metadata = allMemories.metadatas[index];
                console.log(`${index + 1}. [${metadata.userId}] ${content.substring(0, 60)}...`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

quickCheck();
