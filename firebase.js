import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Environment-based Firebase config
let firebaseConfig;
let recaptchaSiteKey;

// Check if we're in a build environment (no environment variables available)
const isBuildTime = typeof window === 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (isBuildTime) {
  // Build time - use placeholder config to prevent errors
  firebaseConfig = {
    apiKey: "build-time-placeholder",
    authDomain: "build-time-placeholder",
    projectId: "build-time-placeholder",
    storageBucket: "build-time-placeholder",
    messagingSenderId: "build-time-placeholder",
    appId: "build-time-placeholder"
  };
  recaptchaSiteKey = null;
  console.log('Using build-time placeholder Firebase config');
} else if (process.env.NODE_ENV === 'development') {
  // Development environment - use dev keys
  try {
    const devConfig = require('./keys.dev.js');
    firebaseConfig = devConfig.firebaseConfig;
    recaptchaSiteKey = devConfig.recaptchaSiteKey;
    console.log('Using development Firebase config');
  } catch (error) {
    console.warn('Development keys not found, falling back to environment variables');
    firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
    recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  }
} else {
  // Production environment - use environment variables
  firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };
  recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  console.log('Using production Firebase config');
}

// Initialize Firebase
let app, auth, firestore, provider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
  provider = new GoogleAuthProvider();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  // Create fallback instances to prevent undefined errors
  app = null;
  auth = null;
  firestore = null;
  provider = null;
}

// Initialize App Check only in production and not during build time
if (!isBuildTime && typeof window !== 'undefined' && process.env.NODE_ENV !== 'development' && recaptchaSiteKey) {
  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    console.log('Firebase App Check initialized');
  } catch (error) {
    console.error('Failed to initialize App Check:', error);
  }
} else if (process.env.NODE_ENV === 'development') {
  console.log('Firebase initialized without App Check (development mode)');
} else if (isBuildTime) {
  console.log('Firebase initialized without App Check (build time)');
}

// Configure Google provider
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline'
});

// Export Firebase instances with validation
if (!firestore) {
  console.error('CRITICAL: Firestore is not initialized properly');
}

export { auth, provider, firestore, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile, app };
export default app;
