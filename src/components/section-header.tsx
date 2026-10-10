import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  compact?: boolean;
};

export function SectionHeader({ title, subtitle, compact = false }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text
        style={[
          styles.title,
          compact && styles.compactTitle,
          { color: colors.heading },
        ]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexShrink: 1, gap: 3 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  compactTitle: { fontSize: 14, lineHeight: 19 },
  subtitle: { fontSize: 13, lineHeight: 19 },
});
