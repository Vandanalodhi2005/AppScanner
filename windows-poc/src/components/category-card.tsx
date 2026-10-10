import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { colors, spacing } from '@/constants/ui';
import type { ScanCategory } from '@/types/storage';

type CategoryCardProps = {
  category: ScanCategory;
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.title}, sample size ${category.sizeLabel}. Open scan preview.`}
      onPress={() => router.navigate('/scan')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: `${category.accent}18` }]}>
          <SymbolView
            name={category.icon}
            tintColor={category.accent}
            size={19}
          />
        </View>
        <Text style={styles.size}>{category.sizeLabel}</Text>
      </View>
      <Text style={styles.title}>{category.title}</Text>
      <Text style={styles.description}>{category.description}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${category.progress}%`, backgroundColor: category.accent }]} />
      </View>
      <Text style={styles.count}>{category.countLabel} · sample</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1, minWidth: 145, padding: spacing.md, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 164 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  iconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  size: { color: colors.text, fontSize: 13, fontWeight: '700' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  description: { color: colors.secondary, fontSize: 11, lineHeight: 16, marginTop: 4, minHeight: 30 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginTop: 11 },
  progressFill: { height: '100%', borderRadius: 4 },
  count: { color: colors.muted, fontSize: 10, marginTop: 8 },
  pressed: { opacity: 0.75 },
});
