import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import type { ScannedEntry } from '@/types/storage';

type FileListItemProps = {
  item: ScannedEntry;
  onToggle: (id: string) => void;
};

export function FileListItem({ item, onToggle }: FileListItemProps) {
  const { colors } = useTheme();
  const isFile = item.kind === 'file';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.name}, ${isFile ? 'file' : 'folder'}, ${formatBytes(item.sizeBytes)}`}
      accessibilityState={{ checked: item.selected, disabled: !isFile }}
      disabled={!isFile}
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.checkbox,
          { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
          item.selected && { borderColor: colors.primary, backgroundColor: colors.primary },
          !isFile && styles.checkboxDisabled,
        ]}>
        {item.selected ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <View style={styles.fileInfo}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.heading }]}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={[styles.path, { color: colors.secondary }]}>
          {item.path}
        </Text>
        <Text numberOfLines={1} style={[styles.type, { color: colors.muted }]}>
          {isFile ? item.mimeType ?? 'File' : 'Folder'}
          {item.modifiedTime === null ? '' : ` · ${new Date(item.modifiedTime).toLocaleString()}`}
        </Text>
      </View>
      <Text style={[styles.size, { color: colors.heading }]}>{formatBytes(item.sizeBytes)}</Text>
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
  row: {
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
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDisabled: {
    opacity: 0.35,
  },
  check: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
  },
  path: {
    fontSize: 11,
  },
  type: {
    fontSize: 10,
  },
  size: {
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
