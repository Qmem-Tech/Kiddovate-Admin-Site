# Admin Setup Guide

## Setting Up Firebase Custom Claims

Your Firestore security rules require admin users to have `admin: true` custom claims. This ensures only authorized users can access the admin panel.

**Note:** Custom claims **cannot** be set from the Firebase Console UI. You must use the Firebase Admin SDK (server-side).

### Step 1: Get Your User UID

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **kiddovate-24e5e**
3. Go to **Authentication** → **Users** tab
4. Find your admin user account (the email you use to log into the admin panel)
5. **Copy the User UID** (the long string under the user's email - you'll need this)

### Option 1: Using Firebase Admin SDK (Node.js script - Recommended)

1. Install Firebase Admin SDK (if not already installed):
   ```bash
   npm install firebase-admin
   ```

2. Get your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely (e.g., `serviceAccountKey.json`)

3. Create a script `setAdminClaim.mjs` in your project root:
   ```javascript
   import admin from 'firebase-admin';
   import { readFileSync } from 'fs';

   const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
   });

   // Replace 'YOUR_USER_UID' with the actual user UID from Firebase Console (Step 1)
   const uid = 'YOUR_USER_UID';

   admin.auth().setCustomUserClaims(uid, { admin: true })
     .then(() => {
       console.log(`✅ Custom claims set for user ${uid}`);
       console.log('⚠️  User must sign out and sign back in for changes to take effect.');
       process.exit(0);
     })
     .catch((error) => {
       console.error('❌ Error setting custom claims:', error);
       process.exit(1);
     });
   ```

4. Run the script:
   ```bash
   node setAdminClaim.mjs
   ```

5. **Important:** The user must **sign out and sign back in** to the admin panel for the custom claims to take effect (the ID token is refreshed on login).

### Option 2: Using Cloud Functions

If you have Cloud Functions set up, you can create a function to set admin claims. However, this is more complex than Option 1 and requires Cloud Functions to be deployed.

### Verifying Custom Claims

After setting custom claims, the user needs to:
1. Sign out of the admin panel
2. Sign back in
3. The custom claims will be included in the ID token

You can verify the claims are working by checking the browser console - permission denied errors should disappear.

## Troubleshooting

### Still Getting Permission Denied Errors?

1. **Check if custom claims are set:**
   - Sign out and sign back in to refresh the ID token
   - Custom claims are included in the ID token, which is refreshed on login

2. **Verify Firestore rules:**
   - Go to Firebase Console → Firestore Database → Rules
   - Ensure the rules include `isAdmin()` function checking for `request.auth.token.admin == true`

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Check the Console tab for detailed error messages
   - Look for "PERMISSION_DENIED" errors

4. **Verify user is authenticated:**
   - Ensure you're logged into the admin panel
   - Check that your Firebase Auth session is active

## Alternative: Temporary Development Rules (NOT for production!)

If you need to test quickly during development, you can temporarily modify Firestore rules to allow authenticated access (⚠️ **ONLY FOR DEVELOPMENT**):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING:** Never use these rules in production! They allow any authenticated user to read/write all data.
