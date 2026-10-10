import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { CategoryCard } from '@/components/category-card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { StorageCard } from '@/components/storage-card';
import { mockCategories } from '@/constants/mock-data';
import { colors, spacing } from '@/constants/ui';

export default function HomeScreen() {
  return (
    <ScreenLayout activeTab="home">
      <View style={styles.header}>
        <View>
          <View style={styles.brandLine}>
            <View style={styles.brandMark}>
              <SymbolView
                name={{ android: 'auto_awesome', ios: 'sparkles', web: 'auto_awesome' }}
                tintColor={colors.cyan}
                size={19}
              />
            </View>
            <View>
              <SectionHeader title="MyApp" subtitle="Keep your device clean" />
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => router.navigate('/settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
          <SymbolView
            name={{ android: 'settings', ios: 'gearshape.fill', web: 'settings' }}
            tintColor={colors.text}
            size={21}
          />
        </Pressable>
      </View>

      <View style={styles.mockNotice}>
        <View style={styles.noticeDot} />
        <SectionHeader title="Preview mode" subtitle="Storage values below are sample data" compact />
      </View>

      <StorageCard />

      <PrimaryButton
        label="CHOOSE FOLDER TO SCAN"
        accessibilityLabel="Choose a folder to scan"
        onPress={() => router.navigate('/scan')}
        icon={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }}
      />

      <View style={styles.categoryHeading}>
        <SectionHeader title="Review categories" subtitle="Choose what you want to inspect" />
      </View>
      <View style={styles.categoryGrid}>
        {mockCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </View>
      <View style={styles.disclaimer}>
        <SectionHeader
          title="Nothing is changed during a scan"
          subtitle="Dashboard cards show sample data. Folder scanning only lists files you authorize and never deletes them."
          compact
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandMark: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  settingsButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  mockNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.md, borderRadius: 16, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  noticeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.cyan },
  categoryHeading: { marginTop: spacing.xl, marginBottom: spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  disclaimer: { marginTop: spacing.xl, padding: spacing.md, borderRadius: 16, backgroundColor: colors.surface },
  pressed: { opacity: 0.72 },
});
