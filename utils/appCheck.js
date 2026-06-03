// Firebase App Check token validation utility
import { initializeApp, getApps } from 'firebase/app';

// Initialize Firebase app for server-side validation using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

/**
 * Validates an App Check token from the request headers
 * For server-side validation, we'll use a simplified approach
 * In production, you should use Firebase Admin SDK for proper token verification
 * @param {Request} request - The incoming request
 * @returns {Promise<{valid: boolean, error?: string, claims?: any}>}
 */
export async function validateAppCheckToken(request) {
  try {
    // Get the App Check token from the X-Firebase-AppCheck header
    const appCheckToken = request.headers.get('X-Firebase-AppCheck');
    
    if (!appCheckToken) {
      return {
        valid: false,
        error: 'Missing App Check token'
      };
    }

    // For now, we'll do basic token validation
    // In production, you should verify the token with Firebase Admin SDK
    // This is a simplified validation that checks if the token exists and has basic structure
    try {
      // Basic JWT structure validation
      const parts = appCheckToken.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid token format'
        };
      }

      // Decode the payload (without verification for now)
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token is not expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return {
          valid: false,
          error: 'App Check token expired'
        };
      }

      // Basic validation - check if it's from Firebase
      if (payload.iss && payload.iss.includes('firebase')) {
        return {
          valid: true,
          claims: payload
        };
      } else {
        return {
          valid: false,
          error: 'Invalid token issuer'
        };
      }
    } catch (decodeError) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid App Check token'
    };
  }
}

/**
 * Middleware to validate App Check tokens for API routes
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with App Check validation
 */
export function withAppCheck(handler) {
  return async (request, context) => {
    // Skip App Check validation for GET requests to public endpoints
    if (request.method === 'GET' && 
        (request.url.includes('/api/avatar') || 
         request.url.includes('/api/health'))) {
      return handler(request, context);
    }

    // Validate App Check token
    const validation = await validateAppCheckToken(request);
    
    if (!validation.valid) {
      
      return new Response(
        JSON.stringify({ 
          error: 'App Check validation failed', 
          details: validation.error 
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Add App Check claims to request for use in handler
    request.appCheckClaims = validation.claims;
    
    return handler(request, context);
  };
}
