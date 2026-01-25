import { ConfigService } from '@nestjs/config';

/**
 * Firebase Configuration
 *
 * Configuration for Firebase Cloud Messaging (FCM) push notifications.
 *
 * Required environment variables for production:
 * - FCM_PROJECT_ID: Firebase project ID
 * - FCM_CLIENT_EMAIL: Service account client email
 * - FCM_PRIVATE_KEY: Service account private key (PEM format)
 *
 * Optional:
 * - FCM_USE_MOCK: Set to 'true' for mock mode (default in development)
 *
 * How to get these values:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Click "Generate new private key"
 * 3. Download the JSON file
 * 4. Extract project_id, client_email, and private_key
 *
 * SECURITY NOTE:
 * - Never commit the private key to version control
 * - Use environment variables or secrets manager
 * - The private key should be stored with escaped newlines
 */
export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  useMock: boolean;
}

/**
 * Get Firebase configuration from ConfigService
 */
export function getFirebaseConfig(configService: ConfigService): FirebaseConfig {
  return {
    projectId: configService.get<string>('fcm.projectId') || '',
    clientEmail: configService.get<string>('fcm.clientEmail') || '',
    privateKey: configService.get<string>('fcm.privateKey') || '',
    useMock: configService.get<boolean>('fcm.useMock') ?? true,
  };
}

/**
 * Validate Firebase configuration
 * Returns true if properly configured for production
 */
export function isFirebaseConfigured(config: FirebaseConfig): boolean {
  return (
    !config.useMock &&
    !!config.projectId &&
    !!config.clientEmail &&
    !!config.privateKey
  );
}

/**
 * Firebase Admin SDK initialization configuration
 * Used when initializing firebase-admin (if using the SDK directly)
 */
export function getFirebaseAdminConfig(config: FirebaseConfig) {
  if (!isFirebaseConfigured(config)) {
    return null;
  }

  return {
    credential: {
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    },
    projectId: config.projectId,
  };
}
