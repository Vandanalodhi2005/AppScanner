import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { colors } from '@/constants/ui';

export type TabKey = 'home' | 'scan' | 'history' | 'settings';

const tabs: { key: TabKey; label: string; route: '/' | '/scan' | '/history' | '/settings'; icon: SymbolViewProps['name'] }[] = [
  { key: 'home', label: 'Home', route: '/', icon: { android: 'home', ios: 'house.fill', web: 'home' } },
  { key: 'scan', label: 'Scan', route: '/scan', icon: { android: 'manage_search', ios: 'viewfinder', web: 'manage_search' } },
  { key: 'history', label: 'History', route: '/history', icon: { android: 'history', ios: 'clock.arrow.circlepath', web: 'history' } },
  { key: 'settings', label: 'Settings', route: '/settings', icon: { android: 'settings', ios: 'gearshape.fill', web: 'settings' } },
];

type BottomNavigationProps = {
  activeTab: TabKey;
};

export function BottomNavigation({ activeTab }: BottomNavigationProps) {
  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label}${active ? ', selected' : ''}`}
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(tab.route)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <SymbolView
              name={tab.icon}
              tintColor={active ? colors.cyan : colors.muted}
              size={21}
            />
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', minHeight: 68, paddingHorizontal: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tab: { minWidth: 64, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10, borderRadius: 14 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  activeLabel: { color: colors.cyan },
  pressed: { opacity: 0.65 },
});
