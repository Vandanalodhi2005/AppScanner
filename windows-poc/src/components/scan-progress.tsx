import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/ui';

export const scanStages = [
  'Preparing demo scan',
  'Analyzing temporary files',
  'Reviewing large files',
  'Checking possible duplicates',
  'Reviewing downloads',
];

type ScanProgressProps = {
  progress: number;
  currentStep: number;
};

export function ScanProgress({ progress, currentStep }: ScanProgressProps) {
  return (
    <View style={styles.card}>
      <View style={styles.progressHeader}>
        <Text style={styles.title}>Demo scan progress</Text>
        <Text style={styles.progressValue}>{progress}%</Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.stageList}>
        {scanStages.map((stage, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          return (
            <View key={stage} style={styles.stageRow}>
              <View style={[styles.stageDot, (active || completed) && styles.stageDotActive]}>
                {completed ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <Text style={[styles.stageText, active && styles.stageTextActive]}>{stage}</Text>
              {active ? <Text style={styles.now}>NOW</Text> : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>This animated preview does not access device storage.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  progressValue: { color: colors.cyan, fontSize: 15, fontWeight: '800' },
  track: { height: 7, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.border },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.cyan },
  stageList: { gap: 17, marginTop: spacing.lg },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  stageDot: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  stageDotActive: { borderColor: colors.cyan, backgroundColor: colors.cyan },
  check: { color: colors.background, fontSize: 12, fontWeight: '900' },
  stageText: { flex: 1, color: colors.muted, fontSize: 13 },
  stageTextActive: { color: colors.text, fontWeight: '700' },
  now: { color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.lg },
});
