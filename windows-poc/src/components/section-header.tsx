import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/ui';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  compact?: boolean;
};

export function SectionHeader({ title, subtitle, compact = false }: SectionHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexShrink: 1, gap: 3 },
  title: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  compactTitle: { fontSize: 14, lineHeight: 19 },
  subtitle: { color: colors.secondary, fontSize: 13, lineHeight: 19 },
});
