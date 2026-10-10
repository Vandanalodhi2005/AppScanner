import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/context/theme-context';
import { scanAndroidFolder } from '@/services/androidFileScanner';
import { setCurrentScanResult } from '@/services/scanSession';
import { spacing } from '@/constants/ui';
import type { ScanProgress as ScanProgressData } from '@/types/storage';

// ─── helpers ────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function truncatePath(path: string, maxLen = 42): string {
  if (path.length <= maxLen) return path;
  const parts = path.split('/');
  if (parts.length > 3) {
    const tail = parts.slice(-2).join('/');
    return `…/${tail.length > maxLen - 3 ? tail.slice(-(maxLen - 3)) : tail}`;
  }
  return `…${path.slice(-(maxLen - 1))}`;
}

// ─── animated indeterminate progress bar ────────────────────────────────────
function ScanProgressBar({ itemsVisited }: { itemsVisited: number }) {
  const { colors } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(sweep, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    return () => {
      sweep.stopAnimation();
      pulse.stopAnimation();
    };
  }, [pulse, sweep]);

  const fillWidth = sweep.interpolate({ inputRange: [0, 1], outputRange: ['10%', '85%'] });

  return (
    <View style={pbStyles.wrap}>
      <View style={[pbStyles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[pbStyles.fill, { width: fillWidth, backgroundColor: colors.primary }]} />
      </View>
      <View style={pbStyles.row}>
        <Animated.View style={[pbStyles.dot, { transform: [{ scale: pulse }], backgroundColor: colors.primary }]} />
        <Text style={[pbStyles.liveLabel, { color: colors.primary }]}>SCANNING LIVE</Text>
        <Text style={[pbStyles.countLabel, { color: colors.secondary }]}>
          {itemsVisited.toLocaleString()} items checked
        </Text>
      </View>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  wrap: { gap: 8 },
  track: { height: 7, borderRadius: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  liveLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  countLabel: { marginLeft: 'auto', fontSize: 11 },
});

// ─── live stats grid ────────────────────────────────────────────────────────
function LiveStats({ progress }: { progress: ScanProgressData }) {
  const { colors } = useTheme();

  const stats = [
    { label: 'Files Found', value: progress.filesFound.toLocaleString(), accent: colors.primary },
    { label: 'Folders', value: progress.directoriesVisited.toLocaleString(), accent: colors.purple },
    { label: 'Scanned Size', value: formatBytes(progress.readableBytes), accent: colors.green },
    { label: 'Total Checked', value: progress.itemsVisited.toLocaleString(), accent: colors.orange },
  ];
  return (
    <View style={gsStyles.grid}>
      {stats.map((s) => (
        <View
          key={s.label}
          style={[
            gsStyles.cell,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}>
          <Text style={[gsStyles.value, { color: s.accent }]}>{s.value}</Text>
          <Text style={[gsStyles.label, { color: colors.secondary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const gsStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    flex: 1,
    minWidth: '44%',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '500' },
});

// ─── main screen ────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const { colors } = useTheme();

  const [phase, setPhase] = useState<'idle' | 'selecting' | 'scanning'>('idle');
  const [progress, setProgress] = useState<ScanProgressData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelRequested = useRef(false);
  const isAndroid = Platform.OS === 'android';

  const chooseFolder = async () => {
    if (!isAndroid || phase !== 'idle') return;
    cancelRequested.current = false;
    setNotice(null);
    setProgress(null);
    setPhase('selecting');

    const result = await scanAndroidFolder({
      onFolderSelected: () => setPhase('scanning'),
      onProgress: setProgress,
      shouldCancel: () => cancelRequested.current,
    });

    if (result.status === 'cancelled' && result.rootUri === null) {
      setPhase('idle');
      setNotice('Folder selection was cancelled. No scan was performed.');
      return;
    }

    setPhase('idle');
    setCurrentScanResult(result);
    router.navigate('/results');
  };

  return (
    <ScreenLayout activeTab="scan">
      {/* header */}
      <View style={styles.header}>
        <SectionHeader title="Folder Scan" subtitle="Read-only file discovery" />
        <View style={[styles.badge, { backgroundColor: colors.tintGreen, borderColor: colors.border }]}>
          <View style={[styles.badgeDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.badgeText, { color: colors.green }]}>READ-ONLY</Text>
        </View>
      </View>

      {/* hero card */}
      <View
        style={[
          styles.hero,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <View style={[styles.scanIconWrap, { backgroundColor: colors.tintBlue, borderColor: colors.border }]}>
          <SymbolView
            name={{ android: 'manage_search', ios: 'viewfinder', web: 'manage_search' }}
            tintColor={colors.primary}
            size={36}
          />
        </View>
        <Text style={[styles.heroTitle, { color: colors.heading }]}>
          {phase === 'scanning'
            ? 'Scanning your folder…'
            : phase === 'selecting'
              ? 'Opening folder picker…'
              : 'Choose a folder to scan'}
        </Text>
        <Text style={[styles.heroCopy, { color: colors.secondary }]}>
          {phase === 'scanning'
            ? 'Only files inside the folder you authorized are listed. Nothing is deleted or modified.'
            : 'Android will prompt you to pick a folder. Only files you authorize are listed — no changes are made.'}
        </Text>
      </View>

      {/* active scanning card */}
      {phase === 'scanning' && progress ? (
        <View
          style={[
            styles.scanCard,
            { backgroundColor: colors.surface, borderColor: colors.primary },
          ]}>
          {/* current path */}
          <View style={styles.pathRow}>
            <SymbolView
              name={{ android: 'folder_open', ios: 'folder', web: 'folder_open' }}
              tintColor={colors.primary}
              size={16}
            />
            <Text
              style={[styles.pathText, { color: colors.primary }]}
              numberOfLines={1}
              ellipsizeMode="middle">
              {truncatePath(progress.currentPath)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />

          {/* animated progress bar */}
          <ScanProgressBar itemsVisited={progress.itemsVisited} />
          <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />

          {/* live stats grid */}
          <LiveStats progress={progress} />
          <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />

          {/* cancel */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel scan"
            onPress={() => {
              cancelRequested.current = true;
            }}
            style={({ pressed }) => [
              styles.cancelButton,
              { backgroundColor: colors.tintDanger },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ android: 'close', ios: 'xmark', web: 'close' }}
              tintColor={colors.danger}
              size={14}
            />
            <Text style={[styles.cancelText, { color: colors.danger }]}>Cancel scan</Text>
          </Pressable>
        </View>
      ) : (
        /* idle info card */
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.tintBlue }]}>
              <SymbolView
                name={{ android: 'security', ios: 'lock.shield', web: 'security' }}
                tintColor={colors.primary}
                size={18}
              />
            </View>
            <View style={styles.infoBody}>
              <Text style={[styles.infoTitle, { color: colors.heading }]}>
                {isAndroid ? 'Folder access is scoped' : 'Android folder scanning only'}
              </Text>
              <Text style={[styles.infoCopy, { color: colors.secondary }]}>
                {isAndroid
                  ? 'Android asks you to choose a folder. Other device folders and app private data are never touched.'
                  : 'Use the Android app to choose a folder through the system picker.'}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.tintGreen }]}>
              <SymbolView
                name={{ android: 'check_circle', ios: 'checkmark.circle.fill', web: 'check_circle' }}
                tintColor={colors.green}
                size={18}
              />
            </View>
            <View style={styles.infoBody}>
              <Text style={[styles.infoTitle, { color: colors.heading }]}>Zero file changes</Text>
              <Text style={[styles.infoCopy, { color: colors.secondary }]}>
                Files and folders are listed for review only. No item is deleted or modified.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <PrimaryButton
          label={
            phase === 'scanning'
              ? 'SCANNING…'
              : phase === 'selecting'
                ? 'OPENING PICKER…'
                : 'CHOOSE FOLDER TO SCAN'
          }
          accessibilityLabel="Open folder picker to scan"
          disabled={phase !== 'idle' || !isAndroid}
          onPress={chooseFolder}
          icon={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }}
        />
        {!isAndroid ? (
          <Text style={[styles.platformWarning, { color: colors.orange }]}>
            Folder scanning is supported on Android devices.
          </Text>
        ) : null}
      </View>

      {/* notice */}
      {notice ? (
        <View
          style={[
            styles.noticeBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <SymbolView
            name={{ android: 'info', ios: 'info.circle', web: 'info' }}
            tintColor={colors.secondary}
            size={16}
          />
          <Text style={[styles.noticeText, { color: colors.secondary }]}>{notice}</Text>
        </View>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  hero: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  scanIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroCopy: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 320,
  },

  scanCard: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  pathText: { flex: 1, fontSize: 12, fontWeight: '600' },
  divider: { height: 1, marginVertical: 10 },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 12,
  },
  cancelText: { fontSize: 13, fontWeight: '700' },

  infoCard: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoBody: { flex: 1, gap: 2 },
  infoTitle: { fontSize: 13, fontWeight: '700' },
  infoCopy: { fontSize: 12, lineHeight: 17 },

  ctaWrap: { marginTop: spacing.xs, marginBottom: spacing.sm },
  platformWarning: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  noticeText: { fontSize: 12, flex: 1, lineHeight: 17 },
  pressed: { opacity: 0.72 },
});
