import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

import { loadAuthorizedLocations } from '@/services/authorizedLocations';
import type {
  AuthorizedCleanupItemReport,
  AuthorizedCleanupSummaryReport,
} from '@/types/authorizedLocations';
import type { ScannedEntry } from '@/types/storage';

/**
 * Safely deletes explicitly selected files inside authorized SAF storage locations.
 * Revalidates each item immediately prior to deletion.
 * Never deletes folder roots or subdirectories.
 */
export async function deleteAuthorizedFiles(
  selectedFiles: ScannedEntry[]
): Promise<AuthorizedCleanupSummaryReport> {
  const startedAt = Date.now();
  const authorizedLocations = await loadAuthorizedLocations();
  const validLocationUris = authorizedLocations.map((loc) => loc.uri);

  let deletedCount = 0;
  let deletedBytes = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const items: AuthorizedCleanupItemReport[] = [];

  if (Platform.OS !== 'android') {
    return {
      requestedCount: selectedFiles.length,
      deletedCount: 0,
      deletedBytes: 0,
      skippedCount: selectedFiles.length,
      failedCount: 0,
      items: selectedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        uri: f.uri,
        status: 'skipped',
        sizeBytes: 0,
        message: 'Cleanup is supported on Android.',
      })),
      completedAt: startedAt,
    };
  }

  for (const entry of selectedFiles) {
    // 1. Skip non-file entries
    if (entry.kind !== 'file') {
      skippedCount += 1;
      items.push({
        id: entry.id,
        name: entry.name,
        uri: entry.uri,
        status: 'skipped',
        sizeBytes: 0,
        message: 'Security protection: Directories cannot be deleted.',
      });
      continue;
    }

    // 2. Validate that the URI belongs to at least one currently authorized tree
    const matchingLocation = validLocationUris.find((locUri) => {
      // Decode or prefix check for SAF tree uri
      return entry.uri.startsWith(locUri) || entry.uri.includes(encodeURIComponent(locUri));
    });

    if (!matchingLocation && validLocationUris.length > 0) {
      // If it doesn't match any known authorized location prefix
      // Still verify if parent is within authorized tree
      const isAuthorizedPrefix = validLocationUris.some((locUri) => {
        const rootTreeId = locUri.split('/document/')[0] || locUri;
        return entry.uri.startsWith(rootTreeId);
      });

      if (!isAuthorizedPrefix) {
        skippedCount += 1;
        items.push({
          id: entry.id,
          name: entry.name,
          uri: entry.uri,
          status: 'skipped',
          sizeBytes: 0,
          message: 'Security validation failed: File does not belong to an authorized location.',
        });
        continue;
      }
    }

    // 3. Verify target is not a directory
    try {
      const dirCheck = new Directory(entry.uri);
      if (dirCheck.exists) {
        skippedCount += 1;
        items.push({
          id: entry.id,
          name: entry.name,
          uri: entry.uri,
          status: 'skipped',
          sizeBytes: 0,
          message: 'Target is a directory. Skipping to preserve folder structure.',
        });
        continue;
      }
    } catch {
      // Directory check error is fine if it's a file
    }

    // 4. Instantiate File and check existence
    const targetFile = new File(entry.uri);
    if (!targetFile.exists) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        name: entry.name,
        uri: entry.uri,
        status: 'skipped',
        sizeBytes: 0,
        message: 'File was moved, deleted, or is inaccessible.',
      });
      continue;
    }

    // 5. Check modification timestamp drift if available
    if (
      entry.modifiedTime !== null &&
      typeof targetFile.lastModified === 'number' &&
      Math.abs(targetFile.lastModified - entry.modifiedTime) > 3000
    ) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        name: entry.name,
        uri: entry.uri,
        status: 'skipped',
        sizeBytes: 0,
        message: 'File was modified after scanning. Skipped for safety.',
      });
      continue;
    }

    // 6. Perform deletion
    try {
      const bytesBefore = typeof targetFile.size === 'number' ? targetFile.size : (entry.sizeBytes ?? 0);
      targetFile.delete();

      deletedCount += 1;
      deletedBytes += bytesBefore;
      items.push({
        id: entry.id,
        name: entry.name,
        uri: entry.uri,
        status: 'deleted',
        sizeBytes: bytesBefore,
      });
    } catch (err) {
      failedCount += 1;
      items.push({
        id: entry.id,
        name: entry.name,
        uri: entry.uri,
        status: 'failed',
        sizeBytes: 0,
        message: err instanceof Error ? err.message : 'Deletion failed.',
      });
    }

    await yieldToUI();
  }

  return {
    requestedCount: selectedFiles.length,
    deletedCount,
    deletedBytes,
    skippedCount,
    failedCount,
    items,
    completedAt: Date.now(),
  };
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
