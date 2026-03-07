import { memoryStore } from './src/db/index.js';

async function dump() {
    const messages = await memoryStore.getRecentMessages(10);
    console.log(JSON.stringify(messages, null, 2));
}

dump();
