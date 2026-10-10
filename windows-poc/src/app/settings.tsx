import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { colors, spacing } from '@/constants/ui';

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [includeDownloads, setIncludeDownloads] = useState(true);
  const [infoModal, setInfoModal] = useState<'about' | 'privacy' | null>(null);

  return (
    <ScreenLayout activeTab="settings">
      <View style={styles.header}>
        <SectionHeader title="Settings" subtitle="Make MyApp yours" />
        <View style={styles.previewBadge}><Text style={styles.previewText}>PREVIEW</Text></View>
      </View>

      <SectionHeader title="Preferences" />
      <View style={styles.card}>
        <ToggleRow
          title="Notifications"
          subtitle="Local preview toggle · not connected"
          value={notifications}
          onValueChange={setNotifications}
        />
        <View style={styles.divider} />
        <ToggleRow
          title="Auto scan"
          subtitle="Demo preference only · no scan runs"
          value={autoScan}
          onValueChange={setAutoScan}
        />
        <View style={styles.divider} />
        <ToggleRow
          title="Include Downloads"
          subtitle="Downloads are always review-only"
          value={includeDownloads}
          onValueChange={setIncludeDownloads}
        />
      </View>

      <SectionHeader title="Scan preferences" />
      <View style={[styles.card, styles.scanPreferences]}>
        <View style={styles.preferenceIcon}>
          <SymbolView name={{ android: 'document_search', ios: 'doc.text.magnifyingglass', web: 'document_search' }} tintColor={colors.blue} size={19} />
        </View>
        <View style={styles.preferenceCopy}>
          <Text style={styles.rowTitle}>Large file threshold</Text>
          <Text style={styles.rowSubtitle}>100 MB · sample setting</Text>
        </View>
        <Text style={styles.value}>100 MB</Text>
      </View>

      <SectionHeader title="Appearance" />
      <View style={[styles.card, styles.scanPreferences]}>
        <View style={styles.preferenceIcon}>
          <SymbolView name={{ android: 'dark_mode', ios: 'moon.fill', web: 'dark_mode' }} tintColor={colors.purple} size={19} />
        </View>
        <View style={styles.preferenceCopy}>
          <Text style={styles.rowTitle}>Theme</Text>
          <Text style={styles.rowSubtitle}>Dark navy · fixed for this preview</Text>
        </View>
        <Text style={styles.value}>Dark</Text>
      </View>

      <SectionHeader title="About & privacy" />
      <View style={styles.card}>
        <InfoRow title="About MyApp" onPress={() => setInfoModal('about')} />
        <View style={styles.divider} />
        <InfoRow title="Privacy information" onPress={() => setInfoModal('privacy')} />
        <View style={styles.divider} />
        <View style={styles.versionRow}>
          <Text style={styles.rowTitle}>Version</Text>
          <Text style={styles.rowSubtitle}>1.0.0 · UI preview</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        Settings are held in memory for this session only. No notifications, scheduled scans, or device file access are enabled.
      </Text>

      <Modal visible={infoModal !== null} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{infoModal === 'about' ? 'About MyApp' : 'Privacy information'}</Text>
            <Text style={styles.modalCopy}>
              {infoModal === 'about'
                ? 'MyApp is a storage-cleaner UI preview. Scan results shown in this version are examples and do not come from your device.'
                : 'This preview does not scan, upload, or delete device files. Selected sample files and settings exist only in the current app session.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setInfoModal(null)} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

function ToggleRow({ title, subtitle, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: '#20646C' }}
        thumbColor={value ? colors.cyan : '#AAB6C0'}
      />
    </View>
  );
}

function InfoRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]}>
      <Text style={styles.rowTitle}>{title}</Text>
      <SymbolView name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} tintColor={colors.muted} size={15} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  previewBadge: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  previewText: { color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  card: { paddingHorizontal: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, marginTop: spacing.md, marginBottom: spacing.xl },
  toggleRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 8 },
  preferenceCopy: { flex: 1, gap: 4 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rowSubtitle: { color: colors.secondary, fontSize: 10, lineHeight: 15 },
  divider: { height: 1, backgroundColor: colors.border },
  scanPreferences: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12 },
  preferenceIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surfaceAlt },
  value: { color: colors.cyan, fontSize: 12, fontWeight: '700' },
  infoRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  versionRow: { minHeight: 57, justifyContent: 'center', gap: 3 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginBottom: spacing.lg },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.72)' },
  modal: { padding: 22, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  modalCopy: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginTop: 12 },
  closeButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: colors.cyan, marginTop: 20 },
  closeText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
