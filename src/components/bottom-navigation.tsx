import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/context/theme-context';

export type TabKey = 'home' | 'scan' | 'history' | 'settings' | 'windows-cleaner';

const tabs: { key: TabKey; label: string; route: string; icon: SymbolViewProps['name'] }[] = [
  { key: 'home', label: 'Home', route: '/', icon: { android: 'home', ios: 'house.fill', web: 'home' } },
  { key: 'scan', label: 'Scan', route: '/scan', icon: { android: 'manage_search', ios: 'viewfinder', web: 'manage_search' } },
  { key: 'windows-cleaner', label: 'PC Clean', route: '/windows-cleaner', icon: { android: 'computer', ios: 'desktopcomputer', web: 'computer' } },
  { key: 'history', label: 'History', route: '/history', icon: { android: 'history', ios: 'clock.arrow.circlepath', web: 'history' } },
  { key: 'settings', label: 'Settings', route: '/settings', icon: { android: 'settings', ios: 'gearshape.fill', web: 'settings' } },
];

type BottomNavigationProps = {
  activeTab: TabKey;
};

export function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label}${active ? ', selected' : ''}`}
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(tab.route as never)}
            style={({ pressed }) => [
              styles.tab,
              active && { backgroundColor: colors.tintBlue },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={tab.icon}
              tintColor={active ? colors.primary : colors.secondary}
              size={22}
            />
            <Text
              style={[
                styles.label,
                { color: active ? colors.primary : colors.secondary },
                active && styles.activeLabel,
              ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  tab: {
    minWidth: 68,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeLabel: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
