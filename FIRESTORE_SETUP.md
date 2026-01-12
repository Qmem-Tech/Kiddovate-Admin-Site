# Firebase Firestore Setup Guide

## Problem: Content editing is failing

If you're getting "Save failed" errors when editing content, it's likely because your **Firestore security rules** don't allow writes.

## Solution: Update Firestore Security Rules

### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Select your project: **kiddovate-24e5e**
3. Go to **Firestore Database** → **Rules** tab

### Step 2: Update the Rules

Replace your current rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read app_legal content
    match /app_legal/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write feedback
    match /feedback/{feedbackId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: Publish the Rules
1. Click **Publish** button
2. Wait a few seconds for rules to deploy

### Step 4: Test Again
1. Go back to your admin panel: http://127.0.0.1:3000
2. Try editing content again
3. Check the browser console (F12) for detailed error messages if it still fails

## Alternative: Temporary Development Rules (NOT for production!)

If you want to test quickly, you can temporarily allow all reads/writes:

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

**⚠️ WARNING:** Only use this for development. For production, use the specific rules above.

## Check Browser Console

After updating rules, if you still see errors:
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Try saving content again
4. Look for error messages - they'll now show the exact Firebase error code

Common errors:
- `permission-denied` → Rules are blocking access
- `unauthenticated` → You're not logged in
- `not-found` → Collection doesn't exist (will be created on first save)
