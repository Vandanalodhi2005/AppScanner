import type { CleaningHistoryItem, FileItem, ScanCategory } from '@/types/storage';

export const mockCategories: ScanCategory[] = [
  {
    id: 'junk',
    title: 'Junk Files',
    description: 'Temporary files to review',
    sizeLabel: '1.2 GB',
    countLabel: '18 items',
    icon: { android: 'auto_awesome', ios: 'sparkles', web: 'auto_awesome' },
    accent: '#41D7E8',
    progress: 62,
  },
  {
    id: 'large',
    title: 'Large Files',
    description: 'Files over 100 MB',
    sizeLabel: '4.8 GB',
    countLabel: '7 items',
    icon: { android: 'description', ios: 'doc.fill', web: 'description' },
    accent: '#4C9FFF',
    progress: 78,
  },
  {
    id: 'duplicate',
    title: 'Duplicate Files',
    description: 'Possible copies to compare',
    sizeLabel: '860 MB',
    countLabel: '5 groups',
    icon: { android: 'content_copy', ios: 'plus.square.on.square', web: 'content_copy' },
    accent: '#B49AFF',
    progress: 36,
  },
  {
    id: 'downloads',
    title: 'Downloads',
    description: 'Review your downloaded files',
    sizeLabel: '2.1 GB',
    countLabel: '24 items',
    icon: { android: 'download', ios: 'arrow.down.circle', web: 'download' },
    accent: '#FFB35C',
    progress: 54,
  },
];

export const mockFiles: FileItem[] = [
  {
    id: 'demo-1',
    name: 'app-update-temp.zip',
    uri: 'Preview path: Downloads/app-update-temp.zip',
    sizeBytes: 188743680,
    type: 'ZIP archive',
    category: 'junk',
    selected: false,
    canDelete: true,
  },
  {
    id: 'demo-2',
    name: 'family-trip-video.mp4',
    uri: 'Preview path: Movies/family-trip-video.mp4',
    sizeBytes: 1241513984,
    type: 'MP4 video',
    category: 'large',
    selected: false,
    canDelete: true,
  },
  {
    id: 'demo-3',
    name: 'IMG_2048-copy.jpg',
    uri: 'Preview path: Pictures/IMG_2048-copy.jpg',
    sizeBytes: 6291456,
    type: 'JPEG image · possible duplicate',
    category: 'duplicate',
    selected: false,
    canDelete: true,
  },
  {
    id: 'demo-4',
    name: 'travel-booking.pdf',
    uri: 'Preview path: Downloads/travel-booking.pdf',
    sizeBytes: 2936012,
    type: 'PDF document · download',
    category: 'downloads',
    selected: false,
    canDelete: true,
  },
];

export const mockHistory: CleaningHistoryItem[] = [
  { id: 'history-1', dateLabel: 'Oct 08 · 4:32 PM', filesCleaned: 6, recoveredLabel: '428 MB' },
  { id: 'history-2', dateLabel: 'Oct 04 · 10:16 AM', filesCleaned: 3, recoveredLabel: '192 MB' },
  { id: 'history-3', dateLabel: 'Sep 28 · 7:05 PM', filesCleaned: 11, recoveredLabel: '1.4 GB' },
];

export const mockStorage = {
  totalGb: 128,
  usedGb: 96,
  availableGb: 32,
};
