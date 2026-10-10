import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';
import type { ScanProgress } from '@/types/storage';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function truncatePath(path: string, maxLen = 38): string {
  if (path.length <= maxLen) return path;
  const parts = path.split('/');
  if (parts.length > 3) {
    const tail = parts.slice(-2).join('/');
    return `…/${tail.length > maxLen - 3 ? tail.slice(-(maxLen - 3)) : tail}`;
  }
  return `…${path.slice(-(maxLen - 1))}`;
}

type ScanProgressCardProps = {
  progress: ScanProgress | null;
  folderName?: string | null;
  onCancel: () => void;
};

export function ScanProgressCard({ progress, folderName, onCancel }: ScanProgressCardProps) {
  const { colors } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(sweep, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [sweep]);

  const fillWidth = sweep.interpolate({ inputRange: [0, 1], outputRange: ['15%', '85%'] });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={[styles.pulsingDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.headerTitle, { color: colors.heading }]}>Scanning files...</Text>
      </View>

      {folderName ? (
        <View style={styles.folderRow}>
          <SymbolView
            name={{ android: 'folder_open', ios: 'folder', web: 'folder_open' }}
            tintColor={colors.primary}
            size={16}
          />
          <Text style={[styles.folderText, { color: colors.primary }]} numberOfLines={1}>
            {folderName}
          </Text>
        </View>
      ) : null}

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: colors.primary }]} />
      </View>

      {progress ? (
        <>
          <Text style={[styles.pathText, { color: colors.secondary }]} numberOfLines={1} ellipsizeMode="middle">
            {truncatePath(progress.currentPath)}
          </Text>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCell, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.metricValue, { color: colors.heading }]}>{progress.filesFound.toLocaleString()}</Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Files Found</Text>
            </View>
            <View style={[styles.metricCell, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.metricValue, { color: colors.green }]}>
                {formatBytes(progress.readableBytes)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Scanned Size</Text>
            </View>
            <View style={[styles.metricCell, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.metricValue, { color: colors.heading }]}>{progress.directoriesVisited.toLocaleString()}</Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Folders</Text>
            </View>
            <View style={[styles.metricCell, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.metricValue, { color: colors.heading }]}>{progress.itemsVisited.toLocaleString()}</Text>
              <Text style={[styles.metricLabel, { color: colors.secondary }]}>Checked</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={[styles.connectingText, { color: colors.secondary }]}>Reading folder contents…</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel scan"
        onPress={onCancel}
        style={({ pressed }) => [
          styles.cancelBtn,
          { backgroundColor: colors.tintDanger },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ android: 'close', ios: 'xmark', web: 'close' }}
          tintColor={colors.danger}
          size={14}
        />
        <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Cancel Scan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  folderText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  track: {
    height: 7,
    borderRadius: 7,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  fill: {
    height: '100%',
    borderRadius: 7,
  },
  pathText: {
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  connectingText: {
    fontSize: 12,
    marginVertical: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.sm,
  },
  metricCell: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 11,
    marginTop: spacing.xs,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
