import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { config } from '../config.js';

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
}

// Database repository functions
export const memoryStore = {
  async addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
    try {
      // Stringify tool calls if they exist, to store safely
      const toolCallsJson = message.tool_calls ? JSON.stringify(message.tool_calls) : null;

      const docRef = await messagesCollection.add({
        role: message.role,
        content: message.content || '',
        name: message.name || null,
        tool_calls: toolCallsJson,
        tool_call_id: message.tool_call_id || null,
        timestamp: FieldValue.serverTimestamp() // Let Firestore handle timestamps
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
  }
};
