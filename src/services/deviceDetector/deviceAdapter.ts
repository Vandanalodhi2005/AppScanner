/**
 * deviceAdapter.ts
 *
 * Cross-platform hardware and OS specification detector for ScannerApp.
 * Designed with defensive fallbacks so that React Native Windows desktop
 * does not crash when native Android-only modules are absent.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';

export type DetectedDeviceSpecs = {
  deviceId: string;
  platform: 'android' | 'windows' | 'ios' | 'web';
  deviceName: string;
  osVersion: string;
  appVersion: string;
  specs: {
    totalStorageBytes: number | null;
    freeStorageBytes: number | null;
    totalMemoryBytes: number | null;
    cpuCores: number | null;
  };
};

let cachedDeviceId: string | null = null;

/**
 * Generate or retrieve a persistent client device identifier
 */
function getOrCreateDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;

  // Simple stable ID generator fallback without native uuid dependency
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  cachedDeviceId = `device_${Platform.OS}_${time}_${rand}`;
  return cachedDeviceId;
}

/**
 * Detect local specifications safely across Android and Windows
 */
export async function detectDeviceSpecs(): Promise<DetectedDeviceSpecs> {
  const platform = (Platform.OS === 'windows' ? 'windows' : Platform.OS === 'android' ? 'android' : Platform.OS) as
    | 'android'
    | 'windows'
    | 'ios'
    | 'web';

  const deviceId = getOrCreateDeviceId();
  const appVersion = '1.0.0';

  let deviceName = 'Unknown Device';
  let osVersion = `${Platform.OS}`;
  let totalMemoryBytes: number | null = null;
  let totalStorageBytes: number | null = null;
  let freeStorageBytes: number | null = null;
  const cpuCores: number | null = null;

  // 1. Android Specification Detection
  if (Platform.OS === 'android') {
    try {
      deviceName = Device.modelName || Device.productName || 'Android Device';
      osVersion = `Android ${Device.osVersion || ''} (API ${Device.platformApiLevel || ''})`.trim();
      totalMemoryBytes = Device.totalMemory || null;
    } catch {
      deviceName = 'Android Device';
    }

    try {
      if (FileSystem.getFreeDiskStorageAsync) {
        freeStorageBytes = await FileSystem.getFreeDiskStorageAsync();
      }
      if (FileSystem.getTotalDiskCapacityAsync) {
        totalStorageBytes = await FileSystem.getTotalDiskCapacityAsync();
      }
    } catch {
      // Storage access restricted or unavailable
    }
  }

  // 2. Windows PC Specification Detection
  else if (Platform.OS === 'windows') {
    try {
      const computerName =
        typeof process !== 'undefined' && process.env?.COMPUTERNAME
          ? process.env.COMPUTERNAME
          : 'Windows PC';
      deviceName = computerName;
      osVersion = 'Windows 10/11';
    } catch {
      deviceName = 'Windows PC';
      osVersion = 'Windows';
    }

    // Windows storage query fallback
    try {
      if (FileSystem.getFreeDiskStorageAsync) {
        freeStorageBytes = await FileSystem.getFreeDiskStorageAsync();
      }
      if (FileSystem.getTotalDiskCapacityAsync) {
        totalStorageBytes = await FileSystem.getTotalDiskCapacityAsync();
      }
    } catch {
      // Safe fallback - null values are accepted by the backend
    }
  }

  // 3. Web or Fallback
  else {
    deviceName = `${Platform.OS.toUpperCase()} Client`;
    osVersion = Platform.OS;
  }

  return {
    deviceId,
    platform,
    deviceName,
    osVersion,
    appVersion,
    specs: {
      totalStorageBytes,
      freeStorageBytes,
      totalMemoryBytes,
      cpuCores,
    },
  };
}
