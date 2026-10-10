import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

import type { ScanIssue, ScanProgress, ScanResult, ScannedEntry } from '@/types/storage';

const MAX_REPORTED_ISSUES = 8;
const YIELD_EVERY_ITEMS = 32;

type ScanOptions = {
  onFolderSelected?: (folderName: string) => void;
  onProgress?: (progress: ScanProgress) => void;
  shouldCancel?: () => boolean;
};

type PendingDirectory = {
  directory: Directory;
  path: string;
};

export async function scanAndroidFolder({
  onFolderSelected,
  onProgress,
  shouldCancel = () => false,
}: ScanOptions = {}): Promise<ScanResult> {
  const startedAt = Date.now();

  if (Platform.OS !== 'android') {
    return createResult(startedAt, {
      status: 'failed',
      issues: [{ path: '', message: 'Folder scanning is currently supported on Android only.' }],
      issueCount: 1,
    });
  }

  let selectedDirectory: Directory;

  try {
    selectedDirectory = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isPickerCancelled(error)) {
      return createResult(startedAt, { status: 'cancelled' });
    }

    return createResult(startedAt, {
      status: 'failed',
      issues: [{ path: '', message: getErrorMessage(error) }],
      issueCount: 1,
    });
  }

  const rootName = selectedDirectory.name;
  onFolderSelected?.(rootName);

  const entries: ScannedEntry[] = [];
  const issues: ScanIssue[] = [];
  let issueCount = 0;
  let fileCount = 0;
  let directoryCount = 0;
  let totalReadableBytes = 0;
  let itemsVisited = 0;
  let wasCancelled = false;
  const pending: PendingDirectory[] = [{ directory: selectedDirectory, path: rootName }];

  const recordIssue = (path: string, error: unknown) => {
    issueCount += 1;
    if (issues.length < MAX_REPORTED_ISSUES) {
      issues.push({ path, message: getErrorMessage(error) });
    }
  };

  onProgress?.({
    itemsVisited,
    filesFound: fileCount,
    directoriesVisited: directoryCount,
    readableBytes: totalReadableBytes,
    currentPath: rootName,
  });
  await yieldToUI();
  let currentPath = rootName;

  while (pending.length > 0) {
    if (shouldCancel()) {
      wasCancelled = true;
      break;
    }

    const current = pending.pop();
    if (!current) continue;
    currentPath = current.path;

    let children: (Directory | File)[];
    try {
      children = current.directory.list();
      directoryCount += 1;
    } catch (error) {
      recordIssue(current.path, error);
      if (current.directory === selectedDirectory) {
        return createResult(startedAt, {
          status: 'failed',
          rootUri: selectedDirectory.uri,
          rootName,
          entries,
          fileCount,
          directoryCount,
          totalReadableBytes,
          issues,
          issueCount,
        });
      }
      continue;
    }

    for (const child of children) {
      if (shouldCancel()) {
        wasCancelled = true;
        break;
      }

      let name: string;
      let uri: string;
      try {
        name = child.name;
        uri = child.uri;
      } catch (error) {
        recordIssue(current.path, error);
        continue;
      }

      const path = `${current.path}/${name}`;
      itemsVisited += 1;

      if (child instanceof Directory) {
        const entry: ScannedEntry = {
          id: uri,
          name,
          uri,
          path,
          sizeBytes: null,
          modifiedTime: readLastModified(child, path, recordIssue),
          kind: 'directory',
          mimeType: null,
          selected: false,
        };
        entries.push(entry);
        pending.push({ directory: child, path });
      } else {
        fileCount += 1;
        let sizeBytes: number | null = null;
        let mimeType: string | null = null;
        let modifiedTime: number | null = null;

        try {
          if (!child.exists) {
            recordIssue(path, new Error('File metadata is not accessible.'));
          } else {
            sizeBytes = child.size;
            mimeType = child.type || null;
            modifiedTime = child.lastModified;
            totalReadableBytes += sizeBytes;
          }
        } catch (error) {
          recordIssue(path, error);
        }

        entries.push({
          id: uri,
          name,
          uri,
          path,
          sizeBytes,
          modifiedTime,
          kind: 'file',
          mimeType,
          selected: false,
        });
      }

      if (itemsVisited % YIELD_EVERY_ITEMS === 0) {
        onProgress?.({
          itemsVisited,
          filesFound: fileCount,
          directoriesVisited: directoryCount,
          readableBytes: totalReadableBytes,
          currentPath: path,
        });
        await yieldToUI();
      }
    }

    if (wasCancelled) break;
  }

  onProgress?.({
    itemsVisited,
    filesFound: fileCount,
    directoriesVisited: directoryCount,
    readableBytes: totalReadableBytes,
    currentPath,
  });

  const status = wasCancelled
    ? 'cancelled'
    : issueCount > 0
      ? 'partial'
      : 'completed';

  return createResult(startedAt, {
    status,
    rootUri: selectedDirectory.uri,
    rootName,
    entries,
    fileCount,
    directoryCount,
    totalReadableBytes,
    issues,
    issueCount,
  });
}

function readLastModified(
  directory: Directory,
  path: string,
  recordIssue: (path: string, error: unknown) => void,
): number | null {
  try {
    return directory.info().modificationTime ?? null;
  } catch (error) {
    recordIssue(path, error);
    return null;
  }
}

function createResult(
  startedAt: number,
  result: Partial<ScanResult> & Pick<ScanResult, 'status'>,
): ScanResult {
  return {
    status: result.status,
    rootUri: result.rootUri ?? null,
    rootName: result.rootName ?? null,
    entries: result.entries ?? [],
    fileCount: result.fileCount ?? 0,
    directoryCount: result.directoryCount ?? 0,
    totalReadableBytes: result.totalReadableBytes ?? 0,
    issues: result.issues ?? [],
    issueCount: result.issueCount ?? 0,
    startedAt,
    finishedAt: Date.now(),
  };
}

function isPickerCancelled(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('picker was cancelled');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
