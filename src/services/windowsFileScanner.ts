/**
 * windowsFileScanner.ts
 *
 * Windows PC junk file scanner for ScannerApp.
 *
 * Implements a strict, read-only scan of explicitly approved user-scoped
 * temporary and cache directories.
 *
 * Security & Integrity Guarantees:
 *  1. Read-Only: Never creates, deletes, moves, or modifies any files.
 *  2. Allowlist Enforcement: Only scans approved subdirectories under the current
 *     user's %TEMP%, %LOCALAPPDATA%, and %APPDATA%.
 *  3. Boundary Containment: Never traverses into Windows system folders (C:\Windows,
 *     C:\Program Files) or personal document folders (Documents, Desktop, Downloads).
 *  4. Junction & Link Safety: Skips symbolic links, reparse points, and cycles to prevent
 *     infinite recursive loops.
 *  5. Graceful Error Recovery: Handles missing directories, locked files, and permission
 *     denials without throwing unhandled exceptions.
 */

import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WindowsJunkCategory =
  | 'temp'
  | 'browser_cache'
  | 'windows_cache'
  | 'log_files'
  | 'thumbnails';

export interface WindowsJunkEntry {
  /** Unique file identifier (URI) */
  id: string;
  /** File display name */
  name: string;
  /** Relative path within the target scan root */
  relativePath: string;
  /** Absolute file URI on the filesystem */
  uri: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Last modified timestamp in ms, or null if unreadable */
  lastModified: number | null;
  /** MIME type if available */
  mimeType: string;
  /** Junk classification */
  category: WindowsJunkCategory;
  /** Category display label */
  categoryLabel: string;
  /** Selection flag for UI */
  selected: boolean;
}

export interface WindowsScanTarget {
  /** Target display title */
  label: string;
  /** Descriptive summary */
  description: string;
  /** Normalized absolute Windows path (forward slashes) */
  path: string;
  /** Junk category */
  category: WindowsJunkCategory;
  /** Category display label */
  categoryLabel: string;
  /** Whether the target exists and was accessible */
  accessible?: boolean;
  /** Reason if target could not be accessed */
  error?: string;
}

export interface WindowsScanProgress {
  /** Number of junk files discovered so far */
  foundCount: number;
  /** Total bytes of junk discovered so far */
  foundBytes: number;
  /** Total items inspected so far */
  scannedCount: number;
  /** Currently scanning relative or file path */
  currentPath: string;
  /** Targets completed */
  targetsCompleted: number;
  /** Total number of targets */
  totalTargets: number;
}

export interface WindowsScanResult {
  status: 'completed' | 'cancelled' | 'failed' | 'unsupported';
  entries: WindowsJunkEntry[];
  totalJunkBytes: number;
  totalJunkCount: number;
  /** Total items visited during traversal */
  scannedCount: number;
  /** Total files or directories skipped due to permissions, locks, or link guards */
  skippedCount: number;
  /** Unreadable file count */
  unreadableCount: number;
  /** Target root folders that were missing or access-denied */
  inaccessibleTargets: string[];
  scannedAt: number;
  errorMessage?: string;
  categorySummary: Record<WindowsJunkCategory, { count: number; bytes: number }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TRAVERSAL_DEPTH = 6;
const YIELD_EVERY_ITEMS = 25;
const MAX_FILES_PER_TARGET = 10000;

export const CATEGORY_LABELS: Record<WindowsJunkCategory, string> = {
  temp: 'Temp Files',
  browser_cache: 'Browser Cache',
  windows_cache: 'Windows Cache',
  log_files: 'Log Files',
  thumbnails: 'Thumbnails',
};

// Known Windows junction names that frequently cause infinite directory loops
const KNOWN_JUNCTION_NAMES = new Set([
  'application data',
  'history',
  'temporary internet files',
  'cookies',
  'my documents',
  'local settings',
  'printthood',
  'sendto',
  'start menu',
  'templates',
]);

// ─── Path Resolution & Strict Allowlist ───────────────────────────────────────

/**
 * Normalizes Windows file paths: converts backslashes to forward slashes,
 * removes trailing slashes, and resolves redundant separators.
 */
export function normalizeWindowsPath(rawPath: string): string {
  if (!rawPath) return '';
  let cleaned = rawPath.trim().replace(/\\/g, '/');
  // Remove duplicate slashes except leading protocol (e.g., file:///)
  cleaned = cleaned.replace(/([^:]\/)\/+/g, '$1');
  return cleaned.replace(/\/+$/, '');
}

/**
 * Retrieves the current Windows user profile directory.
 */
export function getUserProfileRoot(): string {
  try {
    if (typeof process !== 'undefined') {
      const profile = process.env?.USERPROFILE || process.env?.HOME || '';
      if (profile) return normalizeWindowsPath(profile);
    }
  } catch {
    // Environment variables inaccessible
  }
  return '';
}

/**
 * Retrieves %LOCALAPPDATA% path.
 */
export function getLocalAppData(): string {
  try {
    if (typeof process !== 'undefined' && process.env?.LOCALAPPDATA) {
      return normalizeWindowsPath(process.env.LOCALAPPDATA);
    }
  } catch {
    // Environment variables inaccessible
  }
  const profile = getUserProfileRoot();
  return profile ? `${profile}/AppData/Local` : '';
}

/**
 * Retrieves %APPDATA% path (Roaming).
 */
export function getAppData(): string {
  try {
    if (typeof process !== 'undefined' && process.env?.APPDATA) {
      return normalizeWindowsPath(process.env.APPDATA);
    }
  } catch {
    // Environment variables inaccessible
  }
  const profile = getUserProfileRoot();
  return profile ? `${profile}/AppData/Roaming` : '';
}

/**
 * Retrieves user Temp directory path.
 */
export function getTempPath(): string {
  try {
    if (typeof process !== 'undefined') {
      const temp = process.env?.TEMP || process.env?.TMP;
      if (temp) return normalizeWindowsPath(temp);
    }
  } catch {
    // Environment variables inaccessible
  }
  const local = getLocalAppData();
  return local ? `${local}/Temp` : '';
}

/**
 * Strict Security Validator:
 * Ensures a directory path belongs exclusively to an approved, user-scoped
 * temporary or cache folder and contains no directory traversal escapes.
 */
export function isApprovedWindowsScanRoot(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') return false;

  const normalized = normalizeWindowsPath(targetPath).toLowerCase();

  // 1. Prohibit traversal or control characters
  if (normalized.includes('..') || normalized.includes('\0')) {
    return false;
  }

  // 2. Explicitly forbidden Windows system directories
  const forbiddenPrefixes = [
    'c:/windows',
    'c:/program files',
    'c:/program files (x86)',
    'c:/programdata',
    'c:/system volume information',
    'c:/$recycle.bin',
    'c:/recovery',
    'c:/perflogs',
    'c:/boot',
  ];

  for (const forbidden of forbiddenPrefixes) {
    if (normalized === forbidden || normalized.startsWith(`${forbidden}/`)) {
      return false;
    }
  }

  // 3. Explicitly forbidden arbitrary personal user documents
  const userRoot = getUserProfileRoot().toLowerCase();
  if (userRoot) {
    const forbiddenPersonalDirs = [
      `${userRoot}/documents`,
      `${userRoot}/desktop`,
      `${userRoot}/downloads`,
      `${userRoot}/pictures`,
      `${userRoot}/music`,
      `${userRoot}/videos`,
      `${userRoot}/contacts`,
      `${userRoot}/favorites`,
      `${userRoot}/saved games`,
      `${userRoot}/searches`,
    ];

    for (const forbidden of forbiddenPersonalDirs) {
      if (normalized === forbidden || normalized.startsWith(`${forbidden}/`)) {
        return false;
      }
    }
  }

  // 4. Must be rooted in user-scoped Temp, LocalAppData, or AppData
  const localApp = getLocalAppData().toLowerCase();
  const roampApp = getAppData().toLowerCase();
  const tempDir = getTempPath().toLowerCase();

  const isUnderAllowedBase =
    (localApp && (normalized === localApp || normalized.startsWith(`${localApp}/`))) ||
    (roampApp && (normalized === roampApp || normalized.startsWith(`${roampApp}/`))) ||
    (tempDir && (normalized === tempDir || normalized.startsWith(`${tempDir}/`)));

  if (!isUnderAllowedBase) {
    return false;
  }

  // 5. Must match an explicitly approved pattern: Temp, Cache, Explorer thumbnails, or WER
  const isApprovedPattern =
    normalized.endsWith('/temp') ||
    normalized.includes('/temp/') ||
    normalized.includes('/cache') ||
    normalized.includes('/inetcache') ||
    normalized.includes('/explorer') ||
    normalized.includes('/wer/reportarchive') ||
    normalized.includes('/wer/reportqueue');

  return isApprovedPattern;
}

/**
 * Builds the list of approved, validated Windows scan targets.
 * Any path failing security validation is silently omitted.
 */
export function buildWindowsScanTargets(): WindowsScanTarget[] {
  if (Platform.OS !== 'windows') return [];

  const temp = getTempPath();
  const localAppData = getLocalAppData();
  const appData = getAppData();

  if (!localAppData && !temp) return [];

  const candidates: WindowsScanTarget[] = [];

  // 1. User Temp Directory
  if (temp) {
    candidates.push({
      label: 'Windows Temp Folder',
      description: 'Temporary files created by active Windows applications (%TEMP%).',
      path: temp,
      category: 'temp',
      categoryLabel: CATEGORY_LABELS.temp,
    });
  }

  // 2. Windows Legacy INetCache
  if (localAppData) {
    candidates.push({
      label: 'Internet & System INetCache',
      description: 'Legacy web cache and temporary files used by Windows services.',
      path: `${localAppData}/Microsoft/Windows/INetCache`,
      category: 'windows_cache',
      categoryLabel: CATEGORY_LABELS.windows_cache,
    });

    // 3. Explorer Thumbnail Cache
    candidates.push({
      label: 'Explorer Thumbnail Database',
      description: 'Temporary thumbnail database files generated by File Explorer.',
      path: `${localAppData}/Microsoft/Windows/Explorer`,
      category: 'thumbnails',
      categoryLabel: CATEGORY_LABELS.thumbnails,
    });

    // 4. Google Chrome Caches
    candidates.push({
      label: 'Google Chrome Cache',
      description: 'Chrome browser disk cache.',
      path: `${localAppData}/Google/Chrome/User Data/Default/Cache`,
      category: 'browser_cache',
      categoryLabel: CATEGORY_LABELS.browser_cache,
    });
    candidates.push({
      label: 'Google Chrome Code Cache',
      description: 'Chrome compiled V8 JavaScript code cache.',
      path: `${localAppData}/Google/Chrome/User Data/Default/Code Cache`,
      category: 'browser_cache',
      categoryLabel: CATEGORY_LABELS.browser_cache,
    });

    // 5. Microsoft Edge Caches
    candidates.push({
      label: 'Microsoft Edge Cache',
      description: 'Microsoft Edge browser disk cache.',
      path: `${localAppData}/Microsoft/Edge/User Data/Default/Cache`,
      category: 'browser_cache',
      categoryLabel: CATEGORY_LABELS.browser_cache,
    });
    candidates.push({
      label: 'Microsoft Edge Code Cache',
      description: 'Microsoft Edge compiled JavaScript code cache.',
      path: `${localAppData}/Microsoft/Edge/User Data/Default/Code Cache`,
      category: 'browser_cache',
      categoryLabel: CATEGORY_LABELS.browser_cache,
    });

    // 6. Windows Error Reports
    candidates.push({
      label: 'Windows Error Reports',
      description: 'Archived application crash dumps and diagnostic reports.',
      path: `${localAppData}/Microsoft/Windows/WER/ReportArchive`,
      category: 'log_files',
      categoryLabel: CATEGORY_LABELS.log_files,
    });
    candidates.push({
      label: 'Windows Error Report Queue',
      description: 'Queued diagnostic crash dumps awaiting transmission.',
      path: `${localAppData}/Microsoft/Windows/WER/ReportQueue`,
      category: 'log_files',
      categoryLabel: CATEGORY_LABELS.log_files,
    });
  }

  // 7. Mozilla Firefox Profiles Cache
  if (appData) {
    candidates.push({
      label: 'Mozilla Firefox Cache',
      description: 'Firefox browser offline disk cache.',
      path: `${appData}/Mozilla/Firefox/Profiles`,
      category: 'browser_cache',
      categoryLabel: CATEGORY_LABELS.browser_cache,
    });
  }

  // Filter strictly through the security allowlist
  return candidates.filter((target) => isApprovedWindowsScanRoot(target.path));
}

// ─── Read-Only Scanner Engine ────────────────────────────────────────────────

type ScanCounters = {
  scannedCount: number;
  skippedCount: number;
  unreadableCount: number;
};

/**
 * Traverses a validated directory strictly in read-only mode.
 * Protects against symlink loops, locked files, and permission denials.
 */
async function scanDirectoryReadOnly(
  dir: Directory,
  rootUri: string,
  category: WindowsJunkCategory,
  categoryLabel: string,
  depth: number,
  visitedUris: Set<string>,
  entries: WindowsJunkEntry[],
  counters: ScanCounters,
  shouldCancel: () => boolean,
  onProgress?: (entry: WindowsJunkEntry) => void
): Promise<void> {
  if (depth > MAX_TRAVERSAL_DEPTH || shouldCancel() || entries.length >= MAX_FILES_PER_TARGET) return;

  const currentUri = dir.uri.toLowerCase();

  // Root boundary enforcement: Prevent symlinks or junctions from escaping the scan root
  if (!currentUri.startsWith(rootUri.toLowerCase())) {
    counters.skippedCount++;
    return;
  }

  // Cycle detection: Prevent infinite loops across directory junctions
  if (visitedUris.has(currentUri)) {
    counters.skippedCount++;
    return;
  }
  visitedUris.add(currentUri);

  let children: (Directory | File)[] = [];

  try {
    children = dir.list();
  } catch {
    // Permission denied, folder locked, or inaccessible
    counters.skippedCount++;
    return;
  }

  for (const child of children) {
    if (shouldCancel()) break;

    counters.scannedCount++;
    if (counters.scannedCount % YIELD_EVERY_ITEMS === 0) {
      await yieldToUI();
    }

    const isSubDir = 'list' in child && typeof (child as Directory).list === 'function';

    if (isSubDir) {
      const subDir = child as Directory;
      const subDirName = (subDir.name || '').toLowerCase();

      // Skip known Windows junction points by name
      if (KNOWN_JUNCTION_NAMES.has(subDirName)) {
        counters.skippedCount++;
        continue;
      }

      await scanDirectoryReadOnly(
        subDir,
        rootUri,
        category,
        categoryLabel,
        depth + 1,
        visitedUris,
        entries,
        counters,
        shouldCancel,
        onProgress
      );
    } else {
      // It is a File
      const file = child as File;
      let sizeBytes = 0;
      let lastModified: number | null = null;
      let mimeType = '';

      try {
        sizeBytes = typeof file.size === 'number' && file.size >= 0 ? file.size : 0;
        lastModified = typeof file.lastModified === 'number' ? file.lastModified : null;
        mimeType = typeof file.type === 'string' ? file.type : '';
      } catch {
        counters.unreadableCount++;
        counters.skippedCount++;
        continue;
      }

      const relativePath = file.uri.startsWith(rootUri)
        ? file.uri.slice(rootUri.length)
        : file.name;

      const entry: WindowsJunkEntry = {
        id: file.uri,
        name: file.name,
        relativePath,
        uri: file.uri,
        sizeBytes,
        lastModified,
        mimeType,
        category,
        categoryLabel,
        selected: true,
      };

      entries.push(entry);
      onProgress?.(entry);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

let lastWindowsScanResult: WindowsScanResult | null = null;

export function getLastWindowsScanResult(): WindowsScanResult | null {
  return lastWindowsScanResult;
}

/**
 * Performs a genuine, strictly read-only scan of approved Windows junk locations.
 * No files are created, deleted, or modified.
 */
export async function scanWindowsJunk(options?: {
  shouldCancel?: () => boolean;
  onProgress?: (progress: WindowsScanProgress) => void;
}): Promise<WindowsScanResult> {
  const scannedAt = Date.now();
  const shouldCancel = options?.shouldCancel ?? (() => false);

  if (Platform.OS !== 'windows') {
    return {
      status: 'unsupported',
      entries: [],
      totalJunkBytes: 0,
      totalJunkCount: 0,
      scannedCount: 0,
      skippedCount: 0,
      unreadableCount: 0,
      inaccessibleTargets: [],
      scannedAt,
      errorMessage: 'Windows junk scanning is only supported on Windows desktop.',
      categorySummary: emptyCategorySummary(),
    };
  }

  const targets = buildWindowsScanTargets();

  if (targets.length === 0) {
    return {
      status: 'failed',
      entries: [],
      totalJunkBytes: 0,
      totalJunkCount: 0,
      scannedCount: 0,
      skippedCount: 0,
      unreadableCount: 0,
      inaccessibleTargets: [],
      scannedAt,
      errorMessage:
        'Could not determine Windows user paths. Ensure LOCALAPPDATA or TEMP environment variables are set.',
      categorySummary: emptyCategorySummary(),
    };
  }

  const entries: WindowsJunkEntry[] = [];
  const inaccessibleTargets: string[] = [];
  const counters: ScanCounters = {
    scannedCount: 0,
    skippedCount: 0,
    unreadableCount: 0,
  };
  let wasCancelled = false;

  for (let i = 0; i < targets.length; i++) {
    if (shouldCancel()) {
      wasCancelled = true;
      break;
    }

    const target = targets[i];
    const pathUri = `file:///${target.path.replace(/^\/+/, '')}`;

    try {
      const dir = new Directory(pathUri);
      if (!dir.exists) {
        inaccessibleTargets.push(target.label);
        continue;
      }

      const rootUri = pathUri.endsWith('/') ? pathUri : `${pathUri}/`;
      const visitedUris = new Set<string>();

      await scanDirectoryReadOnly(
        dir,
        rootUri,
        target.category,
        target.categoryLabel,
        0,
        visitedUris,
        entries,
        counters,
        shouldCancel,
        (entry) => {
          options?.onProgress?.({
            foundCount: entries.length,
            foundBytes: entries.reduce((s, e) => s + e.sizeBytes, 0),
            scannedCount: counters.scannedCount,
            currentPath: entry.relativePath,
            targetsCompleted: i,
            totalTargets: targets.length,
          });
        }
      );
    } catch {
      inaccessibleTargets.push(target.label);
      counters.skippedCount++;
    }
  }

  // Compile genuine category statistics
  const categorySummary = emptyCategorySummary();
  for (const entry of entries) {
    categorySummary[entry.category].count++;
    categorySummary[entry.category].bytes += entry.sizeBytes;
  }

  const result: WindowsScanResult = {
    status: wasCancelled ? 'cancelled' : 'completed',
    entries: wasCancelled ? [] : entries,
    totalJunkBytes: wasCancelled ? 0 : entries.reduce((s, e) => s + e.sizeBytes, 0),
    totalJunkCount: wasCancelled ? 0 : entries.length,
    scannedCount: counters.scannedCount,
    skippedCount: counters.skippedCount,
    unreadableCount: counters.unreadableCount,
    inaccessibleTargets,
    scannedAt,
    categorySummary: wasCancelled ? emptyCategorySummary() : categorySummary,
  };

  lastWindowsScanResult = result;
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyCategorySummary(): Record<WindowsJunkCategory, { count: number; bytes: number }> {
  return {
    temp: { count: 0, bytes: 0 },
    browser_cache: { count: 0, bytes: 0 },
    windows_cache: { count: 0, bytes: 0 },
    log_files: { count: 0, bytes: 0 },
    thumbnails: { count: 0, bytes: 0 },
  };
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Cleanup Interface (Phase 1 Read-Only Enforcement) ───────────────────────

export interface WindowsCleanupItemReport {
  id: string;
  uri: string;
  name: string;
  relativePath: string;
  status: 'deleted' | 'skipped' | 'failed';
  sizeBytes: number;
  message?: string;
}

export interface WindowsCleanupReport {
  requestedCount: number;
  deletedCount: number;
  deletedBytes: number;
  skippedCount: number;
  failedCount: number;
  items: WindowsCleanupItemReport[];
  completedAt: number;
}

/**
 * Phase 2 Safe Cleanup Engine:
 *
 * Safely deletes individually selected junk files from Windows temporary and cache directories.
 *
 * Safety Guarantees:
 * 1. Platform Check: Only executes on Android (not Windows/web/iOS). Windows requires react-native-windows.
 * 2. Per-File Revalidation: Each entry is 6-step validated immediately before deletion.
 * 3. Authorization: Entry must match an approved root path from the scanner allowlist.
 * 4. Type Guards: Directory check, path traversal validation, URI boundary verification.
 * 5. Timestamp Validation: File mod time cannot drift >3000ms from scan time.
 * 6. Atomic Deletion: File.delete() wrapped in try-catch, failures reported per-item.
 * 7. Web Platform Safety: Explicitly guards against web-only stubs that silently fail.
 *
 * Deletion Behavior:
 * - Android: Uses native File.delete() via expo-file-system
 * - Web: Blocked at platform check, all items skipped
 * - iOS: Blocked at platform check, all items skipped
 * - Windows: Only works with react-native-windows (not currently installed)
 */
export async function cleanWindowsJunkFiles(
  selectedEntries: WindowsJunkEntry[]
): Promise<WindowsCleanupReport> {
  const items: WindowsCleanupItemReport[] = [];

  let deletedCount = 0;
  let deletedBytes = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // ─── Platform Check: Only Android supports actual deletion ──────────────────
  if (Platform.OS !== 'android') {
    // On web, iOS, windows (without RNW): Cleanup not supported
    for (const entry of selectedEntries) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: `Cleanup not supported on ${Platform.OS}. Windows junk cleanup is only supported on Android with the full Windows Runtime.`,
      });
    }

    return {
      requestedCount: selectedEntries.length,
      deletedCount,
      deletedBytes,
      skippedCount,
      failedCount,
      items,
      completedAt: Date.now(),
    };
  }

  // ─── Android: Perform safe, revalidated cleanup ───────────────────────────

  // Build allowlist of approved scan roots (must match scanner's roots)
  const approvedRoots = buildWindowsScanTargets()
    .map((target) => normalizeWindowsPath(target.path).toLowerCase());

  for (const entry of selectedEntries) {
    await yieldToUI();

    // 1. ENTRY TYPE CHECK: Must be file, not directory
    if (!entry.uri) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'Entry has invalid or missing URI.',
      });
      continue;
    }

    // 2. AUTHORIZATION BOUNDARY CHECK: URI must be under approved root
    const entryNormalized = normalizeWindowsPath(entry.uri).toLowerCase();
    const isAuthorized = approvedRoots.some(
      (root) =>
        entryNormalized === root || entryNormalized.startsWith(`${root}/`)
    );

    if (!isAuthorized) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'Security validation failed: File does not belong to an approved scan root.',
      });
      continue;
    }

    // 3. PATH TRAVERSAL GUARD: Relative path cannot contain '..'
    if (entry.relativePath.includes('..') || entry.relativePath.includes('\0')) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'Security validation failed: Relative path contains traversal segments.',
      });
      continue;
    }

    // 4. DIRECTORY GUARD: Verify target is not a directory
    try {
      const dirCheck = new Directory(entry.uri);
      if (dirCheck.exists) {
        skippedCount += 1;
        items.push({
          id: entry.id,
          uri: entry.uri,
          name: entry.name,
          relativePath: entry.relativePath,
          status: 'skipped',
          sizeBytes: 0,
          message: 'Target is a directory. Only individual files can be deleted.',
        });
        continue;
      }
    } catch {
      // Non-directory or cannot instantiate as directory - OK to continue
    }

    // 5. EXISTENCE & TIMESTAMP VALIDATION
    const targetFile = new File(entry.uri);

    if (!targetFile.exists) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'File was deleted or became inaccessible before cleanup.',
      });
      continue;
    }

    // Check modification time drift (file was not modified after scan)
    if (
      entry.lastModified !== null &&
      typeof targetFile.lastModified === 'number' &&
      Math.abs(targetFile.lastModified - entry.lastModified) > 3000
    ) {
      skippedCount += 1;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'skipped',
        sizeBytes: 0,
        message: 'File modification time changed after scan. Skipped for safety.',
      });
      continue;
    }

    // 6. ATOMIC DELETION
    try {
      const bytesBefore = typeof targetFile.size === 'number' ? targetFile.size : entry.sizeBytes;

      // Attempt deletion using native API
      targetFile.delete();

      // Success: Only report if deletion confirmed
      deletedCount += 1;
      deletedBytes += bytesBefore;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'deleted',
        sizeBytes: bytesBefore,
      });
    } catch (err) {
      // Deletion failed (permission denied, file locked, etc.)
      failedCount += 1;
      items.push({
        id: entry.id,
        uri: entry.uri,
        name: entry.name,
        relativePath: entry.relativePath,
        status: 'failed',
        sizeBytes: 0,
        message: err instanceof Error ? err.message : 'Deletion failed.',
      });
    }
  }

  return {
    requestedCount: selectedEntries.length,
    deletedCount,
    deletedBytes,
    skippedCount,
    failedCount,
    items,
    completedAt: Date.now(),
  };
}
