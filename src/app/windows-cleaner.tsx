/**
 * windows-cleaner.tsx
 *
 * Dedicated Windows PC junk cleaner screen for ScannerApp.
 * Scans Temp folders, browser caches (Chrome, Edge, Firefox),
 * Windows cache files, thumbnails, and error reports.
 *
 * Only shown/active on Platform.OS === 'windows'. On other platforms
 * it renders a polite "Windows only" information card.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { spacing, type ThemeColors } from '@/constants/ui';
import { useTheme } from '@/context/theme-context';
import {
  cleanWindowsJunkFiles,
  getLastWindowsScanResult,
  scanWindowsJunk,
  type WindowsCleanupReport,
  type WindowsJunkCategory,
  type WindowsJunkEntry,
  type WindowsScanProgress,
  type WindowsScanResult,
} from '@/services/windowsFileScanner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Category Config ─────────────────────────────────────────────────────────

interface CategoryConfig {
  label: string;
  description: string;
  icon: SymbolViewProps['name'];
  accent: keyof ThemeColors;
  tintBg: keyof ThemeColors;
}

const CATEGORY_CONFIG: Record<WindowsJunkCategory, CategoryConfig> = {
  temp: {
    label: 'Temp Files',
    description: 'Temporary files from apps and Windows',
    icon: { android: 'folder_delete', ios: 'folder.badge.minus', web: 'folder_delete' },
    accent: 'orange',
    tintBg: 'tintOrange',
  },
  browser_cache: {
    label: 'Browser Cache',
    description: 'Cached data from Chrome, Edge, and Firefox',
    icon: { android: 'language', ios: 'safari', web: 'language' },
    accent: 'primary',
    tintBg: 'tintBlue',
  },
  windows_cache: {
    label: 'Windows Cache',
    description: 'IE/Edge legacy cache and internet files',
    icon: { android: 'computer', ios: 'desktopcomputer', web: 'computer' },
    accent: 'purple',
    tintBg: 'tintPurple',
  },
  thumbnails: {
    label: 'Thumbnails',
    description: 'Windows Explorer thumbnail database',
    icon: { android: 'image', ios: 'photo', web: 'image' },
    accent: 'cyan',
    tintBg: 'tintCyan',
  },
  log_files: {
    label: 'Error Reports',
    description: 'Windows crash dumps and error logs',
    icon: { android: 'bug_report', ios: 'exclamationmark.triangle', web: 'bug_report' },
    accent: 'danger',
    tintBg: 'tintDanger',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategorySummaryCard({
  category,
  count,
  bytes,
  colors,
}: {
  category: WindowsJunkCategory;
  count: number;
  bytes: number;
  colors: ThemeColors;
}) {
  const cfg = CATEGORY_CONFIG[category];
  const accentColor = colors[cfg.accent];
  const tintBgColor = colors[cfg.tintBg];

  return (
    <View
      style={[
        categorySummaryStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <View style={[categorySummaryStyles.iconWrap, { backgroundColor: tintBgColor }]}>
        <SymbolView
          name={cfg.icon}
          tintColor={accentColor}
          size={18}
        />
      </View>
      <View style={categorySummaryStyles.info}>
        <Text style={[categorySummaryStyles.label, { color: colors.heading }]}>{cfg.label}</Text>
        <Text style={[categorySummaryStyles.desc, { color: colors.secondary }]}>
          {count > 0 ? `${count} files · ${formatBytes(bytes)}` : cfg.description}
        </Text>
      </View>
      {count > 0 ? (
        <View style={[categorySummaryStyles.badge, { backgroundColor: tintBgColor }]}>
          <Text style={[categorySummaryStyles.badgeText, { color: accentColor }]}>
            {formatBytes(bytes)}
          </Text>
        </View>
      ) : (
        <View style={[categorySummaryStyles.badge, { backgroundColor: colors.tintGreen }]}>
          <Text style={[categorySummaryStyles.badgeText, { color: colors.green }]}>Clean</Text>
        </View>
      )}
    </View>
  );
}

const categorySummaryStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  desc: {
    fontSize: 11,
    lineHeight: 15,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

// ─── Animated Scan Progress Bar ───────────────────────────────────────────────

function ScanProgressBar({ progress }: { progress: WindowsScanProgress | null }) {
  const { colors } = useTheme();
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(sweep, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [sweep]);

  const fillWidth = sweep.interpolate({ inputRange: [0, 1], outputRange: ['8%', '88%'] });

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        }}>
        <Animated.View
          style={{
            height: '100%',
            borderRadius: 3,
            backgroundColor: colors.primary,
            width: fillWidth,
          }}
        />
      </View>
      {progress && (
        <Text style={{ color: colors.secondary, fontSize: 11 }} numberOfLines={1}>
          {progress.targetsCompleted + 1}/{progress.totalTargets} locations ·{' '}
          {progress.foundCount} files found ·{' '}
          {formatBytes(progress.foundBytes)}
        </Text>
      )}
    </View>
  );
}

// ─── Windows-Only Notice ──────────────────────────────────────────────────────

function WindowsOnlyNotice({ colors }: { colors: ThemeColors }) {
  return (
    <View style={{ gap: 16, marginTop: 8 }}>
      <View
        style={{
          padding: spacing.lg,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          gap: 12,
        }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: colors.tintBlue,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <SymbolView
            name={{ android: 'computer', ios: 'desktopcomputer', web: 'computer' }}
            tintColor={colors.primary}
            size={28}
          />
        </View>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '800',
            color: colors.heading,
            textAlign: 'center',
          }}>
          Windows PC Cleaner
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.secondary,
            textAlign: 'center',
            lineHeight: 19,
            maxWidth: 300,
          }}>
          This screen is designed for Windows desktop builds using React Native Windows.{'\n\n'}
          On Android, use the Smart Scan and App Cache scan tools from the Home tab.
        </Text>
      </View>

      <SectionHeader
        title="Scan Targets"
        subtitle="What will be scanned when running on Windows"
      />

      {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => (
        <View
          key={cat}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              backgroundColor: colors[cfg.tintBg],
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <SymbolView
              name={cfg.icon}
              tintColor={colors[cfg.accent]}
              size={17}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.heading }}>
              {cfg.label}
            </Text>
            <Text style={{ fontSize: 11, color: colors.secondary }}>{cfg.description}</Text>
          </View>
        </View>
      ))}

      <View
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.tintOrange,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
        }}>
        <SymbolView
          name={{ android: 'info', ios: 'info.circle.fill', web: 'info' }}
          tintColor={colors.orange}
          size={16}
        />
        <Text style={{ flex: 1, fontSize: 12, color: colors.heading, lineHeight: 17 }}>
          The Recycle Bin requires administrator elevation and cannot be accessed by user-mode
          apps. Use Windows Settings → Storage Sense for Recycle Bin management.
        </Text>
      </View>
    </View>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────

function FileRow({
  item,
  onToggle,
  colors,
}: {
  item: WindowsJunkEntry;
  onToggle: (id: string) => void;
  colors: ThemeColors;
}) {
  const cfg = CATEGORY_CONFIG[item.category];

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.name}, ${formatBytes(item.sizeBytes)}, ${item.selected ? 'selected' : 'not selected'}`}
      accessibilityState={{ checked: item.selected }}
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => [
        fileRowStyles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && fileRowStyles.pressed,
      ]}>
      <View
        style={[
          fileRowStyles.checkbox,
          { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
          item.selected && { borderColor: colors.primary, backgroundColor: colors.primary },
        ]}>
        {item.selected ? <Text style={fileRowStyles.checkMark}>✓</Text> : null}
      </View>

      <View
        style={[fileRowStyles.catDot, { backgroundColor: colors[cfg.tintBg] }]}>
        <SymbolView
          name={cfg.icon}
          tintColor={colors[cfg.accent]}
          size={12}
        />
      </View>

      <View style={fileRowStyles.details}>
        <Text style={[fileRowStyles.name, { color: colors.heading }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[fileRowStyles.path, { color: colors.secondary }]} numberOfLines={1}>
          {item.relativePath}
        </Text>
      </View>

      <Text style={[fileRowStyles.size, { color: colors.heading }]}>
        {formatBytes(item.sizeBytes)}
      </Text>
    </Pressable>
  );
}

const fileRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  pressed: { opacity: 0.7 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  catDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
  },
  path: {
    fontSize: 10,
    lineHeight: 14,
  },
  size: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WindowsCleanerScreen() {
  const { colors } = useTheme();

  const [scanResult, setScanResult] = useState<WindowsScanResult | null>(
    () => getLastWindowsScanResult()
  );
  const [entries, setEntries] = useState<WindowsJunkEntry[]>(
    () => getLastWindowsScanResult()?.entries ?? []
  );
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<WindowsScanProgress | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<WindowsCleanupReport | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const cancelRequested = useRef(false);

  const selectedEntries = useMemo(() => entries.filter((e) => e.selected), [entries]);
  const selectedBytes = useMemo(
    () => selectedEntries.reduce((s, e) => s + e.sizeBytes, 0),
    [selectedEntries]
  );

  const handleScan = useCallback(async () => {
    if (isScanning) return;
    if (Platform.OS !== 'windows') {
      Alert.alert(
        'Windows Only',
        'Windows junk scanning requires running on Windows with React Native Windows.'
      );
      return;
    }

    cancelRequested.current = false;
    setIsScanning(true);
    setProgress(null);
    setScanResult(null);
    setEntries([]);

    const result = await scanWindowsJunk({
      shouldCancel: () => cancelRequested.current,
      onProgress: setProgress,
    });

    setIsScanning(false);
    setScanResult(result);
    setEntries(result.entries.map((e) => ({ ...e, selected: true })));
  }, [isScanning]);

  const handleCancel = () => {
    cancelRequested.current = true;
  };

  const toggleItem = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)));
  };

  const toggleAll = (select: boolean) => {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: select })));
  };

  const handleClean = useCallback(
    async () => {
      if (selectedEntries.length === 0) {
        Alert.alert('No Items Selected', 'Please select at least one file to clean.');
        return;
      }

      // Show confirmation dialog first
      setShowConfirmationDialog(true);
    },
    [selectedEntries]
  );

  const handleConfirmCleanup = useCallback(async () => {
    setShowConfirmationDialog(false);
    setIsCleaningUp(true);

    try {
      const report = await cleanWindowsJunkFiles(selectedEntries);
      setCleanupReport(report);
      
      // Update entries list to remove deleted files if desired
      if (report.deletedCount > 0) {
        const deletedIds = new Set(
          report.items
            .filter((item) => item.status === 'deleted')
            .map((item) => item.id)
        );
        setEntries((prev) => prev.filter((e) => !deletedIds.has(e.id)));
      }
    } catch (err) {
      Alert.alert(
        'Cleanup Error',
        err instanceof Error ? err.message : 'An unexpected error occurred during cleanup.'
      );
    } finally {
      setIsCleaningUp(false);
    }
  }, [selectedEntries]);

  const handleCancelCleanup = useCallback(() => {
    setShowConfirmationDialog(false);
  }, []);

  const isWindows = Platform.OS === 'windows';

  return (
    <ScreenLayout activeTab="windows-cleaner">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <SectionHeader
            title="Windows PC Cleaner"
            subtitle={
              isWindows
                ? 'Scan and remove junk files from your Windows PC'
                : 'Windows desktop cleaning targets'
            }
          />
        </View>
        {isWindows && (
          <View style={styles.windowsBadge}>
            <SymbolView
              name={{ android: 'computer', ios: 'desktopcomputer', web: 'computer' }}
              tintColor={colors.primary}
              size={13}
            />
            <Text style={[styles.windowsBadgeText, { color: colors.primary }]}>WINDOWS</Text>
          </View>
        )}
      </View>

      {/* ── Not Windows: Info card ───────────────────────────────────────── */}
      {!isWindows && <WindowsOnlyNotice colors={colors} />}

      {/* ── Windows: Scan controls ───────────────────────────────────────── */}
      {isWindows && !isScanning && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan Windows PC for junk files"
          onPress={handleScan}
          style={({ pressed }) => [
            styles.scanBtn,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
            tintColor="#FFFFFF"
            size={18}
          />
          <Text style={styles.scanBtnText}>
            {scanResult ? 'Rescan Windows PC' : 'Scan Windows PC'}
          </Text>
        </Pressable>
      )}

      {/* ── Scanning State ───────────────────────────────────────────────── */}
      {isWindows && isScanning && (
        <View
          style={[
            styles.stateCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={[styles.stateIconWrap, { backgroundColor: colors.tintBlue }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.heading }]}>
            Scanning Windows PC…
          </Text>
          <Text style={[styles.stateSubtitle, { color: colors.secondary }]}>
            Looking through Temp folders, browser caches, and Windows system caches.
          </Text>
          <View style={{ width: '100%' }}>
            <ScanProgressBar progress={progress} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel scan"
            onPress={handleCancel}
            style={[styles.cancelBtn, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cancelBtnText, { color: colors.secondary }]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* ── Scan Results ─────────────────────────────────────────────────── */}
      {isWindows && scanResult && !isScanning && (
        <>
          {/* Cancellation Notice */}
          {scanResult.status === 'cancelled' && (
            <View
              style={{
                padding: 12,
                borderRadius: 14,
                backgroundColor: colors.tintOrange,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}>
              <SymbolView
                name={{ android: 'warning', ios: 'exclamationmark.triangle.fill', web: 'warning' }}
                tintColor={colors.orange}
                size={16}
              />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.heading, flex: 1 }}>
                Scan stopped by user. Traversal was cancelled promptly.
              </Text>
            </View>
          )}

          {/* Summary stats */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryValue, { color: colors.heading }]}>
                {scanResult.totalJunkCount}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Junk Files</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {formatBytes(scanResult.totalJunkBytes)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.secondary }]}>
                Reclaimable
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryValue, { color: colors.secondary }]}>
                {scanResult.scannedCount}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Checked</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryValue, { color: colors.orange }]}>
                {scanResult.skippedCount + scanResult.inaccessibleTargets.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Skipped</Text>
            </View>
          </View>

          {/* Category breakdown */}
          <SectionHeader title="Category Breakdown" subtitle="Junk found per category" />
          {(Object.keys(scanResult.categorySummary) as WindowsJunkCategory[]).map((cat) => (
            <CategorySummaryCard
              key={cat}
              category={cat}
              count={scanResult.categorySummary[cat].count}
              bytes={scanResult.categorySummary[cat].bytes}
              colors={colors}
            />
          ))}

          {/* Files list */}
          {entries.length > 0 && (
            <>
              <View style={styles.actionRow}>
                <View style={styles.selectionInfo}>
                  <Text style={[styles.selectionText, { color: colors.heading }]}>
                    {selectedEntries.length} of {entries.length} selected
                  </Text>
                  <Text style={[styles.selectionBytes, { color: colors.secondary }]}>
                    ({formatBytes(selectedBytes)})
                  </Text>
                </View>
                <View style={styles.toggleBtns}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select all files"
                    onPress={() => toggleAll(true)}
                    style={styles.textBtn}>
                    <Text style={[styles.textBtnLabel, { color: colors.primary }]}>All</Text>
                  </Pressable>
                  <Text style={[styles.btnDivider, { color: colors.border }]}>|</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Deselect all files"
                    onPress={() => toggleAll(false)}
                    style={styles.textBtn}>
                    <Text style={[styles.textBtnLabel, { color: colors.primary }]}>None</Text>
                  </Pressable>
                </View>
              </View>

              <FlatList
                data={entries}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <FileRow item={item} onToggle={toggleItem} colors={colors} />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                contentContainerStyle={{ paddingBottom: spacing.md }}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Clean ${selectedEntries.length} selected files`}
                disabled={isCleaningUp || selectedEntries.length === 0}
                onPress={handleClean}
                style={[
                  styles.cleanBtn,
                  {
                    backgroundColor:
                      selectedEntries.length === 0 ? colors.surfaceAlt : colors.primary,
                  },
                  (isCleaningUp || selectedEntries.length === 0) && styles.cleanBtnDisabled,
                ]}>
                {isCleaningUp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SymbolView
                    name={{ android: 'delete', ios: 'trash.fill', web: 'delete' }}
                    tintColor={selectedEntries.length === 0 ? colors.secondary : '#FFFFFF'}
                    size={18}
                  />
                )}
                <Text
                  style={[
                    styles.cleanBtnText,
                    {
                      color:
                        selectedEntries.length === 0 ? colors.secondary : '#FFFFFF',
                    },
                  ]}>
                  {isCleaningUp
                    ? 'Cleaning files…'
                    : `Clean Selected (${formatBytes(selectedBytes)})`}
                </Text>
              </Pressable>
            </>
          )}

          {entries.length === 0 && (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.tintGreen }]}>
                <SymbolView
                  name={{
                    android: 'check_circle',
                    ios: 'checkmark.circle.fill',
                    web: 'check_circle',
                  }}
                  tintColor={colors.green}
                  size={28}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.heading }]}>
                Your PC is clean!
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
                No junk files were found in the scanned locations.
              </Text>
            </View>
          )}

          {/* Inaccessible targets warning */}
          {scanResult.inaccessibleTargets.length > 0 && (
            <View
              style={[
                styles.warnCard,
                { backgroundColor: colors.tintOrange, borderColor: colors.border },
              ]}>
              <SymbolView
                name={{ android: 'warning', ios: 'exclamationmark.triangle.fill', web: 'warning' }}
                tintColor={colors.orange}
                size={16}
              />
              <Text style={[styles.warnText, { color: colors.heading }]}>
                {scanResult.inaccessibleTargets.length} location
                {scanResult.inaccessibleTargets.length !== 1 ? 's' : ''} skipped (not installed
                or not accessible without admin rights).
              </Text>
            </View>
          )}
        </>
      )}

      {/* ─── Confirmation Dialog ──────────────────────────────────────── */}
      <Modal
        visible={showConfirmationDialog}
        transparent
        animationType="fade"
        onRequestClose={handleCancelCleanup}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.tintOrange }]}>
              <SymbolView
                name={{
                  android: 'warning',
                  ios: 'exclamationmark.triangle.fill',
                  web: 'warning',
                }}
                tintColor={colors.orange}
                size={24}
              />
            </View>

            <Text style={[styles.modalTitle, { color: colors.heading }]}>
              Confirm Cleanup
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
              {selectedEntries.length} file{selectedEntries.length === 1 ? '' : 's'} ·{' '}
              {formatBytes(selectedBytes)} will be permanently deleted.
            </Text>

            {/* File list preview */}
            <ScrollView
              nestedScrollEnabled
              style={[
                styles.fileListPreview,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}>
              {selectedEntries.slice(0, 10).map((file) => (
                <View key={file.id} style={styles.previewFile}>
                  <Text style={[styles.previewFileName, { color: colors.heading }]}>
                    {file.name}
                  </Text>
                  <Text style={[styles.previewFilePath, { color: colors.secondary }]}>
                    {formatBytes(file.sizeBytes)}
                  </Text>
                </View>
              ))}
              {selectedEntries.length > 10 && (
                <Text style={[styles.previewMore, { color: colors.secondary }]}>
                  … and {selectedEntries.length - 10} more
                </Text>
              )}
            </ScrollView>

            <Text style={[styles.warningText, { color: colors.orange }]}>
              This action cannot be undone. Deleted files cannot be recovered.
            </Text>

            <View style={styles.modalButtonGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel cleanup"
                onPress={handleCancelCleanup}
                disabled={isCleaningUp}
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.modalCancelBtnText, { color: colors.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm cleanup and delete selected files"
                onPress={handleConfirmCleanup}
                disabled={isCleaningUp}
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: colors.danger },
                  isCleaningUp && styles.modalBtnDisabled,
                ]}>
                {isCleaningUp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SymbolView
                    name={{ android: 'delete', ios: 'trash.fill', web: 'delete' }}
                    tintColor="#FFFFFF"
                    size={16}
                  />
                )}
                <Text style={styles.modalConfirmBtnText}>
                  {isCleaningUp ? 'Cleaning…' : 'Delete Files'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Cleanup Report Modal ────────────────────────────────────────── */}
      <Modal
        visible={cleanupReport !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCleanupReport(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View
              style={[
                styles.reportIconWrap,
                {
                  backgroundColor:
                    cleanupReport && cleanupReport.failedCount === 0
                      ? colors.tintGreen
                      : colors.tintOrange,
                },
              ]}>
              <SymbolView
                name={{
                  android:
                    cleanupReport && cleanupReport.failedCount === 0
                      ? 'done_all'
                      : 'warning',
                  ios:
                    cleanupReport && cleanupReport.failedCount === 0
                      ? 'checkmark.seal.fill'
                      : 'exclamationmark.triangle.fill',
                  web:
                    cleanupReport && cleanupReport.failedCount === 0
                      ? 'done_all'
                      : 'warning',
                }}
                tintColor={
                  cleanupReport && cleanupReport.failedCount === 0
                    ? colors.green
                    : colors.orange
                }
                size={24}
              />
            </View>

            <Text style={[styles.modalTitle, { color: colors.heading }]}>
              {cleanupReport && cleanupReport.failedCount === 0
                ? 'Cleanup Complete'
                : 'Cleanup Finished'}
            </Text>

            {cleanupReport && (
              <>
                <View
                  style={[
                    styles.reportStats,
                    { backgroundColor: colors.surfaceAlt },
                  ]}>
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportKey, { color: colors.secondary }]}>
                      Deleted:
                    </Text>
                    <Text
                      style={[
                        styles.reportVal,
                        { color: colors.green },
                      ]}>
                      {cleanupReport.deletedCount} file{cleanupReport.deletedCount === 1 ? '' : 's'}
                    </Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Text style={[styles.reportKey, { color: colors.secondary }]}>
                      Space Freed:
                    </Text>
                    <Text
                      style={[
                        styles.reportVal,
                        { color: colors.primary },
                      ]}>
                      {formatBytes(cleanupReport.deletedBytes)}
                    </Text>
                  </View>

                  {cleanupReport.skippedCount > 0 && (
                    <View style={styles.reportRow}>
                      <Text style={[styles.reportKey, { color: colors.secondary }]}>
                        Skipped:
                      </Text>
                      <Text
                        style={[
                          styles.reportVal,
                          { color: colors.orange },
                        ]}>
                        {cleanupReport.skippedCount}
                      </Text>
                    </View>
                  )}

                  {cleanupReport.failedCount > 0 && (
                    <View style={styles.reportRow}>
                      <Text style={[styles.reportKey, { color: colors.secondary }]}>
                        Failed:
                      </Text>
                      <Text
                        style={[
                          styles.reportVal,
                          { color: colors.danger },
                        ]}>
                        {cleanupReport.failedCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Detailed failures */}
                {cleanupReport.items.some(
                  (item) => item.status === 'failed' || item.status === 'skipped'
                ) && (
                  <ScrollView
                    nestedScrollEnabled
                    style={[
                      styles.reportItemsList,
                      { borderColor: colors.border },
                    ]}>
                    {cleanupReport.items
                      .filter(
                        (item) =>
                          item.status === 'failed' || item.status === 'skipped'
                      )
                      .map((item) => (
                        <View key={item.id} style={styles.reportItemRow}>
                          <Text
                            style={[
                              styles.reportItemName,
                              { color: colors.heading },
                            ]}
                            numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.reportItemStatus,
                              {
                                color:
                                  item.status === 'failed'
                                    ? colors.danger
                                    : colors.orange,
                              },
                            ]}>
                            {item.status.toUpperCase()}
                            {item.message ? `: ${item.message}` : ''}
                          </Text>
                        </View>
                      ))}
                  </ScrollView>
                )}
              </>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close cleanup report"
              onPress={() => setCleanupReport(null)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={{ height: spacing.xl }} />
    </ScreenLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 12,
  },
  windowsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  windowsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.78 },

  stateCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginBottom: spacing.md,
  },
  stateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  stateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectionBytes: {
    fontSize: 12,
  },
  toggleBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  textBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnDivider: {
    fontSize: 12,
  },

  cleanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
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

  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: spacing.md,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },

  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  reportSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  warnCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },

  // Confirmation Dialog
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  fileListPreview: {
    maxHeight: 150,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  previewFile: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  previewFileName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewFilePath: {
    fontSize: 11,
  },
  previewMore: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 17,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnDisabled: {
    opacity: 0.65,
  },

  // Report Modal
  reportIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  reportStats: {
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportKey: {
    fontSize: 13,
  },
  reportVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  reportItemsList: {
    maxHeight: 120,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  reportItemRow: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  reportItemName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  reportItemStatus: {
    fontSize: 11,
  },
  modalCloseBtn: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
