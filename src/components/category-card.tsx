import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';
import type { ScanCategory } from '@/types/storage';

export type CategoryCardProps =
  | {
      category: ScanCategory;
      onPress?: () => void;
      title?: never;
      description?: never;
      icon?: never;
      accent?: never;
      tintBg?: never;
      statusLabel?: never;
      badgeLabel?: never;
    }
  | {
      title: string;
      description: string;
      icon: SymbolViewProps['name'];
      accent: string;
      tintBg: string;
      statusLabel?: string;
      badgeLabel?: string;
      onPress?: () => void;
      category?: never;
    };

export function CategoryCard(props: CategoryCardProps) {
  const { colors } = useTheme();

  const title = props.category ? props.category.title : props.title;
  const description = props.category ? props.category.description : props.description;
  const icon = props.category ? props.category.icon : props.icon;
  const accent = props.category ? props.category.accent : props.accent;
  const tintBg = props.category ? `${props.category.accent}18` : props.tintBg;
  const statusLabel = props.category ? `${props.category.countLabel} · sample` : props.statusLabel;
  const badgeLabel = props.category ? props.category.sizeLabel : props.badgeLabel;
  const onPress = props.onPress ?? (() => router.navigate('/scan'));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}. ${statusLabel ? `Status: ${statusLabel}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: tintBg }]}>
          <SymbolView
            name={icon}
            tintColor={accent}
            size={20}
          />
        </View>
        {badgeLabel ? (
          <View style={[styles.badge, { backgroundColor: `${accent}18` }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{badgeLabel}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.title, { color: colors.heading }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.secondary }]}>{description}</Text>

      {statusLabel ? (
        <View style={[styles.footer, { borderTopColor: colors.surfaceAlt }]}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <Text style={[styles.statusLabel, { color: colors.heading }]}>{statusLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 140,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 156,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
    minHeight: 32,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
