import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';
import type { ScanResult } from '@/types/storage';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type RecentScanCardProps = {
  scanResult: ScanResult | null;
  onPress?: () => void;
};

export function RecentScanCard({ scanResult, onPress }: RecentScanCardProps) {
  const { colors } = useTheme();

  if (!scanResult) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.secondary }]}>No scans yet.</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Recent scan of ${scanResult.rootName || 'folder'}, ${scanResult.fileCount} files, ${formatBytes(scanResult.totalReadableBytes)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintGreen }]}>
            <SymbolView
              name={{ android: 'check_circle', ios: 'checkmark.circle.fill', web: 'check_circle' }}
              tintColor={colors.green}
              size={20}
            />
          </View>
          <View>
            <Text style={[styles.folderName, { color: colors.heading }]}>
              {scanResult.rootName || 'Authorized Folder'}
            </Text>
            <Text style={[styles.timestamp, { color: colors.secondary }]}>
              Finished {new Date(scanResult.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <SymbolView
          name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
          tintColor={colors.secondary}
          size={18}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.heading }]}>{scanResult.fileCount.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Files Scanned</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.green }]}>
            {formatBytes(scanResult.totalReadableBytes)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Scanned Size</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.heading }]}>{scanResult.directoryCount.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Folders</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
