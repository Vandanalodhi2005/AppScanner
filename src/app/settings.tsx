import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Constants from 'expo-constants';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export default function SettingsScreen() {
  const { theme, setTheme, colors } = useTheme();

  const [notifications, setNotifications] = useState(false);
  const [includeDownloads, setIncludeDownloads] = useState(true);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScreenLayout activeTab="settings">
      {/* Header */}
      <View style={styles.header}>
        <SectionHeader title="Settings" subtitle="ScannerApp configuration & privacy" />
        <View style={[styles.badge, { backgroundColor: colors.tintBlue, borderColor: colors.border }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>PREVIEW</Text>
        </View>
      </View>

      {/* Preferences Section */}
      <SectionHeader title="Scan Preferences" compact />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          title="Notifications"
          subtitle="Session placeholder · not connected"
          value={notifications}
          onValueChange={setNotifications}
        />
        <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />
        <ToggleRow
          title="Include Downloads"
          subtitle="Downloads are always review-only"
          value={includeDownloads}
          onValueChange={setIncludeDownloads}
        />
        <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />
        <View style={styles.infoRowStatic}>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.rowTitle, { color: colors.heading }]}>Large File Threshold</Text>
            <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>
              Files larger than 10 MB are grouped as large
            </Text>
          </View>
          <Text style={[styles.thresholdValue, { color: colors.primary }]}>10 MB</Text>
        </View>
      </View>

      {/* Appearance Section with Interactive Theme Selector */}
      <SectionHeader title="Appearance" compact />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.appearanceRow}>
          <View
            style={[
              styles.preferenceIcon,
              { backgroundColor: theme === 'dark' ? colors.tintPurple : colors.tintOrange },
            ]}>
            <SymbolView
              name={{
                android: theme === 'dark' ? 'dark_mode' : 'light_mode',
                ios: theme === 'dark' ? 'moon.fill' : 'sun.max.fill',
                web: theme === 'dark' ? 'dark_mode' : 'light_mode',
              }}
              tintColor={theme === 'dark' ? colors.purple : colors.orange}
              size={20}
            />
          </View>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.rowTitle, { color: colors.heading }]}>Theme</Text>
            <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>
              {theme === 'dark' ? 'Coordinated Dark Theme' : 'Professional Light Theme'}
            </Text>
          </View>
        </View>

        {/* Segmented Theme Picker */}
        <View style={[styles.themePickerContainer, { backgroundColor: colors.surfaceAlt }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to Light Theme"
            accessibilityState={{ selected: theme === 'light' }}
            onPress={() => setTheme('light')}
            style={[
              styles.themeOption,
              theme === 'light' && [
                styles.themeOptionActive,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ],
            ]}>
            <SymbolView
              name={{ android: 'light_mode', ios: 'sun.max', web: 'light_mode' }}
              tintColor={theme === 'light' ? colors.primary : colors.secondary}
              size={16}
            />
            <Text
              style={[
                styles.themeOptionText,
                { color: theme === 'light' ? colors.primary : colors.secondary },
                theme === 'light' && styles.themeOptionTextActive,
              ]}>
              Light
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to Dark Theme"
            accessibilityState={{ selected: theme === 'dark' }}
            onPress={() => setTheme('dark')}
            style={[
              styles.themeOption,
              theme === 'dark' && [
                styles.themeOptionActive,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ],
            ]}>
            <SymbolView
              name={{ android: 'dark_mode', ios: 'moon.fill', web: 'dark_mode' }}
              tintColor={theme === 'dark' ? colors.primary : colors.secondary}
              size={16}
            />
            <Text
              style={[
                styles.themeOptionText,
                { color: theme === 'dark' ? colors.primary : colors.secondary },
                theme === 'dark' && styles.themeOptionTextActive,
              ]}>
              Dark
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Authorized Storage Section (v2) */}
      <SectionHeader title="Authorized Storage Locations" compact />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoRowStatic}>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.rowTitle, { color: colors.heading }]}>Scoped Storage Permissions</Text>
            <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>
              ScannerApp reuses SAF permissions granted by you, eliminating repeated folder pickers.
            </Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />
        <InfoRow
          title="Manage Authorized Folders"
          subtitle="View or add folders on the Dashboard"
          onPress={() => router.navigate('/')}
        />
      </View>

      {/* About & Privacy Section with Dedicated Screen Navigation */}
      <SectionHeader title="About & Safety" compact />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <InfoRow
          title="About ScannerApp"
          subtitle="Overview, features, safety & build details"
          onPress={() => router.navigate('/about')}
        />
        <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />
        <InfoRow
          title="Privacy & Security Information"
          subtitle="File access limits, zero telemetry & storage policy"
          onPress={() => router.navigate('/privacy')}
        />
        <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />
        <View style={styles.versionRow}>
          <Text style={[styles.rowTitle, { color: colors.heading }]}>Version</Text>
          <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>
            {appVersion} · Android Scanner Preview
          </Text>
        </View>
      </View>

      <Text style={[styles.disclaimer, { color: colors.secondary }]}>
        ScannerApp is a safety-focused cleaner utility. It discovers and reports storage usage without modifying, altering, or automatically deleting any files on your Android device.
      </Text>

      <View style={{ height: spacing.xl }} />
    </ScreenLayout>
  );
}

function ToggleRow({ title, subtitle, value, onValueChange }: ToggleRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.toggleRow}>
      <View style={styles.preferenceCopy}>
        <Text style={[styles.rowTitle, { color: colors.heading }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>{subtitle}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.tintBlue }}
        thumbColor={value ? colors.primary : colors.muted}
      />
    </View>
  );
}

function InfoRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]}>
      <View style={styles.preferenceCopy}>
        <Text style={[styles.rowTitle, { color: colors.heading }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <SymbolView
        name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
        tintColor={colors.secondary}
        size={16}
      />
    </Pressable>
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
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  card: {
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 18,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  toggleRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appearanceRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themePickerContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 14,
    gap: 6,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  themeOptionActive: {
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    fontWeight: '700',
  },
  infoRowStatic: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceCopy: {
    flex: 1,
    gap: 2,
  },
  preferenceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  thresholdValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  infoRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  versionRow: {
    minHeight: 56,
    justifyContent: 'center',
    gap: 2,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.72,
  },
});
