import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import { config } from './src/config.js';

const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function purge() {
    const snapshot = await db.collection('messages').get();
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.content && data.content.includes('api-test')) {
            batch.delete(doc.ref);
            count++;
        }
    });

    await batch.commit();
    console.log(`Purged ${count} messages containing "api-test".`);
}

purge();
