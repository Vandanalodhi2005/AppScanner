import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';
import type { ScanResult } from '@/types/storage';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'Not available';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type StorageOverviewProps = {
  scanResult: ScanResult | null;
  onViewFiles?: () => void;
};

export function StorageOverview({ scanResult, onViewFiles }: StorageOverviewProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      {scanResult ? (
        <>
          <View style={[styles.folderBanner, { borderBottomColor: colors.surfaceAlt }]}>
            <View style={styles.folderLeft}>
              <SymbolView
                name={{ android: 'folder', ios: 'folder.fill', web: 'folder' }}
                tintColor={colors.primary}
                size={18}
              />
              <Text style={[styles.folderName, { color: colors.heading }]} numberOfLines={1}>
                {scanResult.rootName || 'Authorized Folder'}
              </Text>
            </View>
            {onViewFiles ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View scanned file list"
                onPress={onViewFiles}
                style={({ pressed }) => [styles.viewFilesLink, pressed && styles.pressed]}>
                <Text style={[styles.viewFilesLinkText, { color: colors.primary }]}>View Files →</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.grid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
                <SymbolView
                  name={{ android: 'insert_drive_file', ios: 'doc.fill', web: 'insert_drive_file' }}
                  tintColor={colors.primary}
                  size={18}
                />
              </View>
              <Text style={[styles.metricValue, { color: colors.heading }]}>
                {scanResult.fileCount.toLocaleString()}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Total Scanned Files</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.tintGreen }]}>
                <SymbolView
                  name={{ android: 'storage', ios: 'internaldrive.fill', web: 'storage' }}
                  tintColor={colors.green}
                  size={18}
                />
              </View>
              <Text style={[styles.metricValue, { color: colors.green }]}>
                {formatBytes(scanResult.totalReadableBytes)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Total Scanned Size</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.tintPurple }]}>
                <SymbolView
                  name={{ android: 'folder_shared', ios: 'folder.badge.gearshape', web: 'folder_shared' }}
                  tintColor={colors.purple}
                  size={18}
                />
              </View>
              <Text style={[styles.metricValue, { color: colors.heading }]}>
                {scanResult.directoryCount.toLocaleString()}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Scanned Folders</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.tintOrange }]}>
                <SymbolView
                  name={{ android: 'warning', ios: 'exclamationmark.triangle.fill', web: 'warning' }}
                  tintColor={colors.orange}
                  size={18}
                />
              </View>
              <Text style={[styles.metricValue, { color: colors.heading }]}>
                {scanResult.issueCount.toLocaleString()}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Unreadable Items</Text>
            </View>
          </View>

          <View style={[styles.disclaimer, { borderTopColor: colors.surfaceAlt }]}>
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              Note: Measurements reflect accessible files in {scanResult.rootName || 'the authorized folder'}. ScannerApp does not claim whole-device storage access.
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue, width: 44, height: 44 }]}>
            <SymbolView
              name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
              tintColor={colors.primary}
              size={22}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.heading }]}>No storage scanned yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
            Start a scan above to calculate file totals and folder sizes. Values will appear here once scanning completes.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  folderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  folderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewFilesLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewFilesLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
  },
  disclaimer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  disclaimerText: {
    fontSize: 10,
    lineHeight: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
});
