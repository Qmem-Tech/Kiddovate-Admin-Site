import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Your user UID
const uid = '3hHP2wpekJVhodK5pXHzLEMgn862';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ Custom claims set for user ${uid}`);
    console.log('⚠️  User must sign out and sign back in to the admin panel for changes to take effect.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting custom claims:', error);
    process.exit(1);
  });
