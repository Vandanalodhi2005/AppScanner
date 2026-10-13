import type { ScannedEntry, ScanIssue, ScanStatus } from '@/types/storage';

export type LocationKind = 'downloads' | 'documents' | 'media' | 'custom';

export type LocationStatus = 'ready' | 'permission_revoked' | 'unreachable';

export type AuthorizedLocation = {
  id: string;
  name: string;
  uri: string;
  kind: LocationKind;
  authorizedAt: number;
  lastScannedAt?: number;
  fileCount?: number;
  totalBytes?: number;
  status: LocationStatus;
};

export type LocationScanResult = {
  locationId: string;
  locationName: string;
  rootUri: string;
  status: ScanStatus;
  entries: ScannedEntry[];
  fileCount: number;
  directoryCount: number;
  totalReadableBytes: number;
  issues: ScanIssue[];
  issueCount: number;
  startedAt: number;
  finishedAt: number;
};

export type MultiLocationScanResult = {
  status: ScanStatus;
  locationsScanned: number;
  locationsRevoked: number;
  entries: ScannedEntry[];
  fileCount: number;
  directoryCount: number;
  totalReadableBytes: number;
  issues: ScanIssue[];
  issueCount: number;
  startedAt: number;
  finishedAt: number;
};

export type AuthorizedCleanupItemReport = {
  id: string;
  name: string;
  uri: string;
  status: 'deleted' | 'skipped' | 'failed';
  sizeBytes: number;
  message?: string;
};

export type AuthorizedCleanupSummaryReport = {
  requestedCount: number;
  deletedCount: number;
  deletedBytes: number;
  skippedCount: number;
  failedCount: number;
  items: AuthorizedCleanupItemReport[];
  completedAt: number;
};
