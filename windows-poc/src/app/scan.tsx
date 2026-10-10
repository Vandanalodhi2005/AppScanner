import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { scanAndroidFolder } from '@/services/androidFileScanner';
import { setCurrentScanResult } from '@/services/scanSession';
import { colors, spacing } from '@/constants/ui';
import type { ScanProgress as ScanProgressData } from '@/types/storage';

export default function ScanScreen() {
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

    setCurrentScanResult(result);
    router.navigate('/results');
  };

  return (
    <ScreenLayout activeTab="scan">
      <View style={styles.header}>
        <SectionHeader title="Folder scan" subtitle="Read-only file discovery" />
        <View style={styles.previewBadge}>
          <View style={styles.dot} />
          <Text style={styles.previewText}>READ-ONLY</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.scanIcon}>
          <SymbolView
            name={{ android: 'manage_search', ios: 'viewfinder', web: 'manage_search' }}
            tintColor={colors.cyan}
            size={38}
          />
        </View>
        <Text style={styles.heroTitle}>
          {phase === 'scanning' ? 'Reading folder contents' : 'Choose a folder'}
        </Text>
        <Text style={styles.heroCopy}>
          {phase === 'scanning'
            ? `Scanning only the folder you authorized${progress?.currentPath ? ` · ${progress.currentPath}` : ''}`
            : 'Only files and folders accessible from the folder you select will be listed. Nothing is changed.'}
        </Text>
      </View>

      {phase === 'scanning' && progress ? (
        <View style={styles.progressCard}>
          <SectionHeader title={`${progress.filesFound} files found`} subtitle={`${progress.itemsVisited} items checked · ${formatBytes(progress.readableBytes)} readable`} compact />
          <Pressable
            accessibilityRole="button"
            onPress={() => { cancelRequested.current = true; }}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>Cancel scan</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.previewInfo}>
          <SectionHeader
            title={isAndroid ? 'Folder access is scoped' : 'Android folder scanning only'}
            subtitle={isAndroid
              ? 'Android will ask you to choose a folder. Other device folders and apps’ private data are not included.'
              : 'Use the Android app to choose a folder through the system picker.'}
            compact
          />
        </View>
      )}

      {phase !== 'scanning' ? (
        <PrimaryButton
          label={phase === 'selecting' ? 'OPENING FOLDER PICKER…' : 'CHOOSE FOLDER TO SCAN'}
          accessibilityLabel="Choose a folder to scan"
          onPress={chooseFolder}
          disabled={!isAndroid || phase === 'selecting'}
          icon={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }}
        />
      ) : null}

      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate({ pathname: '/results', params: { mode: 'demo' } })}
        style={styles.sampleResultsLink}>
        <Text style={styles.sampleResultsText}>Open clearly labeled demo results</Text>
      </Pressable>
    </ScreenLayout>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.surfaceAlt, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cyan },
  previewText: { color: colors.cyan, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  hero: { alignItems: 'center', paddingHorizontal: 18, marginBottom: spacing.xl },
  scanIcon: { width: 86, height: 86, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  heroCopy: { color: colors.secondary, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 310 },
  previewInfo: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  progressCard: { gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  sampleResultsLink: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: spacing.sm },
  sampleResultsText: { color: colors.cyan, fontSize: 13, fontWeight: '700' },
  notice: { color: colors.secondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: spacing.md },
  pressed: { opacity: 0.72 },
});
