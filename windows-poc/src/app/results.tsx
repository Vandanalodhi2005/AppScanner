import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FileListItem, formatBytes } from '@/components/file-list-item';
import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { mockFiles } from '@/constants/mock-data';
import { colors, spacing } from '@/constants/ui';
import { getCurrentScanResult } from '@/services/scanSession';
import type { ScannedEntry } from '@/types/storage';

export default function ResultsScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isDemo = mode === 'demo';
  const scan = isDemo ? null : getCurrentScanResult();
  const [files, setFiles] = useState<ScannedEntry[]>(() => (
    isDemo ? mockFiles.map(toDemoEntry) : scan?.entries ?? []
  ));

  useEffect(() => {
    setFiles(isDemo ? mockFiles.map(toDemoEntry) : scan?.entries ?? []);
  }, [isDemo, scan]);

  const selectedFiles = files.filter((file) => file.selected);
  const selectedBytes = useMemo(
    () => selectedFiles.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0),
    [selectedFiles],
  );
  const accessibleFileCount = files.filter((file) => file.kind === 'file').length;

  const toggleFile = (id: string) => {
    setFiles((previous) =>
      previous.map((file) => (
        file.id === id && file.kind === 'file' ? { ...file, selected: !file.selected } : file
      )),
    );
  };

  return (
    <ScreenLayout activeTab="scan">
      <View style={styles.header}>
        <SectionHeader
          title={isDemo ? 'Demo results' : 'Files found'}
          subtitle={isDemo
            ? 'Sample entries only · not found on your device'
            : scan?.rootName ? `Read-only scan of ${scan.rootName}` : 'No folder scan results available'}
        />
        <View style={styles.demoTag}><Text style={styles.demoTagText}>{isDemo ? 'DEMO' : 'READ-ONLY'}</Text></View>
      </View>

      {isDemo || scan ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{accessibleFileCount}</Text>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>Files found</Text>
              <Text style={styles.summarySubtitle}>
                {isDemo
                  ? 'Sample data only'
                  : `${scan?.directoryCount ?? 0} folders · ${formatBytes(scan?.totalReadableBytes ?? 0)} readable file data`}
              </Text>
            </View>
          </View>

          {scan?.status === 'partial' || scan?.status === 'failed' || scan?.status === 'cancelled' ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusTitle}>
                {scan.status === 'partial'
                  ? 'Some entries could not be read'
                  : scan.status === 'cancelled'
                    ? 'Scan cancelled'
                    : 'Scan failed'}
              </Text>
              <Text style={styles.statusCopy}>
                {scan.issueCount > 0
                  ? `${scan.issueCount} issue${scan.issueCount === 1 ? '' : 's'} reported. ${scan.issues.map((issue) => `${issue.path ? `${issue.path}: ` : ''}${issue.message}`).join(' ')}`
                  : scan.status === 'cancelled'
                    ? 'The folder was not fully scanned. Results shown are partial.'
                    : 'No files were scanned. Choose a folder and try again.'}
              </Text>
              {scan.issueCount > scan.issues.length
                ? <Text style={styles.statusCopy}>{scan.issueCount - scan.issues.length} additional issues were not displayed.</Text>
                : null}
            </View>
          ) : null}

          <View style={styles.categoryHeader}>
            <SectionHeader
              title="Discovered items"
              subtitle="Files are shown as found; no item is classified as junk or safe to delete."
            />
          </View>
          {files.length > 0 ? (
            <View style={styles.fileList}>
              {files.map((file) => (
                <FileListItem key={file.id} item={file} onToggle={toggleFile} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{isDemo ? 'No demo files' : 'No files found'}</Text>
              <Text style={styles.emptyCopy}>
                {isDemo
                  ? 'No sample entries are available.'
                  : scan?.status === 'failed'
                    ? 'The selected folder could not be scanned. Review the error above or choose another folder.'
                    : 'The authorized folder contains no accessible files.'}
              </Text>
            </View>
          )}

          <View style={styles.selectionBar}>
            <View>
              <Text style={styles.selectedLabel}>{selectedFiles.length} files selected</Text>
              <Text style={styles.selectedSize}>{formatBytes(selectedBytes)} selected · read-only</Text>
            </View>
            <Text style={styles.selectionHint}>No files are changed</Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No scan results</Text>
          <Text style={styles.emptyCopy}>Choose an Android folder to see its accessible files.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/scan')} style={styles.returnButton}>
            <Text style={styles.returnButtonText}>Choose a folder</Text>
          </Pressable>
        </View>
      )}
    </ScreenLayout>
  );
}

function toDemoEntry(file: (typeof mockFiles)[number]): ScannedEntry {
  return {
    id: file.id,
    name: file.name,
    uri: file.uri,
    path: file.uri,
    sizeBytes: file.sizeBytes,
    modifiedTime: null,
    kind: 'file',
    mimeType: file.type,
    selected: file.selected,
  };
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  demoTag: { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  demoTagText: { color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: spacing.lg, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  summaryNumber: { color: colors.cyan, fontSize: 35, fontWeight: '800' },
  summaryText: { flex: 1, gap: 4 },
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  summarySubtitle: { color: colors.secondary, fontSize: 11, lineHeight: 16 },
  categoryHeader: { marginTop: spacing.xl, marginBottom: spacing.md },
  fileList: { gap: 10 },
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.lg, paddingHorizontal: 2 },
  selectedLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  selectedSize: { color: colors.cyan, fontSize: 12, marginTop: 3 },
  selectionHint: { color: colors.muted, fontSize: 10 },
  statusBanner: { padding: spacing.md, marginTop: spacing.md, borderRadius: 17, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  statusTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  statusCopy: { color: colors.secondary, fontSize: 11, lineHeight: 17, marginTop: 5 },
  emptyState: { alignItems: 'center', padding: spacing.lg, marginTop: spacing.md, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { color: colors.secondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: spacing.sm },
  returnButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.cyan, borderRadius: 14, marginTop: spacing.md },
  returnButtonText: { color: colors.background, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
