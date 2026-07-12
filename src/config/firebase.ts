import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;

try {
  if (process.env.FIREBASE_ADMIN_JSON) {
    // 1. Production Mode: Read from Environment Variable (Render)
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin SDK Initialized Successfully (via Env Var)');
    isFirebaseInitialized = true;
  } else {
    // 2. Local Mode: Read from firebase-adminsdk.json
    const serviceAccountPath = path.join(process.cwd(), 'firebase-adminsdk.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.cert(serviceAccount)
      });
      console.log('🔥 Firebase Admin SDK Initialized Successfully (via local JSON)');
      isFirebaseInitialized = true;
    } else {
      console.warn('⚠️ FIREBASE_ADMIN_JSON env var or firebase-adminsdk.json not found. FCM will not work.');
    }
  }
} catch (error) {
  console.error('🔥 Firebase Admin Initialization Error:', error);
}

export const getIsFirebaseInitialized = () => isFirebaseInitialized;
export { admin };
