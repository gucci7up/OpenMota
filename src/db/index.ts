import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { config } from '../config.js';
import { getEmbeddings } from '../llm/client.js';

// Helper for Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (mA * mB);
}

// Initialize Firebase Admin SDK
// We need to provide service account credentials for admin access
// Instructions: Ensure FIREBASE_SERVICE_ACCOUNT is set in .env as a JSON string
try {
  if (!config.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
  }

  const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT);

  initializeApp({
    credential: cert(serviceAccount)
  });
  console.log('Firebase Admin initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = getFirestore();
const messagesCollection = db.collection('messages');

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id?: string;
  role: Role;
  content: string | null;
  name?: string;
  tool_calls?: any; // JSON representation of tools
  tool_call_id?: string;
  timestamp?: any;
  embedding?: number[];
  image_url?: string;
}

// Database repository functions
export const memoryStore = {
  async addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
    try {
      // Stringify tool calls if they exist, to store safely
      const toolCallsJson = message.tool_calls ? JSON.stringify(message.tool_calls) : null;

      // Generate embeddings for human/bot text content
      let embedding: number[] | null = null;
      if ((message.role === 'user' || message.role === 'assistant') && message.content) {
        // We only embed if there is content and it's a meaningful role
        try {
          embedding = await getEmbeddings(message.content);
        } catch (e) {
          console.error("Embedding generation failed, skipping but storing message:", e);
        }
      }

      const docRef = await messagesCollection.add({
        role: message.role,
        content: message.content || '',
        name: message.name || null,
        tool_calls: toolCallsJson,
        tool_call_id: message.tool_call_id || null,
        timestamp: FieldValue.serverTimestamp(),
        embedding: embedding,
        image_url: message.image_url || null
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding message to Firestore:', error);
      throw error;
    }
  },

  async getRecentMessages(limit: number = 20): Promise<any[]> {
    try {
      const snapshot = await messagesCollection
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      // We fetch in descending order to get the latest, then reverse to chronological order
      const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse() as any[];

      // Parse JSON strings back into objects for the LLM API
      return rows.map(row => {
        const msg: any = {
          role: row.role,
          content: row.content,
        };

        if (row.name) msg.name = row.name;
        if (row.tool_call_id) msg.tool_call_id = row.tool_call_id;
        if (row.image_url) msg.image_url = row.image_url;
        if (row.tool_calls) {
          try {
            msg.tool_calls = JSON.parse(row.tool_calls);
          } catch (e) {
            console.error("Failed to parse tool_calls JSON:", e);
          }
        }

        // Some LLM APIs require content to be null or a string, not undefined
        if (msg.content === '' && msg.tool_calls) {
          msg.content = null;
        }

        return msg;
      });
    } catch (error) {
      console.error('Error fetching messages from Firestore:', error);
      return [];
    }
  },

  async clearMemory() {
    try {
      // In Firestore, deleting a collection requires fetching all docs and deleting one by one
      // (or using a batch, but batch limit is 500)
      const snapshot = await messagesCollection.get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log('Firebase memory cleared.');
    } catch (error) {
      console.error('Error clearing Firestore memory:', error);
    }
  },

  async searchMessages(query: string): Promise<any[]> {
    try {
      const snapshot = await messagesCollection
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get();

      const term = query.toLowerCase();
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((msg: any) => msg.content && msg.content.toLowerCase().includes(term));

      return results.map((row: any) => ({
        role: row.role,
        content: row.content,
        timestamp: row.timestamp?.toDate ? row.timestamp.toDate().toISOString() : null
      }));
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  },

  async semanticSearch(query: string, limit: number = 5): Promise<any[]> {
    try {
      const queryEmbedding = await getEmbeddings(query);
      if (!queryEmbedding || queryEmbedding.length === 0) return [];

      // Fetch last 100 messages that have embeddings
      const snapshot = await messagesCollection
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      const results = snapshot.docs.map(doc => {
        const data = doc.data() as Message;
        const score = cosineSimilarity(queryEmbedding, data.embedding || []);
        return {
          role: data.role,
          content: data.content,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : null,
          score
        };
      });

      // Sort by score and take top N
      // Use a similarity threshold (e.g. 0.3 or 0.5 depending on the model)
      return results
        .filter(r => r.score > 0.4)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  },

  async getMemoryStats() {
    try {
      const snapshot = await messagesCollection.count().get();
      const totalMessages = snapshot.data().count;

      // For users, we can count unique name fields or just return a static count from allowed IDs
      const totalUsers = config.TELEGRAM_ALLOWED_USER_IDS.split(',').length;

      return {
        totalMessages,
        totalUsers,
        status: 'online',
        security: '100% (om-secure)'
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return { totalMessages: 0, totalUsers: 0, status: 'error' };
    }
  },

  async getMemories(limit: number = 20) {
    try {
      const snapshot = await messagesCollection
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          role: data.role,
          type: data.embedding ? 'Semántica' : 'Texto',
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : 'Reciente'
        };
      });
    } catch (error) {
      console.error('Error getting memories:', error);
      return [];
    }
  }
};
