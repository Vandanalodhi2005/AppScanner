import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { colors, spacing } from '@/constants/ui';
import { mockHistory } from '@/constants/mock-data';

export default function HistoryScreen() {
  return (
    <ScreenLayout activeTab="history">
      <View style={styles.header}>
        <SectionHeader title="History" subtitle="Your previous cleanups" />
        <View style={styles.mockBadge}><Text style={styles.mockText}>SAMPLE</Text></View>
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoTitle}>Example history only</Text>
        <Text style={styles.infoCopy}>No cleanups have been recorded by this preview app.</Text>
      </View>

      <SectionHeader title="Recent activity" />
      <View style={styles.list}>
        {mockHistory.map((entry) => (
          <View key={entry.id} style={styles.item}>
            <View style={styles.iconBox}>
              <SymbolView
                name={{ android: 'check', ios: 'checkmark', web: 'check' }}
                tintColor={colors.green}
                size={19}
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.date}>{entry.dateLabel}</Text>
              <Text style={styles.count}>{entry.filesCleaned} files · sample entry</Text>
            </View>
            <Text style={styles.recovered}>{entry.recoveredLabel}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>History stays private</Text>
        <Text style={styles.footerCopy}>When real cleaning is implemented, history can be stored on this device.</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  mockBadge: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  mockText: { color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  infoBanner: { padding: spacing.md, borderRadius: 17, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  infoCopy: { color: colors.secondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  list: { gap: 11, marginTop: spacing.md },
  item: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#15352F' },
  itemInfo: { flex: 1, gap: 5 },
  date: { color: colors.text, fontSize: 13, fontWeight: '700' },
  count: { color: colors.secondary, fontSize: 11 },
  recovered: { color: colors.green, fontSize: 13, fontWeight: '800' },
  footerCard: { padding: spacing.md, borderRadius: 17, backgroundColor: colors.surface, marginTop: spacing.xl },
  footerTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  footerCopy: { color: colors.secondary, fontSize: 11, lineHeight: 17, marginTop: 5 },
});
