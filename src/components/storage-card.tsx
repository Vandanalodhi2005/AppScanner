import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/ui';
import { mockStorage } from '@/constants/mock-data';

const SEGMENT_COUNT = 8;
const FILLED_SEGMENTS = 6;

export function StorageCard() {
  const usedPercent = Math.round((mockStorage.usedGb / mockStorage.totalGb) * 100);

  return (
    <View
      accessible
      accessibilityLabel={`Sample storage overview. ${mockStorage.availableGb} gigabytes available of ${mockStorage.totalGb} gigabytes total. ${usedPercent} percent used.`}
      style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>DEVICE STORAGE · SAMPLE</Text>
          <Text style={styles.available}>{mockStorage.availableGb} GB</Text>
          <Text style={styles.availableLabel}>available</Text>
        </View>
        <View style={styles.ring}>
          {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  transform: [{ rotate: `${index * (360 / SEGMENT_COUNT)}deg` }, { translateY: -45 }],
                  backgroundColor: index < FILLED_SEGMENTS ? colors.cyan : colors.border,
                },
              ]}
            />
          ))}
          <View style={styles.ringCenter}>
            <Text style={styles.percent}>{usedPercent}%</Text>
            <Text style={styles.usedLabel}>used</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.keyDot, { backgroundColor: colors.cyan }]} />
          <View>
            <Text style={styles.summaryValue}>{mockStorage.usedGb} GB</Text>
            <Text style={styles.summaryLabel}>Used</Text>
          </View>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.keyDot, { backgroundColor: colors.border }]} />
          <View>
            <Text style={styles.summaryValue}>{mockStorage.totalGb} GB</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
        <Text style={styles.sampleTag}>MOCK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 120 },
  copy: { flex: 1, paddingRight: spacing.sm },
  eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  available: { color: colors.text, fontSize: 38, lineHeight: 46, fontWeight: '800', marginTop: 8 },
  availableLabel: { color: colors.secondary, fontSize: 14 },
  ring: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  segment: { position: 'absolute', width: 7, height: 16, borderRadius: 4, top: 48, left: 52 },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  percent: { color: colors.text, fontSize: 21, fontWeight: '800' },
  usedLabel: { color: colors.secondary, fontSize: 11 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  keyDot: { width: 9, height: 9, borderRadius: 5 },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  summaryLabel: { color: colors.secondary, fontSize: 11, marginTop: 2 },
  sampleTag: { marginLeft: 'auto', color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
});
