import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { FileListItem, formatBytes } from '@/components/file-list-item';
import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { spacing, type ThemeColors } from '@/constants/ui';
import { useTheme } from '@/context/theme-context';
import { getCurrentScanResult } from '@/services/scanSession';
import type { ScannedEntry } from '@/types/storage';

const LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MB

// File category classifications derived from real MIME types and file extensions
type FileCategory = { label: string; accent: string; tintBg: string; iconAndroid: string; iconIos: string };

function getFileCategories(colors: ThemeColors): FileCategory[] {
  return [
    { label: 'Images', accent: colors.cyan, tintBg: colors.tintCyan, iconAndroid: 'image', iconIos: 'photo.fill' },
    { label: 'Videos', accent: colors.purple, tintBg: colors.tintPurple, iconAndroid: 'videocam', iconIos: 'video.fill' },
    { label: 'Documents', accent: colors.primary, tintBg: colors.tintBlue, iconAndroid: 'description', iconIos: 'doc.fill' },
    { label: 'Other', accent: colors.orange, tintBg: colors.tintOrange, iconAndroid: 'insert_drive_file', iconIos: 'doc' },
  ];
}

function classifyEntry(entry: ScannedEntry): FileCategory['label'] {
  if (entry.kind !== 'file') return 'Other';
  const mime = (entry.mimeType ?? '').toLowerCase();
  const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'svg'].includes(ext)) {
    return 'Images';
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'mov', 'avi', 'webm', 'ts', '3gp'].includes(ext)) {
    return 'Videos';
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('text') ||
    mime.includes('spreadsheet') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md'].includes(ext)
  ) {
    return 'Documents';
  }
  return 'Other';
}

type CategoryBreakdown = {
  label: string;
  count: number;
  totalBytes: number;
  accent: string;
  tintBg: string;
  iconAndroid: string;
  iconIos: string;
};

function buildBreakdown(entries: ScannedEntry[], colors: ThemeColors): CategoryBreakdown[] {
  const categories = getFileCategories(colors);
  const acc: Record<string, { count: number; totalBytes: number }> = {};
  for (const cat of categories) {
    acc[cat.label] = { count: 0, totalBytes: 0 };
  }
  for (const e of entries) {
    if (e.kind !== 'file') continue;
    const label = classifyEntry(e);
    if (acc[label]) {
      acc[label].count += 1;
      acc[label].totalBytes += e.sizeBytes ?? 0;
    }
  }
  return categories.map((cat) => ({ ...cat, ...acc[cat.label] })).filter((c) => c.count > 0);
}

export default function ResultsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const scan = getCurrentScanResult();

  const [activeFilter, setActiveFilter] = useState<'all' | 'large'>(filter === 'large' ? 'large' : 'all');
  const [entries, setEntries] = useState<ScannedEntry[]>(() => scan?.entries ?? []);

  // Filtered file items
  const displayedFiles = useMemo(() => {
    return entries.filter((e) => {
      if (activeFilter === 'large') {
        return e.kind === 'file' && (e.sizeBytes ?? 0) >= LARGE_FILE_THRESHOLD_BYTES;
      }
      return true;
    });
  }, [entries, activeFilter]);

  const selectedFiles = useMemo(() => entries.filter((file) => file.selected && file.kind === 'file'), [entries]);
  const selectedBytes = useMemo(
    () => selectedFiles.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0),
    [selectedFiles]
  );

  const totalFilesCount = entries.filter((e) => e.kind === 'file').length;
  const breakdown = useMemo(() => buildBreakdown(entries, colors), [entries, colors]);

  const toggleFile = (id: string) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id && item.kind === 'file' ? { ...item, selected: !item.selected } : item))
    );
  };

  return (
    <ScreenLayout activeTab="scan">
      {/* Header */}
      <View style={styles.header}>
        <SectionHeader
          title={activeFilter === 'large' ? 'Large Files' : 'Files Discovered'}
          subtitle={scan?.rootName ? `Read-only scan of "${scan.rootName}"` : 'Scanned Folder Results'}
        />
        <View style={styles.readOnlyTag}>
          <Text style={styles.readOnlyTagText}>READ-ONLY</Text>
        </View>
      </View>

      {scan ? (
        <>
          {/* Summary Metric Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryNumber}>{totalFilesCount.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Files</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRight}>
              <Text style={[styles.summaryNumber, { color: colors.green }]}>
                {formatBytes(scan.totalReadableBytes)}
              </Text>
              <Text style={styles.summaryLabel}>
                in {scan.directoryCount} folder{scan.directoryCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Issue/Status banner if cancelled or partial */}
          {scan.status === 'partial' || scan.status === 'failed' || scan.status === 'cancelled' ? (
            <View style={styles.statusBanner}>
              <View style={styles.statusBannerTop}>
                <SymbolView
                  name={{ android: 'warning', ios: 'exclamationmark.triangle.fill', web: 'warning' }}
                  tintColor={colors.orange}
                  size={18}
                />
                <Text style={styles.statusTitle}>
                  {scan.status === 'partial'
                    ? 'Some folders could not be accessed'
                    : scan.status === 'cancelled'
                      ? 'Scan was cancelled early'
                      : 'Scan encountered an issue'}
                </Text>
              </View>
              <Text style={styles.statusCopy}>
                {scan.issueCount > 0
                  ? `${scan.issueCount} issue${scan.issueCount === 1 ? '' : 's'} reported. ${scan.issues
                      .map((i) => (i.path ? `${i.path}: ${i.message}` : i.message))
                      .join(' ')}`
                  : scan.status === 'cancelled'
                    ? 'Results below represent items visited before cancellation.'
                    : 'Check folder permissions and try again.'}
              </Text>
            </View>
          ) : null}

          {/* Category breakdown chips */}
          {breakdown.length > 0 && activeFilter === 'all' ? (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>File types found</Text>
              <View style={styles.breakdownChips}>
                {breakdown.map((cat) => (
                  <View key={cat.label} style={styles.chip}>
                    <View style={[styles.chipIcon, { backgroundColor: cat.tintBg }]}>
                      <SymbolView
                        name={{
                          android: cat.iconAndroid as never,
                          ios: cat.iconIos as never,
                          web: cat.iconAndroid as never,
                        }}
                        tintColor={cat.accent}
                        size={15}
                      />
                    </View>
                    <View style={styles.chipBody}>
                      <Text style={styles.chipLabel}>{cat.label}</Text>
                      <Text style={styles.chipCount}>
                        {cat.count} files · {formatBytes(cat.totalBytes)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Filter Bar */}
          <View style={styles.filterBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all files"
              onPress={() => setActiveFilter('all')}
              style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}>
              <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                All Files ({totalFilesCount})
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter to large files greater than 10 megabytes"
              onPress={() => setActiveFilter('large')}
              style={[styles.filterTab, activeFilter === 'large' && styles.filterTabActive]}>
              <Text style={[styles.filterTabText, activeFilter === 'large' && styles.filterTabTextActive]}>
                Large Files &gt;10MB (
                {entries.filter((e) => e.kind === 'file' && (e.sizeBytes ?? 0) >= LARGE_FILE_THRESHOLD_BYTES).length})
              </Text>
            </Pressable>
          </View>

          {/* Selection indicator */}
          <View style={styles.selectionBar}>
            <View>
              <Text style={styles.selectedLabel}>{selectedFiles.length} files selected</Text>
              <Text style={styles.selectedSize}>
                {formatBytes(selectedBytes)} total · Read-only inspection
              </Text>
            </View>
            <View style={styles.safetyTag}>
              <Text style={styles.safetyTagText}>Safe · No Auto-Delete</Text>
            </View>
          </View>

          {/* File list using FlatList */}
          {displayedFiles.length > 0 ? (
            <FlatList
              data={displayedFiles}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => <FileListItem item={item} onToggle={toggleFile} />}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
            />
          ) : (
            <View style={styles.emptyFilesState}>
              <Text style={styles.emptyFilesTitle}>No matching files</Text>
              <Text style={styles.emptyFilesSubtitle}>
                {activeFilter === 'large'
                  ? 'No files exceeding the 10 MB threshold were found in this folder.'
                  : 'This folder contains no accessible files.'}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.noScanCard}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
            <SymbolView
              name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
              tintColor={colors.primary}
              size={24}
            />
          </View>
          <Text style={styles.noScanTitle}>No scan results yet</Text>
          <Text style={styles.noScanSubtitle}>
            Choose an Android folder to start a scan and inspect accessible files.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a scan"
            onPress={() => router.navigate('/scan')}
            style={styles.chooseFolderBtn}>
            <Text style={styles.chooseFolderBtnText}>Start Folder Scan</Text>
          </Pressable>
        </View>
      )}
    </ScreenLayout>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  readOnlyTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.tintGreen,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  readOnlyTagText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryLeft: {
    flex: 1,
    alignItems: 'center',
  },
  summaryRight: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: colors.border,
  },
  summaryNumber: {
    color: colors.heading,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: 2,
  },

  statusBanner: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.tintOrange,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.md,
    gap: 4,
  },
  statusBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  statusCopy: {
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
  },

  breakdownCard: {
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  breakdownTitle: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  breakdownChips: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBody: {
    flex: 1,
  },
  chipLabel: {
    color: colors.heading,
    fontSize: 12,
    fontWeight: '700',
  },
  chipCount: {
    color: colors.secondary,
    fontSize: 11,
  },

  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.tintBlue,
    borderColor: colors.primary,
  },
  filterTabText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  selectedLabel: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedSize: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  safetyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  safetyTagText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '600',
  },

  emptyFilesState: {
    padding: spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyFilesTitle: {
    color: colors.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyFilesSubtitle: {
    color: colors.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },

  noScanCard: {
    padding: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noScanTitle: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  noScanSubtitle: {
    color: colors.secondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  chooseFolderBtn: {
    marginTop: 10,
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseFolderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
}
