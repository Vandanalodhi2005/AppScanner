/**
 * apiConfig.ts
 *
 * Resolves the backend API base URL dynamically based on current platform
 * and environment (Android emulator vs Physical Device vs Windows PC vs Production).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const BACKEND_PORT = 5000;
export const PRODUCTION_API_URL = 'https://api.scannerapp.example.com';

/**
 * Returns the appropriate base URL for the backend API:
 * - Production: uses PRODUCTION_API_URL
 * - Windows PC / Web: http://localhost:5000
 * - Android Physical Device (via Expo Go): http://<PC_LAN_IP>:5000
 * - Android Emulator: http://10.0.2.2:5000
 */
export function getApiBaseUrl(): string {
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  // Windows Desktop or Web run on localhost directly
  if (Platform.OS === 'windows' || Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}`;
  }

  // For Android, check if running through Expo host (physical phone on Wi-Fi)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:${BACKEND_PORT}`;
    }
  }

  // Standard Android Studio emulator host loopback
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  return `http://localhost:${BACKEND_PORT}`;
}
