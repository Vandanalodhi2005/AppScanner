import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { spacing, type ThemeColors } from '@/constants/ui';
import { useTheme } from '@/context/theme-context';
import {
  cleanAppCacheFiles,
  getLastAppCacheScanResult,
  scanAppCache,
} from '@/services/appCacheScanner';
import { createCacheTestFixtures } from '@/services/cacheTestFixtures';
import type { AppCacheCandidate, CleanupSummaryReport } from '@/types/appCache';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function CleanupScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialResult = getLastAppCacheScanResult();
  const [candidates, setCandidates] = useState<AppCacheCandidate[]>(
    () => initialResult?.candidates ?? []
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(
    initialResult?.status === 'failed' ? initialResult.errorMessage ?? 'Scan failed.' : null
  );
  const [hasScanned, setHasScanned] = useState(() => initialResult !== null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [report, setReport] = useState<CleanupSummaryReport | null>(null);

  const selectedItems = useMemo(() => candidates.filter((c) => c.selected), [candidates]);
  const selectedBytes = useMemo(
    () => selectedItems.reduce((sum, c) => sum + c.sizeBytes, 0),
    [selectedItems]
  );
  const totalCandidateBytes = useMemo(
    () => candidates.reduce((sum, c) => sum + c.sizeBytes, 0),
    [candidates]
  );

  const handleRescan = useCallback(async () => {
    if (isScanning || isCleaning) return;

    if (Platform.OS !== 'android') {
      setScanError('Automatic app-cache scanning is supported on Android.');
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const res = await scanAppCache();
      if (res.status === 'completed') {
        setCandidates(res.candidates);
        setHasScanned(true);
      } else if (res.status === 'failed') {
        setScanError(res.errorMessage || 'Scan could not be completed.');
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, isCleaning]);

  // If entering without a prior scan, automatically trigger one on Android
  useEffect(() => {
    if (!hasScanned) {
      const timer = setTimeout(() => {
        handleRescan();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasScanned, handleRescan]);

  const toggleSelectAll = (select: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  const toggleItem = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleCleanSelected = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one file to clean.');
      return;
    }

    Alert.alert(
      'Confirm Cache Cleanup',
      `Permanently delete ${selectedItems.length} selected file${
        selectedItems.length === 1 ? '' : 's'
      } (${formatBytes(selectedBytes)}) from ScannerApp's internal cache? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Now',
          style: 'destructive',
          onPress: async () => {
            setIsCleaning(true);
            try {
              const summary = await cleanAppCacheFiles(selectedItems);
              setReport(summary);
              // Refresh candidates list with remaining files from memory cache
              const latest = getLastAppCacheScanResult();
              setCandidates(latest?.candidates ?? []);
            } catch (err) {
              Alert.alert('Cleanup Error', err instanceof Error ? err.message : String(err));
            } finally {
              setIsCleaning(false);
            }
          },
        },
      ]
    );
  };

  const handleSeedFixtures = async () => {
    await createCacheTestFixtures();
    await handleRescan();
  };

  return (
    <ScreenLayout activeTab="home">
      {/* ─── 1. Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <SectionHeader
            title="App Cache Scan"
            subtitle="Review temporary files owned by ScannerApp"
          />
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rescan ScannerApp cache"
            disabled={isScanning || isCleaning}
            onPress={handleRescan}
            style={({ pressed }) => [styles.rescanBtn, pressed && styles.pressed]}>
            <SymbolView
              name={{ android: 'refresh', ios: 'arrow.clockwise', web: 'refresh' }}
              tintColor={colors.primary}
              size={15}
            />
            <Text style={styles.rescanBtnText}>Rescan</Text>
          </Pressable>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>APP-OWNED</Text>
          </View>
        </View>
      </View>

      {/* ─── 2. Loading State ──────────────────────────────────────── */}
      {isScanning ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.stateTitle}>Scanning App Cache…</Text>
          <Text style={styles.stateSubtitle}>
            Scanning ScannerApp&apos;s internal cache directly without prompting for storage access.
          </Text>
        </View>
      ) : scanError ? (
        /* ─── 3. Error State ────────────────────────────────────────── */
        <View style={styles.stateCard}>
          <View style={[styles.stateIconWrap, { backgroundColor: colors.tintDanger }]}>
            <SymbolView
              name={{ android: 'error_outline', ios: 'exclamationmark.circle.fill', web: 'error' }}
              tintColor={colors.danger}
              size={26}
            />
          </View>
          <Text style={styles.stateTitle}>Scan Failed</Text>
          <Text style={styles.stateSubtitle}>{scanError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry cache scan"
            onPress={handleRescan}
            style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Retry Scan</Text>
          </Pressable>
        </View>
      ) : candidates.length > 0 ? (
        /* ─── 4. Results List State ─────────────────────────────────── */
        <>
          {/* Summary Metric Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryValue}>{candidates.length}</Text>
              <Text style={styles.summaryLabel}>Cache Files</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRight}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {formatBytes(totalCandidateBytes)}
              </Text>
              <Text style={styles.summaryLabel}>Total Scanned Size</Text>
            </View>
          </View>

          {/* Action Row with Selection Controls */}
          <View style={styles.actionRow}>
            <View style={styles.selectionCountWrap}>
              <Text style={styles.selectionCountText}>
                {selectedItems.length} of {candidates.length} selected
              </Text>
              <Text style={styles.selectionBytesText}>({formatBytes(selectedBytes)})</Text>
            </View>

            <View style={styles.buttonGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select all eligible cache items"
                onPress={() => toggleSelectAll(true)}
                style={styles.textBtn}>
                <Text style={styles.textBtnLabel}>Select All</Text>
              </Pressable>
              <Text style={styles.btnDivider}>|</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Deselect all items"
                onPress={() => toggleSelectAll(false)}
                style={styles.textBtn}>
                <Text style={styles.textBtnLabel}>Deselect All</Text>
              </Pressable>
            </View>
          </View>

          {/* List of cache candidate files */}
          <FlatList
            data={candidates}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`${item.name}, ${formatBytes(item.sizeBytes)}, ${
                  item.selected ? 'selected' : 'not selected'
                }`}
                accessibilityState={{ checked: item.selected }}
                onPress={() => toggleItem(item.id)}
                style={({ pressed }) => [styles.fileItem, pressed && styles.pressed]}>
                <View
                  style={[
                    styles.checkbox,
                    item.selected && styles.checkboxSelected,
                  ]}>
                  {item.selected ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>

                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.filePath} numberOfLines={1}>
                    {item.relativePath}
                  </Text>
                </View>

                <Text style={styles.fileSize}>{formatBytes(item.sizeBytes)}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: spacing.md }}
          />

          {/* Primary Clean Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clean ${selectedItems.length} selected files`}
            disabled={isCleaning || selectedItems.length === 0}
            onPress={handleCleanSelected}
            style={[
              styles.cleanBtn,
              (isCleaning || selectedItems.length === 0) && styles.cleanBtnDisabled,
            ]}>
            {isCleaning ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <SymbolView
                name={{ android: 'delete', ios: 'trash.fill', web: 'delete' }}
                tintColor="#FFFFFF"
                size={18}
              />
            )}
            <Text style={styles.cleanBtnText}>
              {isCleaning
                ? 'Cleaning files…'
                : `Clean Selected (${formatBytes(selectedBytes)})`}
            </Text>
          </Pressable>
        </>
      ) : (
        /* ─── 5. Empty State ────────────────────────────────────────── */
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.tintGreen }]}>
            <SymbolView
              name={{ android: 'check_circle', ios: 'checkmark.circle.fill', web: 'check_circle' }}
              tintColor={colors.green}
              size={26}
            />
          </View>
          <Text style={styles.emptyTitle}>Cache is clean</Text>
          <Text style={styles.emptySubtitle}>
            No temporary cache files were found in ScannerApp&apos;s internal storage.
          </Text>

          {/* Helper button to seed disposable test fixtures */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create temporary test fixtures to verify cleanup flow"
            onPress={handleSeedFixtures}
            style={styles.seedBtn}>
            <Text style={styles.seedBtnText}>Generate Test Cache Fixtures</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to dashboard"
            onPress={() => router.navigate('/')}
            style={styles.returnBtn}>
            <Text style={styles.returnBtnText}>Return to Dashboard</Text>
          </Pressable>
        </View>
      )}

      {/* ─── 6. Cleanup Results Modal ───────────────────────────────── */}
      <Modal
        visible={report !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReport(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.tintGreen, alignSelf: 'center' }]}>
              <SymbolView
                name={{ android: 'done_all', ios: 'checkmark.seal.fill', web: 'done_all' }}
                tintColor={colors.green}
                size={24}
              />
            </View>

            <Text style={styles.modalTitle}>Cleanup Complete</Text>
            <Text style={styles.modalSubtitle}>
              Real files processed in ScannerApp internal cache
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
                  <Text style={styles.reportKey}>Deleted Files Size:</Text>
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

                {/* Show details if any item was skipped or failed */}
                {report.items.some((i) => i.status !== 'deleted') ? (
                  <ScrollView style={styles.reportItemsList} nestedScrollEnabled>
                    {report.items
                      .filter((i) => i.status !== 'deleted')
                      .map((item) => (
                        <View key={item.id} style={styles.reportItemRow}>
                          <Text style={styles.reportItemPath} numberOfLines={1}>
                            {item.relativePath}
                          </Text>
                          <Text style={styles.reportItemStatus}>
                            {item.status.toUpperCase()}: {item.message}
                          </Text>
                        </View>
                      ))}
                  </ScrollView>
                ) : null}

                <Text style={styles.reclaimNote}>
                  Note: Operating system block reclamation and free storage metrics are managed by the Android kernel.
                </Text>
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
      gap: 12,
    },
    headerInfo: {
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rescanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rescanBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.tintBlue,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
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
    summaryLeft: { flex: 1, alignItems: 'center' },
    summaryRight: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, height: 36, backgroundColor: colors.border },
    summaryValue: { color: colors.heading, fontSize: 20, fontWeight: '800' },
    summaryLabel: { color: colors.secondary, fontSize: 11, marginTop: 2 },

    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingHorizontal: 2,
    },
    selectionCountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    selectionCountText: {
      color: colors.heading,
      fontSize: 12,
      fontWeight: '700',
    },
    selectionBytesText: {
      color: colors.secondary,
      fontSize: 12,
    },
    buttonGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    textBtn: {
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    textBtnLabel: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    btnDivider: {
      color: colors.border,
      fontSize: 12,
    },

    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkMark: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    fileDetails: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    fileName: {
      color: colors.heading,
      fontSize: 13,
      fontWeight: '600',
    },
    filePath: {
      color: colors.secondary,
      fontSize: 11,
    },
    fileSize: {
      color: colors.heading,
      fontSize: 12,
      fontWeight: '600',
    },

    cleanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: colors.primary,
      marginTop: spacing.sm,
    },
    cleanBtnDisabled: {
      opacity: 0.45,
    },
    cleanBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },

    stateCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
      marginTop: spacing.md,
    },
    stateIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    stateTitle: {
      color: colors.heading,
      fontSize: 16,
      fontWeight: '700',
    },
    stateSubtitle: {
      color: colors.secondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 290,
    },
    actionBtn: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    actionBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },

    emptyCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
      marginTop: spacing.md,
    },
    emptyIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      color: colors.heading,
      fontSize: 16,
      fontWeight: '700',
    },
    emptySubtitle: {
      color: colors.secondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
    seedBtn: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.tintBlue,
      borderWidth: 1,
      borderColor: colors.border,
    },
    seedBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    returnBtn: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    returnBtnText: {
      color: colors.secondary,
      fontSize: 13,
      fontWeight: '600',
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
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
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
    reclaimNote: {
      fontSize: 10,
      color: colors.secondary,
      marginTop: 4,
      lineHeight: 14,
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

    pressed: { opacity: 0.75 },
  });
}
