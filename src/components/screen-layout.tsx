import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation, type TabKey } from '@/components/bottom-navigation';
import { useTheme } from '@/context/theme-context';

type ScreenLayoutProps = {
  activeTab: TabKey;
  children: ReactNode;
};

export function ScreenLayout({ activeTab, children }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
      <View
        style={[
          styles.navigation,
          {
            paddingBottom: Math.max(insets.bottom, 4),
            backgroundColor: colors.surface,
          },
        ]}>
        <BottomNavigation activeTab={activeTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { width: '100%', alignItems: 'center', paddingBottom: 22 },
  inner: { width: '100%', maxWidth: 600, paddingHorizontal: 20, paddingTop: 12 },
  navigation: { alignItems: 'center' },
});
