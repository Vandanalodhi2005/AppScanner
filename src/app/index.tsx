import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppHeader } from '@/components/app-header';
import { AuthorizedLocationsCard } from '@/components/authorized-locations-card';
import { CategoryCard } from '@/components/category-card';
import { RecentScanCard } from '@/components/recent-scan-card';
import { ScanProgressCard } from '@/components/scan-progress-card';
import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { SmartScanCard } from '@/components/smart-scan-card';
import { StorageOverview } from '@/components/storage-overview';
import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';
import { scanAndroidFolder } from '@/services/androidFileScanner';
import {
  getLastAppCacheScanResult,
  scanAppCache,
} from '@/services/appCacheScanner';
import {
  refreshLocationsStatus,
} from '@/services/authorizedLocations';
import {
  scanAllAuthorizedLocations,
  scanAuthorizedLocation,
} from '@/services/authorizedStorageScanner';
import { getCurrentScanResult, setCurrentScanResult } from '@/services/scanSession';
import type { AppCacheScanResult } from '@/types/appCache';
import type { AuthorizedLocation } from '@/types/authorizedLocations';
import type { ScanProgress as ScanProgressData, ScanResult } from '@/types/storage';

const LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type ScanPhase = 'idle' | 'auto_scanning' | 'folder_selecting' | 'folder_scanning';

export default function DashboardScreen() {
  const { colors } = useTheme();

  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState<ScanProgressData | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(() => getCurrentScanResult());
  const [cacheResult, setCacheResult] = useState<AppCacheScanResult | null>(
    () => getLastAppCacheScanResult()
  );
  const [authorizedLocations, setAuthorizedLocations] = useState<AuthorizedLocation[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelRequested = useRef(false);

  useEffect(() => {
    refreshLocationsStatus().then(setAuthorizedLocations);
  }, []);

  // ─── 1. Automatic App-Owned Cache Scanner ─────────────────────────────
  const handleAutoScan = async () => {
    if (phase !== 'idle') return;

    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android Platform Only',
        'Automatic app-cache scanning is currently supported on Android.'
      );
      return;
    }

    setNotice(null);
    setPhase('auto_scanning');

    const result = await scanAppCache();
    setPhase('idle');
    setCacheResult(result);

    if (result.status === 'completed') {
      router.navigate('/cleanup');
    } else if (result.status === 'failed') {
      setNotice(`Auto Scan failed: ${result.errorMessage || 'Unknown error'}`);
    }
  };

  // ─── 2. Manual Folder Scanner (SAF) ──────────────────────────────────
  const handleFolderScan = async () => {
    if (phase !== 'idle') return;

    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android Platform Only',
        'System folder scanning is supported on Android via the Storage Access Framework folder picker.'
      );
      return;
    }

    cancelRequested.current = false;
    setNotice(null);
    setProgress(null);
    setCurrentFolder(null);
    setPhase('folder_selecting');

    const result = await scanAndroidFolder({
      onFolderSelected: (folder) => {
        setCurrentFolder(folder);
        setPhase('folder_scanning');
      },
      onProgress: setProgress,
      shouldCancel: () => cancelRequested.current,
    });

    setPhase('idle');
    setCurrentScanResult(result);
    setScanResult(result);

    if (result.status === 'cancelled') {
      setNotice(
        result.rootUri === null
          ? 'Folder selection was cancelled. No files were scanned.'
          : 'Folder scan was safely cancelled. Partial results saved.'
      );
    } else if (result.status === 'failed') {
      setNotice(`Scan could not complete: ${result.issues[0]?.message || 'Unknown error'}`);
    } else {
      setNotice(null);
      router.navigate('/results');
    }
  };

  // ─── 3. Authorized Storage Scanner v2 (Persisted SAF Access) ──────────
  const handleScanLocation = async (loc: AuthorizedLocation) => {
    if (phase !== 'idle') return;

    cancelRequested.current = false;
    setNotice(null);
    setProgress(null);
    setCurrentFolder(loc.name);
    setPhase('folder_scanning');

    const res = await scanAuthorizedLocation(loc, {
      onProgress: setProgress,
      shouldCancel: () => cancelRequested.current,
    });

    setPhase('idle');
    const fullResult: ScanResult = {
      status: res.status,
      rootUri: res.rootUri,
      rootName: res.locationName,
      entries: res.entries,
      fileCount: res.fileCount,
      directoryCount: res.directoryCount,
      totalReadableBytes: res.totalReadableBytes,
      issues: res.issues,
      issueCount: res.issueCount,
      startedAt: res.startedAt,
      finishedAt: res.finishedAt,
    };
    setCurrentScanResult(fullResult);
    setScanResult(fullResult);
    refreshLocationsStatus().then(setAuthorizedLocations);

    if (res.status === 'failed') {
      setNotice(`Scan could not complete: ${res.issues[0]?.message || 'Unknown issue'}`);
    } else {
      router.navigate('/results');
    }
  };

  const handleScanAllAuthorized = async () => {
    if (phase !== 'idle') return;

    cancelRequested.current = false;
    setNotice(null);
    setProgress(null);
    setCurrentFolder('Authorized Locations');
    setPhase('folder_scanning');

    const res = await scanAllAuthorizedLocations({
      onProgress: setProgress,
      shouldCancel: () => cancelRequested.current,
    });

    setPhase('idle');
    const fullResult: ScanResult = {
      status: res.status,
      rootUri: 'multi://authorized-locations',
      rootName: `Authorized Storage (${res.locationsScanned} folders)`,
      entries: res.entries,
      fileCount: res.fileCount,
      directoryCount: res.directoryCount,
      totalReadableBytes: res.totalReadableBytes,
      issues: res.issues,
      issueCount: res.issueCount,
      startedAt: res.startedAt,
      finishedAt: res.finishedAt,
    };
    setCurrentScanResult(fullResult);
    setScanResult(fullResult);
    refreshLocationsStatus().then(setAuthorizedLocations);

    if (res.locationsRevoked > 0) {
      setNotice(`${res.locationsRevoked} location(s) had permissions revoked and were skipped.`);
    }

    router.navigate('/results');
  };

  const handleCancelScan = () => {
    cancelRequested.current = true;
  };

  // Real category metrics calculated from actual folder entries
  const largeFiles = (scanResult?.entries ?? []).filter(
    (e) => e.kind === 'file' && (e.sizeBytes ?? 0) >= LARGE_FILE_THRESHOLD_BYTES
  );
  const largeFilesTotalBytes = largeFiles.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);

  const otherFiles = (scanResult?.entries ?? []).filter(
    (e) => e.kind === 'file' && (e.sizeBytes ?? 0) < LARGE_FILE_THRESHOLD_BYTES
  );
  const otherFilesTotalBytes = otherFiles.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);

  return (
    <ScreenLayout activeTab="home">
      {/* ─── 1. Header ────────────────────────────────────────────── */}
      <AppHeader />

      {/* ─── 2. Welcome Area ──────────────────────────────────────── */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeHeading, { color: colors.heading }]}>
          Your device, under control
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.secondary }]}>
          Scan accessible files and review storage usage.
        </Text>
      </View>

      {/* ─── 3. Smart Scan Card ───────────────────────────────────── */}
      <SmartScanCard
        onAutoScan={handleAutoScan}
        onFolderScan={handleFolderScan}
        disabled={phase !== 'idle'}
        phase={phase}
      />

      {/* ─── 3b. Windows PC Cleaner Banner ────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Windows PC Cleaner"
        onPress={() => router.navigate('/windows-cleaner' as never)}
        style={({ pressed }) => [
          styles.windowsBanner,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}>
        <View style={[styles.windowsBannerIcon, { backgroundColor: colors.tintCyan }]}>
          <SymbolView
            name={{ android: 'computer', ios: 'desktopcomputer', web: 'computer' }}
            tintColor={colors.cyan}
            size={20}
          />
        </View>
        <View style={styles.windowsBannerInfo}>
          <Text style={[styles.windowsBannerTitle, { color: colors.heading }]}>
            Windows PC Cleaner
          </Text>
          <Text style={[styles.windowsBannerSub, { color: colors.secondary }]}>
            {Platform.OS === 'windows'
              ? 'Scan Temp, browser cache & Windows junk'
              : 'Tap to view Windows desktop cleaning tools'}
          </Text>
        </View>
        <View style={[styles.windowsBannerBadge, { backgroundColor: colors.tintCyan }]}>
          <Text style={[styles.windowsBannerBadgeText, { color: colors.cyan }]}>
            {Platform.OS === 'windows' ? 'Scan PC →' : 'View →'}
          </Text>
        </View>
      </Pressable>


      {/* ─── 4. Live Scan Progress Card (When Active) ──────────────── */}
      {(phase === 'folder_scanning' || phase === 'auto_scanning') && (
        <ScanProgressCard
          progress={progress}
          folderName={
            phase === 'auto_scanning'
              ? 'ScannerApp Cache (/cache)'
              : currentFolder
          }
          onCancel={handleCancelScan}
        />
      )}

      {/* Notice banner */}
      {notice && phase === 'idle' ? (
        <View style={[styles.noticeBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SymbolView
            name={{ android: 'info', ios: 'info.circle.fill', web: 'info' }}
            tintColor={colors.secondary}
            size={18}
          />
          <Text style={[styles.noticeText, { color: colors.secondary }]}>{notice}</Text>
        </View>
      ) : null}

      {/* ─── 5. Cache Auto-Scan Summary Banner (If Previously Run) ──── */}
      {cacheResult && cacheResult.totalCandidateCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review pending app cache cleanup"
          onPress={() => router.navigate('/cleanup')}
          style={({ pressed }) => [
            styles.cacheBanner,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <View style={styles.cacheBannerLeft}>
            <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
              <SymbolView
                name={{ android: 'auto_awesome', ios: 'sparkles', web: 'auto_awesome' }}
                tintColor={colors.primary}
                size={18}
              />
            </View>
            <View style={styles.cacheBannerInfo}>
              <Text style={[styles.cacheBannerTitle, { color: colors.heading }]}>
                App Cache Clean Candidates
              </Text>
              <Text style={[styles.cacheBannerSub, { color: colors.secondary }]}>
                {cacheResult.totalCandidateCount} items · {formatBytes(cacheResult.totalCandidateBytes)} ready for review
              </Text>
            </View>
          </View>
          <View style={[styles.reviewBadge, { backgroundColor: colors.tintBlue }]}>
            <Text style={[styles.reviewBadgeText, { color: colors.primary }]}>Review →</Text>
          </View>
        </Pressable>
      ) : null}

      {/* ─── 5b. Authorized Storage Locations (v2) ────────────────── */}
      <AuthorizedLocationsCard
        locations={authorizedLocations}
        onLocationsChange={() => {
          refreshLocationsStatus().then(setAuthorizedLocations);
        }}
        onScanLocation={handleScanLocation}
        onScanAll={handleScanAllAuthorized}
        disabled={phase !== 'idle'}
      />

      {/* ─── 6. Storage Overview (Folder Scan Results) ─────────────── */}
      <View style={styles.sectionHeaderRow}>
        <SectionHeader
          title="Storage Overview"
          subtitle="Real measurements from authorized folders"
        />
      </View>
      <StorageOverview
        scanResult={scanResult}
        onViewFiles={() => router.navigate('/results')}
      />

      {/* ─── 7. Category Cards ────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <SectionHeader
          title="Scan Categories"
          subtitle="Specific storage classifications"
        />
      </View>

      <View style={styles.categoryGrid}>
        {/* App Cache Files */}
        <CategoryCard
          title="App Cache Files"
          description="Temporary cache files owned by ScannerApp."
          icon={{ android: 'auto_awesome', ios: 'sparkles', web: 'auto_awesome' }}
          accent={colors.primary}
          tintBg={colors.tintBlue}
          badgeLabel={
            cacheResult
              ? cacheResult.totalCandidateCount > 0
                ? `${cacheResult.totalCandidateCount} items`
                : 'Clean'
              : 'Auto'
          }
          statusLabel={
            cacheResult
              ? `${cacheResult.totalCandidateCount} files · ${formatBytes(
                  cacheResult.totalCandidateBytes
                )}`
              : 'Tap to Auto Scan'
          }
          onPress={() => {
            if (cacheResult) {
              router.navigate('/cleanup');
            } else {
              handleAutoScan();
            }
          }}
        />

        {/* Other Apps' Cache */}
        <CategoryCard
          title="Other Apps' Cache"
          description="Android restricts direct access to other apps' private cache."
          icon={{ android: 'cached', ios: 'arrow.triangle.2.circlepath', web: 'cached' }}
          accent={colors.purple}
          tintBg={colors.tintPurple}
          badgeLabel="Restricted"
          statusLabel="Android protected"
          onPress={() => {
            Alert.alert(
              'Android Cache Protection',
              'The Android Storage Access Framework intentionally prevents third-party cleaner apps from inspecting or deleting private cache files owned by other applications.'
            );
          }}
        />

        {/* Large Files */}
        <CategoryCard
          title="Large Files"
          description="Files exceeding the 10 MB threshold in your scanned folder."
          icon={{ android: 'folder_zip', ios: 'doc.zipper', web: 'folder_zip' }}
          accent={colors.primary}
          tintBg={colors.tintBlue}
          badgeLabel={scanResult ? `${largeFiles.length} files` : 'Ready'}
          statusLabel={
            scanResult
              ? `${largeFiles.length} files · ${formatBytes(largeFilesTotalBytes)}`
              : 'Scan folder to inspect'
          }
          onPress={() => {
            if (scanResult) {
              router.navigate('/results?filter=large');
            } else {
              Alert.alert('Folder Scan Required', 'Please run a folder scan first to inspect large files.');
            }
          }}
        />

        {/* Other Files */}
        <CategoryCard
          title="Other Files"
          description="All accessible standard files found within your authorized folder."
          icon={{ android: 'insert_drive_file', ios: 'doc', web: 'insert_drive_file' }}
          accent={colors.cyan}
          tintBg={colors.tintCyan}
          badgeLabel={scanResult ? `${otherFiles.length} files` : 'Ready'}
          statusLabel={
            scanResult
              ? `${otherFiles.length} files · ${formatBytes(otherFilesTotalBytes)}`
              : 'Scan folder to inspect'
          }
          onPress={() => {
            if (scanResult) {
              router.navigate('/results');
            } else {
              Alert.alert('Folder Scan Required', 'Please run a folder scan first to inspect files.');
            }
          }}
        />
      </View>

      {/* ─── 8. Recent Scan Section ───────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <SectionHeader
          title="Recent Scan"
          subtitle="Last session folder discovery"
        />
      </View>
      <RecentScanCard
        scanResult={scanResult}
        onPress={() => router.navigate('/results')}
      />

      <View style={{ height: spacing.xl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  welcomeSection: {
    marginBottom: spacing.lg,
  },
  welcomeHeading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionHeaderRow: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },

  cacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  cacheBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheBannerInfo: {
    flex: 1,
    gap: 2,
  },
  cacheBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cacheBannerSub: {
    fontSize: 11,
  },
  reviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  reviewBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },

  // Windows PC Cleaner banner
  windowsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  windowsBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowsBannerInfo: {
    flex: 1,
    gap: 2,
  },
  windowsBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  windowsBannerSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  windowsBannerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  windowsBannerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
