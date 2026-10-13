import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PrimaryButton } from '@/components/primary-button';
import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';

type SmartScanCardProps = {
  onAutoScan: () => void;
  onFolderScan: () => void;
  disabled?: boolean;
  phase?: 'idle' | 'auto_scanning' | 'folder_selecting' | 'folder_scanning';
};

export function SmartScanCard({
  onAutoScan,
  onFolderScan,
  disabled = false,
  phase = 'idle',
}: SmartScanCardProps) {
  const { colors } = useTheme();
  const isBusy = phase !== 'idle';
  const autoScanLabel =
    phase === 'auto_scanning' ? 'SCANNING APP CACHE…' : 'Start Auto Scan';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <View style={styles.topRow}>
        <View style={[styles.shieldWrap, { backgroundColor: colors.tintBlue, borderColor: colors.border }]}>
          <SymbolView
            name={{ android: 'auto_awesome', ios: 'sparkles', web: 'auto_awesome' }}
            tintColor={colors.primary}
            size={24}
          />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.heading }]}>Smart Scan</Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Automatic App-Owned Cache & Temporary Files
          </Text>
        </View>
      </View>

      <Text style={[styles.noticeText, { backgroundColor: colors.surfaceAlt, color: colors.secondary }]}>
        {"Instantly inspects ScannerApp's own temporary cache files without requiring a folder picker prompt."}
      </Text>

      {/* Primary 1-tap Auto Scan */}
      <PrimaryButton
        label={autoScanLabel}
        accessibilityLabel="Start automatic scan of ScannerApp cache"
        disabled={disabled || isBusy}
        onPress={onAutoScan}
        icon={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }}
      />

      {/* Secondary Manual Folder Scan Option */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose an external folder to scan"
        disabled={disabled || isBusy}
        onPress={onFolderScan}
        style={({ pressed }) => [
          styles.folderScanLink,
          { backgroundColor: colors.surfaceAlt },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ android: 'folder_open', ios: 'folder', web: 'folder_open' }}
          tintColor={colors.primary}
          size={16}
        />
        <Text style={[styles.folderScanLinkText, { color: colors.primary }]}>
          {phase === 'folder_selecting'
            ? 'Opening Folder Picker…'
            : phase === 'folder_scanning'
              ? 'Scanning Selected Folder…'
              : 'Choose a folder to scan (SAF)'}
        </Text>
      </Pressable>

      <View style={styles.safetyRow}>
        <SymbolView
          name={{ android: 'verified_user', ios: 'checkmark.shield', web: 'verified_user' }}
          tintColor={colors.green}
          size={14}
        />
        <Text style={[styles.safetyText, { color: colors.secondary }]}>
          No files are deleted automatically.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: spacing.sm,
  },
  shieldWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    marginVertical: spacing.md,
    padding: 12,
    borderRadius: 12,
  },
  folderScanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  folderScanLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  safetyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.72,
  },
});
