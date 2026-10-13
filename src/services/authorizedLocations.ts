import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { AuthorizedLocation, LocationKind, LocationStatus } from '@/types/authorizedLocations';

const LOCATIONS_STORAGE_FILE = 'scannerapp_authorized_locations.json';

let cachedLocations: AuthorizedLocation[] | null = null;

function getLocationsFile(): File | null {
  try {
    if (Platform.OS !== 'android') return null;
    return new File(Paths.document, LOCATIONS_STORAGE_FILE);
  } catch {
    return null;
  }
}

/**
 * Loads all persistently saved authorized storage locations.
 * Returns empty array if none have been granted or file doesn't exist yet.
 */
export async function loadAuthorizedLocations(): Promise<AuthorizedLocation[]> {
  if (Platform.OS !== 'android') return [];

  if (cachedLocations !== null) {
    return [...cachedLocations];
  }

  const file = getLocationsFile();
  if (!file || !file.exists) {
    cachedLocations = [];
    return [];
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedLocations = parsed;
      return [...cachedLocations];
    }
  } catch {
    // If file is corrupted or unreadable, fall back to empty list gracefully
  }

  cachedLocations = [];
  return [];
}

/**
 * Saves authorized locations to persistent app document storage.
 */
export async function saveAuthorizedLocations(locations: AuthorizedLocation[]): Promise<void> {
  if (Platform.OS !== 'android') return;

  cachedLocations = [...locations];
  const file = getLocationsFile();
  if (!file) return;

  try {
    if (!file.exists) {
      file.create();
    }
    file.write(JSON.stringify(locations, null, 2));
  } catch {
    // Non-critical persistence failure handled gracefully
  }
}

/**
 * Verifies if the SAF permission for a given authorized location is still active.
 * If the user revoked the permission in system settings, this returns false.
 */
export function verifyLocationPermission(uri: string): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    const dir = new Directory(uri);
    return Boolean(dir.exists);
  } catch {
    return false;
  }
}

/**
 * Checks all authorized locations and updates their status if revoked.
 */
export async function refreshLocationsStatus(): Promise<AuthorizedLocation[]> {
  const locations = await loadAuthorizedLocations();
  let changed = false;

  const updated: AuthorizedLocation[] = locations.map((loc) => {
    const isGranted = verifyLocationPermission(loc.uri);
    const newStatus: LocationStatus = isGranted ? 'ready' : 'permission_revoked';
    if (newStatus !== loc.status) {
      changed = true;
      return { ...loc, status: newStatus };
    }
    return loc;
  });

  if (changed) {
    await saveAuthorizedLocations(updated);
  }

  return updated;
}

/**
 * Registers a newly authorized SAF folder.
 */
export async function addAuthorizedLocation(params: {
  name: string;
  uri: string;
  kind?: LocationKind;
}): Promise<AuthorizedLocation> {
  const locations = await loadAuthorizedLocations();

  // Deduplicate by URI
  const existingIndex = locations.findIndex((l) => l.uri === params.uri);
  const now = Date.now();

  const newLoc: AuthorizedLocation = {
    id: `loc_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: params.name || 'Authorized Folder',
    uri: params.uri,
    kind: params.kind ?? inferLocationKind(params.name),
    authorizedAt: now,
    status: 'ready',
  };

  let updated: AuthorizedLocation[];
  if (existingIndex >= 0) {
    updated = [...locations];
    updated[existingIndex] = {
      ...updated[existingIndex],
      name: newLoc.name,
      status: 'ready',
      authorizedAt: now,
    };
  } else {
    updated = [...locations, newLoc];
  }

  await saveAuthorizedLocations(updated);
  return newLoc;
}

/**
 * Removes an authorized location registration.
 */
export async function removeAuthorizedLocation(id: string): Promise<void> {
  const locations = await loadAuthorizedLocations();
  const updated = locations.filter((l) => l.id !== id);
  await saveAuthorizedLocations(updated);
}

/**
 * Updates stats for an authorized location after a scan completes.
 */
export async function updateLocationStats(
  id: string,
  stats: { fileCount: number; totalBytes: number }
): Promise<void> {
  const locations = await loadAuthorizedLocations();
  const updated = locations.map((loc) => {
    if (loc.id === id) {
      return {
        ...loc,
        fileCount: stats.fileCount,
        totalBytes: stats.totalBytes,
        lastScannedAt: Date.now(),
        status: 'ready' as const,
      };
    }
    return loc;
  });

  await saveAuthorizedLocations(updated);
}

function inferLocationKind(name: string): LocationKind {
  const lower = name.toLowerCase();
  if (lower.includes('download')) return 'downloads';
  if (lower.includes('document')) return 'documents';
  if (lower.includes('photo') || lower.includes('image') || lower.includes('dcim') || lower.includes('video') || lower.includes('music')) {
    return 'media';
  }
  return 'custom';
}
