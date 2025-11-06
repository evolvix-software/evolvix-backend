import * as admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Check if we have a service account JSON or individual credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // If service account is provided as JSON string
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Use individual environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Try to use default credentials (for GCP environments)
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      throw new Error('Firebase Admin SDK not properly configured. Please set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID environment variables.');
    }
  }
}

export interface FirebaseTokenPayload extends DecodedIdToken {
  userId?: string;
  email?: string;
  roles?: string[];
  primaryRole?: string;
}

/**
 * Verify Firebase ID token
 */
export const verifyToken = async (idToken: string): Promise<DecodedIdToken> => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid or expired Firebase token');
  }
};

/**
 * Get user by Firebase UID
 */
export const getFirebaseUser = async (uid: string) => {
  try {
    return await admin.auth().getUser(uid);
  } catch (error) {
    throw new Error('User not found in Firebase');
  }
};

/**
 * Create custom token for a user (if needed for server-side operations)
 */
export const createCustomToken = async (uid: string, additionalClaims?: object): Promise<string> => {
  try {
    return await admin.auth().createCustomToken(uid, additionalClaims);
  } catch (error) {
    throw new Error('Failed to create custom token');
  }
};

export default admin;

