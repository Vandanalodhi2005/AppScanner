import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';
import { getScanHistory, setCurrentScanResult } from '@/services/scanSession';
import type { ScanResult } from '@/types/storage';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [history] = useState<ScanResult[]>(() => getScanHistory());

  const handleOpenScan = (scan: ScanResult) => {
    setCurrentScanResult(scan);
    router.navigate('/results');
  };

  return (
    <ScreenLayout activeTab="history">
      {/* Header */}
      <View style={styles.header}>
        <SectionHeader title="Scan History" subtitle="Previous folder scan sessions" />
      </View>

      {history.length > 0 ? (
        <View style={styles.list}>
          {history.map((scan, index) => (
            <Pressable
              key={`${scan.startedAt}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Scan of ${scan.rootName || 'folder'}, ${scan.fileCount} files, ${formatBytes(scan.totalReadableBytes)}`}
              onPress={() => handleOpenScan(scan)}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.iconBox, { backgroundColor: colors.tintGreen }]}>
                <SymbolView
                  name={{ android: 'check_circle', ios: 'checkmark.circle.fill', web: 'check_circle' }}
                  tintColor={colors.green}
                  size={20}
                />
              </View>

              <View style={styles.itemInfo}>
                <Text style={[styles.folderName, { color: colors.heading }]} numberOfLines={1}>
                  {scan.rootName || 'Authorized Folder'}
                </Text>
                <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
                  {scan.fileCount.toLocaleString()} files · {scan.directoryCount} folders · {new Date(scan.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.itemRight}>
                <Text style={[styles.sizeText, { color: colors.green }]}>{formatBytes(scan.totalReadableBytes)}</Text>
                <SymbolView
                  name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
                  tintColor={colors.secondary}
                  size={16}
                />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.tintBlue }]}>
            <SymbolView
              name={{ android: 'history', ios: 'clock.arrow.circlepath', web: 'history' }}
              tintColor={colors.primary}
              size={24}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.heading }]}>No scans yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
            Start a scan to see your results. When you scan folders, your session history will be displayed here.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new scan"
            onPress={() => router.navigate('/scan')}
            style={[styles.startScanBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.startScanBtnText}>Start a Scan</Text>
          </Pressable>
        </View>
      )}

      {/* Safety info footer */}
      <View style={[styles.footerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.footerHeader}>
          <SymbolView
            name={{ android: 'security', ios: 'lock.shield', web: 'security' }}
            tintColor={colors.primary}
            size={16}
          />
          <Text style={[styles.footerTitle, { color: colors.heading }]}>Safe, In-Memory Session History</Text>
        </View>
        <Text style={[styles.footerCopy, { color: colors.secondary }]}>
          Scan records are retained in memory during your active session. ScannerApp never alters, modifies, or deletes any files on your device.
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  item: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 11,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  emptyCard: {
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
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
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  startScanBtn: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startScanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  footerCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  footerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerCopy: {
    fontSize: 11,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});
