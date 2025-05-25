// WARNING: This file is for TESTING ONLY - DO NOT USE IN PRODUCTION
// Direct Firebase configuration for testing purposes
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// IMPORTANT: Replace these placeholder values with your actual Firebase config values for testing
// And NEVER commit this file with real values to a public repository
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // Replace with your actual API key for testing
  authDomain: "YOUR_AUTH_DOMAIN_HERE", // yourdomain.firebaseapp.com
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth }; 