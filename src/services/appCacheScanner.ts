import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type {
  AppCacheCandidate,
  AppCacheScanResult,
  CleanupItemReport,
  CleanupSummaryReport,
} from '@/types/appCache';

type PendingDir = {
  directory: Directory;
  relativeDir: string;
  depth: number;
};

const MAX_TRAVERSAL_DEPTH = 16;
const YIELD_EVERY_ITEMS = 24;

let lastAppCacheScanResult: AppCacheScanResult | null = null;

export function getLastAppCacheScanResult(): AppCacheScanResult | null {
  return lastAppCacheScanResult;
}

export function setLastAppCacheScanResult(result: AppCacheScanResult | null): void {
  lastAppCacheScanResult = result;
}

/**
 * Scans ScannerApp's own cache directory without requiring any system folder picker.
 */
export async function scanAppCache(options?: {
  shouldCancel?: () => boolean;
  onProgress?: (count: number, currentRelPath: string) => void;
}): Promise<AppCacheScanResult> {
  const startedAt = Date.now();
  const shouldCancel = options?.shouldCancel ?? (() => false);

  if (Platform.OS !== 'android') {
    return {
      status: 'failed',
      candidates: [],
      totalCandidateBytes: 0,
      totalCandidateCount: 0,
      unreadableCount: 0,
      cacheRootUri: '',
      scannedAt: startedAt,
      errorMessage: 'Automatic app-cache scanning is supported on Android.',
    };
  }

  try {
    const cacheDir = Paths.cache;
    if (!cacheDir || !cacheDir.exists) {
      const result: AppCacheScanResult = {
        status: 'completed',
        candidates: [],
        totalCandidateBytes: 0,
        totalCandidateCount: 0,
        unreadableCount: 0,
        cacheRootUri: cacheDir?.uri ?? '',
        scannedAt: startedAt,
      };
      setLastAppCacheScanResult(result);
      return result;
    }

    const rootUri = cacheDir.uri.endsWith('/') ? cacheDir.uri : `${cacheDir.uri}/`;
    const candidates: AppCacheCandidate[] = [];
    let unreadableCount = 0;
    let itemsCount = 0;
    let wasCancelled = false;

    const pending: PendingDir[] = [{ directory: cacheDir, relativeDir: '', depth: 0 }];

    while (pending.length > 0) {
      if (shouldCancel()) {
        wasCancelled = true;
        break;
      }

      const current = pending.pop();
      if (!current) continue;

      let children: (Directory | File)[] = [];
      try {
        children = current.directory.list();
      } catch {
        unreadableCount += 1;
        continue;
      }

      for (const child of children) {
        if (shouldCancel()) {
          wasCancelled = true;
          break;
        }

        itemsCount += 1;
        if (itemsCount % YIELD_EVERY_ITEMS === 0) {
          options?.onProgress?.(candidates.length, child.name);
          await yieldToUI();
        }

        // Anti-path traversal: verify canonical path prefix
        if (!child.uri.startsWith(rootUri)) {
          unreadableCount += 1;
          continue;
        }

        // Compute relative path inside cache root
        const relativePath = child.uri.slice(rootUri.length);

        // Determine if child is a Directory or File
        const isDir = 'list' in child && typeof (child as Directory).list === 'function';

        if (isDir) {
          if (current.depth < MAX_TRAVERSAL_DEPTH) {
            pending.push({
              directory: child as Directory,
              relativeDir: relativePath,
              depth: current.depth + 1,
            });
          }
        } else {
          // Regular file
          const file = child as File;
          let fileSize = 0;
          let lastModified: number | null = null;
          let mimeType = '';

          try {
            fileSize = typeof file.size === 'number' ? file.size : 0;
            lastModified = typeof file.lastModified === 'number' ? file.lastModified : null;
            mimeType = typeof file.type === 'string' ? file.type : '';
          } catch {
            // Unreadable metadata
            unreadableCount += 1;
            continue;
          }

          candidates.push({
            id: file.uri,
            name: file.name,
            relativeDirectory: current.relativeDir || '(cache root)',
            relativePath,
            uri: file.uri,
            sizeBytes: fileSize,
            lastModified,
            mimeType,
            kind: 'file',
            eligibleForCleanup: true,
            selected: true,
          });
        }
      }
    }

    const totalBytes = candidates.reduce((sum, item) => sum + item.sizeBytes, 0);

    const result: AppCacheScanResult = {
      status: wasCancelled ? 'cancelled' : 'completed',
      candidates,
      totalCandidateBytes: totalBytes,
      totalCandidateCount: candidates.length,
      unreadableCount,
      cacheRootUri: rootUri,
      scannedAt: Date.now(),
    };

    setLastAppCacheScanResult(result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const result: AppCacheScanResult = {
      status: 'failed',
      candidates: [],
      totalCandidateBytes: 0,
      totalCandidateCount: 0,
      unreadableCount: 0,
      cacheRootUri: '',
      scannedAt: startedAt,
      errorMessage: errorMsg,
    };
    setLastAppCacheScanResult(result);
    return result;
  }
}

/**
 * Safely cleans selected files from ScannerApp's own cache.
 * Revalidates each item immediately prior to deletion.
 */
export async function cleanAppCacheFiles(
  selectedItems: AppCacheCandidate[]
): Promise<CleanupSummaryReport> {
  const cacheDir = Paths.cache;
  const rootUri = cacheDir.uri.endsWith('/') ? cacheDir.uri : `${cacheDir.uri}/`;

  let deletedCount = 0;
  let deletedBytes = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const itemReports: CleanupItemReport[] = [];

  for (const candidate of selectedItems) {
    // 1. Validate target is strictly within app cache root and contains no traversal
    if (
      !candidate.uri.startsWith(rootUri) ||
      candidate.uri === rootUri ||
      candidate.uri.length <= rootUri.length ||
      candidate.relativePath.includes('..')
    ) {
      skippedCount += 1;
      itemReports.push({
        id: candidate.id,
        relativePath: candidate.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'Security validation failed: Target is outside app cache root or contains path traversal segments.',
      });
      continue;
    }

    // 2. Safety check: ensure target is strictly a regular file and NOT a directory.
    // Never delete the cache root or subdirectories.
    try {
      const dirCheck = new Directory(candidate.uri);
      if (dirCheck.exists) {
        skippedCount += 1;
        itemReports.push({
          id: candidate.id,
          relativePath: candidate.relativePath,
          status: 'skipped',
          sizeBytes: 0,
          message: 'Security validation failed: Target is a directory. Only individual cache files can be removed.',
        });
        continue;
      }
    } catch {
      // Non-directory or cannot instantiate as directory
    }

    // 3. Instantiate and inspect target file.
    // Note on Expo FileSystem API capabilities:
    // expo-file-system v57 does not expose a POSIX isSymbolicLink() API in JavaScript.
    // To ensure maximum safety, we verify the canonical URI prefix matches Paths.cache,
    // verify the target is not a directory, and verify targetFile.exists (which on Android
    // calls File.isFile() under the hood).
    const targetFile = new File(candidate.uri);
    if (!targetFile.exists) {
      skippedCount += 1;
      itemReports.push({
        id: candidate.id,
        relativePath: candidate.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'File disappeared or is inaccessible before cleanup.',
      });
      continue;
    }

    // 3. Check modification timestamp if available
    if (
      candidate.lastModified !== null &&
      typeof targetFile.lastModified === 'number' &&
      Math.abs(targetFile.lastModified - candidate.lastModified) > 3000
    ) {
      skippedCount += 1;
      itemReports.push({
        id: candidate.id,
        relativePath: candidate.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'File modified after scan. Skipped for safety.',
      });
      continue;
    }

    // 4. Perform atomic deletion
    try {
      const bytesBefore = typeof targetFile.size === 'number' ? targetFile.size : candidate.sizeBytes;
      targetFile.delete();

      deletedCount += 1;
      deletedBytes += bytesBefore;
      itemReports.push({
        id: candidate.id,
        relativePath: candidate.relativePath,
        status: 'deleted',
        sizeBytes: bytesBefore,
      });
    } catch (error) {
      failedCount += 1;
      itemReports.push({
        id: candidate.id,
        relativePath: candidate.relativePath,
        status: 'failed',
        sizeBytes: 0,
        message: error instanceof Error ? error.message : 'Deletion failed.',
      });
    }

    await yieldToUI();
  }

  // Update cached scan result if present
  if (lastAppCacheScanResult) {
    const deletedIds = new Set(
      itemReports.filter((r) => r.status === 'deleted').map((r) => r.id)
    );
    const remaining = lastAppCacheScanResult.candidates.filter((c) => !deletedIds.has(c.id));
    lastAppCacheScanResult = {
      ...lastAppCacheScanResult,
      candidates: remaining,
      totalCandidateCount: remaining.length,
      totalCandidateBytes: remaining.reduce((sum, c) => sum + c.sizeBytes, 0),
    };
  }

  return {
    requestedCount: selectedItems.length,
    deletedCount,
    deletedBytes,
    skippedCount,
    failedCount,
    items: itemReports,
    completedAt: Date.now(),
  };
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
