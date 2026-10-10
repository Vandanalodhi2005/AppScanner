import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';

type AppHeaderProps = {
  onSettingsPress?: () => void;
};

export function AppHeader({ onSettingsPress }: AppHeaderProps) {
  const { colors } = useTheme();

  const handleSettings = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      router.navigate('/settings');
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={[styles.logoWrap, { backgroundColor: colors.tintBlue, borderColor: colors.border }]}>
          <SymbolView
            name={{ android: 'cleaning_services', ios: 'sparkles', web: 'cleaning_services' }}
            tintColor={colors.primary}
            size={22}
          />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.appName, { color: colors.heading }]}>ScannerApp</Text>
          <Text style={[styles.appSubtitle, { color: colors.secondary }]}>Smart Device Cleaner</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        onPress={handleSettings}
        style={({ pressed }) => [
          styles.settingsBtn,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ android: 'settings', ios: 'gearshape.fill', web: 'settings' }}
          tintColor={colors.secondary}
          size={20}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleWrap: {
    gap: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
