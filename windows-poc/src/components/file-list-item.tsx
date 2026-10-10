import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/ui';
import type { ScannedEntry } from '@/types/storage';

type FileListItemProps = {
  item: ScannedEntry;
  onToggle: (id: string) => void;
};

export function FileListItem({ item, onToggle }: FileListItemProps) {
  const isFile = item.kind === 'file';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.name}, ${isFile ? 'file' : 'folder'}, ${formatBytes(item.sizeBytes)}`}
      accessibilityState={{ checked: item.selected, disabled: !isFile }}
      disabled={!isFile}
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.checkbox, item.selected && styles.checkboxSelected, !isFile && styles.checkboxDisabled]}>
        {item.selected ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <View style={styles.fileInfo}>
        <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.path}>{item.path}</Text>
        <Text numberOfLines={1} style={styles.type}>
          {isFile ? item.mimeType ?? 'File' : 'Folder'}
          {item.modifiedTime === null ? '' : ` · ${new Date(item.modifiedTime).toLocaleString()}`}
        </Text>
      </View>
      <Text style={styles.size}>{formatBytes(item.sizeBytes)}</Text>
    </Pressable>
  );
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Unavailable';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const gigabytes = bytes / (1024 * 1024 * 1024);
  return gigabytes >= 1 ? `${gigabytes.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

const styles = StyleSheet.create({
  row: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.cyan, backgroundColor: colors.cyan },
  checkboxDisabled: { opacity: 0.4 },
  check: { color: colors.background, fontSize: 14, fontWeight: '900' },
  fileInfo: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.text, fontSize: 13, fontWeight: '700' },
  path: { color: colors.secondary, fontSize: 10 },
  type: { color: colors.muted, fontSize: 10 },
  size: { color: colors.text, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.74 },
});
