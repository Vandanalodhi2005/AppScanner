export type AppCacheCandidate = {
  id: string;
  name: string;
  relativeDirectory: string;
  relativePath: string;
  uri: string;
  sizeBytes: number;
  lastModified: number | null;
  mimeType: string;
  kind: 'file' | 'directory';
  eligibleForCleanup: boolean;
  skipReason?: string;
  selected: boolean;
};

export type AppCacheScanResult = {
  status: 'completed' | 'cancelled' | 'failed';
  candidates: AppCacheCandidate[];
  totalCandidateBytes: number;
  totalCandidateCount: number;
  unreadableCount: number;
  cacheRootUri: string;
  scannedAt: number;
  errorMessage?: string;
};

export type CleanupItemReport = {
  id: string;
  relativePath: string;
  status: 'deleted' | 'skipped' | 'failed';
  sizeBytes: number;
  message?: string;
};

export type CleanupSummaryReport = {
  requestedCount: number;
  deletedCount: number;
  deletedBytes: number;
  skippedCount: number;
  failedCount: number;
  items: CleanupItemReport[];
  completedAt: number;
};
