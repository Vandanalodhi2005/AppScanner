import type { SymbolViewProps } from 'expo-symbols';

export type CategoryId = 'junk' | 'large' | 'duplicate' | 'downloads';

export type ScanCategory = {
  id: CategoryId;
  title: string;
  description: string;
  sizeLabel: string;
  countLabel: string;
  icon: SymbolViewProps['name'];
  accent: string;
  progress: number;
};

export type FileItem = {
  id: string;
  name: string;
  uri: string;
  sizeBytes: number;
  type: string;
  category: CategoryId;
  selected: boolean;
  canDelete: boolean;
};

export type ScannedEntry = {
  id: string;
  name: string;
  uri: string;
  path: string;
  sizeBytes: number | null;
  modifiedTime: number | null;
  kind: 'file' | 'directory';
  mimeType: string | null;
  selected: boolean;
};

export type ScanProgress = {
  itemsVisited: number;
  filesFound: number;
  directoriesVisited: number;
  readableBytes: number;
  currentPath: string;
};

export type ScanIssue = {
  path: string;
  message: string;
};

export type ScanStatus = 'completed' | 'partial' | 'cancelled' | 'failed';

export type ScanResult = {
  status: ScanStatus;
  rootUri: string | null;
  rootName: string | null;
  entries: ScannedEntry[];
  fileCount: number;
  directoryCount: number;
  totalReadableBytes: number;
  issues: ScanIssue[];
  issueCount: number;
  startedAt: number;
  finishedAt: number;
};

export type CleaningHistoryItem = {
  id: string;
  dateLabel: string;
  filesCleaned: number;
  recoveredLabel: string;
};
