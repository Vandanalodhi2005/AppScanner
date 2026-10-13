import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  loadAuthorizedLocations,
  updateLocationStats,
  verifyLocationPermission,
} from '@/services/authorizedLocations';
import type {
  AuthorizedLocation,
  LocationScanResult,
  MultiLocationScanResult,
} from '@/types/authorizedLocations';
import type { ScanIssue, ScanProgress, ScannedEntry } from '@/types/storage';

const MAX_TRAVERSAL_DEPTH = 14;
const MAX_REPORTED_ISSUES = 10;
const YIELD_EVERY_ITEMS = 32;

type ScanOptions = {
  onProgress?: (progress: ScanProgress) => void;
  shouldCancel?: () => boolean;
};

/**
 * Scans a previously authorized SAF location using its persisted tree URI.
 * Does NOT open the system folder picker.
 */
export async function scanAuthorizedLocation(
  location: AuthorizedLocation,
  options: ScanOptions = {}
): Promise<LocationScanResult> {
  const startedAt = Date.now();
  const shouldCancel = options.shouldCancel ?? (() => false);

  if (Platform.OS !== 'android') {
    return {
      locationId: location.id,
      locationName: location.name,
      rootUri: location.uri,
      status: 'failed',
      entries: [],
      fileCount: 0,
      directoryCount: 0,
      totalReadableBytes: 0,
      issues: [{ path: '', message: 'Android only feature.' }],
      issueCount: 1,
      startedAt,
      finishedAt: Date.now(),
    };
  }

  // 1. Verify that the SAF permission is still valid
  const isPermissionValid = verifyLocationPermission(location.uri);
  if (!isPermissionValid) {
    return {
      locationId: location.id,
      locationName: location.name,
      rootUri: location.uri,
      status: 'failed',
      entries: [],
      fileCount: 0,
      directoryCount: 0,
      totalReadableBytes: 0,
      issues: [
        {
          path: location.name,
          message: 'Permission has been revoked or folder is inaccessible. Please re-authorize.',
        },
      ],
      issueCount: 1,
      startedAt,
      finishedAt: Date.now(),
    };
  }

  let rootDir: Directory;
  try {
    rootDir = new Directory(location.uri);
  } catch (err) {
    return {
      locationId: location.id,
      locationName: location.name,
      rootUri: location.uri,
      status: 'failed',
      entries: [],
      fileCount: 0,
      directoryCount: 0,
      totalReadableBytes: 0,
      issues: [{ path: location.name, message: err instanceof Error ? err.message : String(err) }],
      issueCount: 1,
      startedAt,
      finishedAt: Date.now(),
    };
  }

  const entries: ScannedEntry[] = [];
  const issues: ScanIssue[] = [];
  let issueCount = 0;
  let fileCount = 0;
  let directoryCount = 0;
  let totalReadableBytes = 0;
  let itemsVisited = 0;
  let wasCancelled = false;

  const pending: { dir: Directory; path: string; depth: number }[] = [
    { dir: rootDir, path: location.name, depth: 0 },
  ];

  const recordIssue = (path: string, error: unknown) => {
    issueCount += 1;
    if (issues.length < MAX_REPORTED_ISSUES) {
      issues.push({ path, message: error instanceof Error ? error.message : String(error) });
    }
  };

  while (pending.length > 0) {
    if (shouldCancel()) {
      wasCancelled = true;
      break;
    }

    const current = pending.pop();
    if (!current) continue;

    let children: (Directory | File)[] = [];
    try {
      children = current.dir.list();
      directoryCount += 1;
    } catch (err) {
      recordIssue(current.path, err);
      continue;
    }

    for (const child of children) {
      if (shouldCancel()) {
        wasCancelled = true;
        break;
      }

      itemsVisited += 1;
      const childName = child.name || 'Unnamed';
      const childPath = `${current.path}/${childName}`;

      const isDir = child instanceof Directory;

      if (isDir) {
        entries.push({
          id: child.uri,
          name: childName,
          uri: child.uri,
          path: childPath,
          sizeBytes: null,
          modifiedTime: null,
          kind: 'directory',
          mimeType: null,
          selected: false,
        });

        if (current.depth < MAX_TRAVERSAL_DEPTH) {
          pending.push({
            dir: child,
            path: childPath,
            depth: current.depth + 1,
          });
        }
      } else {
        const file = child as File;
        let sizeBytes: number | null = null;
        let mimeType: string | null = null;
        let modifiedTime: number | null = null;

        try {
          if (file.exists) {
            sizeBytes = file.size;
            mimeType = file.type || null;
            modifiedTime = file.lastModified;
            if (typeof sizeBytes === 'number') {
              totalReadableBytes += sizeBytes;
            }
          }
        } catch (err) {
          recordIssue(childPath, err);
        }

        fileCount += 1;
        entries.push({
          id: file.uri,
          name: childName,
          uri: file.uri,
          path: childPath,
          sizeBytes,
          modifiedTime,
          kind: 'file',
          mimeType,
          selected: false,
        });
      }

      if (itemsVisited % YIELD_EVERY_ITEMS === 0) {
        options.onProgress?.({
          itemsVisited,
          filesFound: fileCount,
          directoriesVisited: directoryCount,
          readableBytes: totalReadableBytes,
          currentPath: childPath,
        });
        await yieldToUI();
      }
    }
  }

  // Update saved stats for this location if successfully completed
  if (!wasCancelled && issueCount === 0) {
    await updateLocationStats(location.id, { fileCount, totalBytes: totalReadableBytes });
  }

  const status = wasCancelled
    ? 'cancelled'
    : issueCount > 0
      ? 'partial'
      : 'completed';

  return {
    locationId: location.id,
    locationName: location.name,
    rootUri: location.uri,
    status,
    entries,
    fileCount,
    directoryCount,
    totalReadableBytes,
    issues,
    issueCount,
    startedAt,
    finishedAt: Date.now(),
  };
}

/**
 * Scans all currently registered authorized locations automatically without opening any pickers.
 */
export async function scanAllAuthorizedLocations(
  options: ScanOptions = {}
): Promise<MultiLocationScanResult> {
  const startedAt = Date.now();
  const locations = await loadAuthorizedLocations();

  const allEntries: ScannedEntry[] = [];
  const allIssues: ScanIssue[] = [];
  let totalFiles = 0;
  let totalDirs = 0;
  let totalBytes = 0;
  let scannedCount = 0;
  let revokedCount = 0;

  for (const loc of locations) {
    if (options.shouldCancel?.()) break;

    const result = await scanAuthorizedLocation(loc, options);
    if (result.status === 'failed' && result.issues.some((i) => i.message.includes('revoked'))) {
      revokedCount += 1;
    } else {
      scannedCount += 1;
      allEntries.push(...result.entries);
      totalFiles += result.fileCount;
      totalDirs += result.directoryCount;
      totalBytes += result.totalReadableBytes;
    }
    allIssues.push(...result.issues);
  }

  const wasCancelled = options.shouldCancel?.() ?? false;
  const status = wasCancelled
    ? 'cancelled'
    : allIssues.length > 0
      ? 'partial'
      : 'completed';

  return {
    status,
    locationsScanned: scannedCount,
    locationsRevoked: revokedCount,
    entries: allEntries,
    fileCount: totalFiles,
    directoryCount: totalDirs,
    totalReadableBytes: totalBytes,
    issues: allIssues,
    issueCount: allIssues.length,
    startedAt,
    finishedAt: Date.now(),
  };
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
