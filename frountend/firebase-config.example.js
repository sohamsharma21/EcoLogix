/**
 * Firebase Configuration Template
 * Copy this file to firebase-config.js and fill in your Firebase credentials
 * Get your config from: Firebase Console → Project Settings → General
 */

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}

