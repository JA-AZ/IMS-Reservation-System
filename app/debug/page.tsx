'use client';

import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({});
  const [firebaseInitialized, setFirebaseInitialized] = useState<boolean | string>(false);

  useEffect(() => {
    // Collect all environment variables
    const vars = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    setEnvVars(vars);

    // Try to initialize Firebase
    try {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      };
      
      initializeApp(firebaseConfig);
      setFirebaseInitialized(true);
    } catch (error) {
      setFirebaseInitialized(error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  // Mask API keys for security
  const maskValue = (key: string, value: string | undefined) => {
    if (!value) return 'undefined';
    if (key.includes('API_KEY')) {
      return value.substring(0, 4) + '...' + value.substring(value.length - 4);
    }
    return value;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Firebase Initialization</h2>
        <div className={`p-3 rounded ${firebaseInitialized === true ? 'bg-green-100' : 'bg-red-100'}`}>
          {firebaseInitialized === true ? 'Successfully initialized' : `Failed: ${firebaseInitialized}`}
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
        <div className="bg-gray-100 p-4 rounded">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="mb-2">
              <strong>{key}:</strong> {maskValue(key, value)}
              {!value && <span className="text-red-600 ml-2">(Missing!)</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 