import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;

try {
  const serviceAccountPath = path.join(process.cwd(), 'firebase-adminsdk.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin SDK Initialized Successfully');
    isFirebaseInitialized = true;
  } else {
    console.warn('⚠️ firebase-adminsdk.json not found. FCM will not work.');
  }
} catch (error) {
  console.error('🔥 Firebase Admin Initialization Error:', error);
}

export { admin, isFirebaseInitialized };
