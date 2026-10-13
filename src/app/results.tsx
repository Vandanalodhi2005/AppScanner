import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { FileListItem, formatBytes } from '@/components/file-list-item';
import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { spacing, type ThemeColors } from '@/constants/ui';
import { useTheme } from '@/context/theme-context';
import { deleteAuthorizedFiles } from '@/services/authorizedFileCleanup';
import { getCurrentScanResult, setCurrentScanResult } from '@/services/scanSession';
import type { AuthorizedCleanupSummaryReport } from '@/types/authorizedLocations';
import type { ScannedEntry } from '@/types/storage';

const LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MB

type FileCategory = {
  label: string;
  accent: string;
  tintBg: string;
  iconAndroid: string;
  iconIos: string;
};

function getFileCategories(colors: ThemeColors): FileCategory[] {
  return [
    { label: 'Images', accent: colors.cyan, tintBg: colors.tintCyan, iconAndroid: 'image', iconIos: 'photo.fill' },
    { label: 'Videos', accent: colors.purple, tintBg: colors.tintPurple, iconAndroid: 'videocam', iconIos: 'video.fill' },
    { label: 'Documents', accent: colors.primary, tintBg: colors.tintBlue, iconAndroid: 'description', iconIos: 'doc.fill' },
    { label: 'Audio', accent: colors.orange, tintBg: colors.tintOrange, iconAndroid: 'audiotrack', iconIos: 'music.note' },
    { label: 'Other', accent: colors.secondary, tintBg: colors.surfaceAlt, iconAndroid: 'insert_drive_file', iconIos: 'doc' },
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
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
    return 'Audio';
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

  const [activeFilter, setActiveFilter] = useState<string>(filter === 'large' ? 'large' : 'all');
  const [entries, setEntries] = useState<ScannedEntry[]>(() => scan?.entries ?? []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [report, setReport] = useState<AuthorizedCleanupSummaryReport | null>(null);

  // Filtered file items
  const displayedFiles = useMemo(() => {
    return entries.filter((e) => {
      if (activeFilter === 'large') {
        return e.kind === 'file' && (e.sizeBytes ?? 0) >= LARGE_FILE_THRESHOLD_BYTES;
      }
      if (activeFilter !== 'all') {
        return e.kind === 'file' && classifyEntry(e) === activeFilter;
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

  const toggleSelectAll = (select: boolean) => {
    const displayedIds = new Set(displayedFiles.map((f) => f.id));
    setEntries((prev) =>
      prev.map((item) => {
        if (displayedIds.has(item.id) && item.kind === 'file') {
          return { ...item, selected: select };
        }
        return item;
      })
    );
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', 'Please select at least one file to delete.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Permanently delete ${selectedFiles.length} explicitly selected file${
        selectedFiles.length === 1 ? '' : 's'
      } (${formatBytes(selectedBytes)}) from authorized storage?\n\nPersonal files cannot be restored once deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Selected',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const res = await deleteAuthorizedFiles(selectedFiles);
              setReport(res);

              // Remove deleted items from local state and update current session
              const deletedIds = new Set(
                res.items.filter((i) => i.status === 'deleted').map((i) => i.id)
              );
              const remaining = entries.filter((e) => !deletedIds.has(e.id));
              setEntries(remaining);

              if (scan) {
                const updatedScan = {
                  ...scan,
                  entries: remaining,
                  fileCount: remaining.filter((e) => e.kind === 'file').length,
                  totalReadableBytes: remaining.reduce((sum, e) => sum + (e.sizeBytes ?? 0), 0),
                };
                setCurrentScanResult(updatedScan);
              }
            } catch (err) {
              Alert.alert('Deletion Error', err instanceof Error ? err.message : String(err));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenLayout activeTab="scan">
      {/* Header */}
      <View style={styles.header}>
        <SectionHeader
          title={
            activeFilter === 'large'
              ? 'Large Files (>10MB)'
              : activeFilter !== 'all'
                ? `${activeFilter} Files`
                : 'Files Discovered'
          }
          subtitle={scan?.rootName ? `Scan of "${scan.rootName}"` : 'Storage Results'}
        />
        <View style={styles.authTag}>
          <Text style={styles.authTagText}>AUTHORIZED</Text>
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
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>
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

          {/* Personal Files Safety Banner (Requirement 8) */}
          <View style={styles.safetyNoticeBox}>
            <SymbolView
              name={{ android: 'verified_user', ios: 'shield.fill', web: 'verified_user' }}
              tintColor={colors.green}
              size={16}
            />
            <Text style={styles.safetyNoticeText}>
              Personal media and documents are categorized for review and never labeled as junk. Only explicitly selected files can be deleted.
            </Text>
          </View>

          {/* Category breakdown chips (interactive filter tabs) */}
          {breakdown.length > 0 ? (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>File categories (tap to filter)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breakdownRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Show all files"
                  onPress={() => setActiveFilter('all')}
                  style={[
                    styles.catChip,
                    activeFilter === 'all' && [styles.catChipActive, { borderColor: colors.primary }],
                  ]}>
                  <Text
                    style={[
                      styles.catChipLabel,
                      activeFilter === 'all' && { color: colors.primary, fontWeight: '700' },
                    ]}>
                    All ({totalFilesCount})
                  </Text>
                </Pressable>

                {breakdown.map((cat) => (
                  <Pressable
                    key={cat.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter to ${cat.label}`}
                    onPress={() => setActiveFilter(cat.label === activeFilter ? 'all' : cat.label)}
                    style={[
                      styles.catChip,
                      activeFilter === cat.label && [styles.catChipActive, { borderColor: cat.accent }],
                    ]}>
                    <View style={[styles.chipIconWrap, { backgroundColor: cat.tintBg }]}>
                      <SymbolView
                        name={{
                          android: cat.iconAndroid as never,
                          ios: cat.iconIos as never,
                          web: cat.iconAndroid as never,
                        }}
                        tintColor={cat.accent}
                        size={12}
                      />
                    </View>
                    <Text
                      style={[
                        styles.catChipLabel,
                        activeFilter === cat.label && { color: cat.accent, fontWeight: '700' },
                      ]}>
                      {cat.label} ({cat.count})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Selection Control Row */}
          <View style={styles.selectionBar}>
            <View>
              <Text style={styles.selectedLabel}>{selectedFiles.length} files selected</Text>
              <Text style={styles.selectedSize}>
                {formatBytes(selectedBytes)} selected of {displayedFiles.length} visible
              </Text>
            </View>
            <View style={styles.selectButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select all visible files"
                onPress={() => toggleSelectAll(true)}
                style={styles.selectBtn}>
                <Text style={[styles.selectBtnText, { color: colors.primary }]}>Select All</Text>
              </Pressable>
              <Text style={styles.selectBtnDivider}>|</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Deselect all visible files"
                onPress={() => toggleSelectAll(false)}
                style={styles.selectBtn}>
                <Text style={[styles.selectBtnText, { color: colors.primary }]}>Deselect</Text>
              </Pressable>
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
              contentContainerStyle={{ paddingBottom: spacing.md }}
            />
          ) : (
            <View style={styles.emptyFilesState}>
              <Text style={styles.emptyFilesTitle}>No matching files</Text>
              <Text style={styles.emptyFilesSubtitle}>
                {activeFilter === 'large'
                  ? 'No files exceeding 10 MB found.'
                  : `No ${activeFilter} files found in this scan.`}
              </Text>
            </View>
          )}

          {/* Delete Selected Action Bar (Requirement 10 & 11) */}
          {selectedFiles.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${selectedFiles.length} selected files`}
              disabled={isDeleting}
              onPress={handleDeleteSelected}
              style={[styles.deleteBtn, isDeleting && styles.disabled]}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <SymbolView
                  name={{ android: 'delete', ios: 'trash.fill', web: 'delete' }}
                  tintColor="#FFFFFF"
                  size={18}
                />
              )}
              <Text style={styles.deleteBtnText}>
                {isDeleting
                  ? 'Deleting files safely…'
                  : `Delete Selected (${formatBytes(selectedBytes)})`}
              </Text>
            </Pressable>
          ) : null}
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
            Scan an authorized storage location or choose a folder to inspect files.
          </Text>
        </View>
      )}

      {/* Deletion Summary Report Modal (Requirement 12 & 14) */}
      <Modal
        visible={report !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReport(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.iconWrap, { backgroundColor: colors.tintGreen, alignSelf: 'center' }]}>
              <SymbolView
                name={{ android: 'done_all', ios: 'checkmark.seal.fill', web: 'done_all' }}
                tintColor={colors.green}
                size={24}
              />
            </View>

            <Text style={styles.modalTitle}>Cleanup Complete</Text>
            <Text style={styles.modalSubtitle}>
              Processed items in authorized storage
            </Text>

            {report ? (
              <View style={styles.reportStats}>
                <View style={styles.reportRow}>
                  <Text style={styles.reportKey}>Deleted Files:</Text>
                  <Text style={[styles.reportVal, { color: colors.green }]}>
                    {report.deletedCount} of {report.requestedCount}
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportKey}>Deleted Content Size:</Text>
                  <Text style={[styles.reportVal, { color: colors.primary }]}>
                    {formatBytes(report.deletedBytes)}
                  </Text>
                </View>
                {report.skippedCount > 0 ? (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportKey}>Skipped for Safety:</Text>
                    <Text style={[styles.reportVal, { color: colors.orange }]}>
                      {report.skippedCount}
                    </Text>
                  </View>
                ) : null}
                {report.failedCount > 0 ? (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportKey}>Failed / Errors:</Text>
                    <Text style={[styles.reportVal, { color: colors.danger }]}>
                      {report.failedCount}
                    </Text>
                  </View>
                ) : null}

                {report.items.some((i) => i.status !== 'deleted') ? (
                  <ScrollView style={styles.reportItemsList} nestedScrollEnabled>
                    {report.items
                      .filter((i) => i.status !== 'deleted')
                      .map((item) => (
                        <View key={item.id} style={styles.reportItemRow}>
                          <Text style={styles.reportItemPath} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.reportItemStatus}>
                            {item.status.toUpperCase()}: {item.message}
                          </Text>
                        </View>
                      ))}
                  </ScrollView>
                ) : null}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss cleanup report"
              onPress={() => setReport(null)}
              style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={{ height: spacing.xl }} />
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
    authTag: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.tintBlue,
      borderWidth: 1,
      borderColor: colors.border,
    },
    authTagText: {
      color: colors.primary,
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

    safetyNoticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    safetyNoticeText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: colors.secondary,
    },

    statusBanner: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.tintOrange,
      borderWidth: 1,
      borderColor: colors.border,
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
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
    },
    breakdownRow: {
      flexDirection: 'row',
      gap: 8,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catChipActive: {
      borderWidth: 1.5,
      backgroundColor: colors.surface,
    },
    chipIconWrap: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catChipLabel: {
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '600',
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
    selectButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectBtn: {
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    selectBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    selectBtnDivider: {
      color: colors.border,
      fontSize: 12,
    },

    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: colors.danger,
      marginTop: spacing.md,
    },
    deleteBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
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

    // Modal
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    modalCard: {
      padding: 22,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      elevation: 6,
    },
    modalTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 10,
    },
    modalSubtitle: {
      color: colors.secondary,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    reportStats: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      gap: 8,
      marginBottom: 20,
    },
    reportRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reportKey: {
      color: colors.secondary,
      fontSize: 13,
    },
    reportVal: {
      color: colors.heading,
      fontSize: 13,
      fontWeight: '700',
    },
    reportItemsList: {
      maxHeight: 100,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    reportItemRow: {
      paddingVertical: 3,
    },
    reportItemPath: {
      color: colors.heading,
      fontSize: 11,
      fontWeight: '600',
    },
    reportItemStatus: {
      color: colors.secondary,
      fontSize: 10,
    },
    modalCloseBtn: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
