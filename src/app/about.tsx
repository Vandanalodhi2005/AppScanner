import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Constants from 'expo-constants';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';

export default function AboutScreen() {
  const { colors } = useTheme();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const appName = Constants.expoConfig?.name ?? 'ScannerApp';

  return (
    <ScreenLayout activeTab="settings">
      {/* Back button & Screen title */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ android: 'arrow_back', ios: 'chevron.left', web: 'arrow_back' }}
            tintColor={colors.heading}
            size={18}
          />
          <Text style={[styles.backText, { color: colors.heading }]}>Settings</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <SectionHeader title="About ScannerApp" subtitle="Product overview and safety specifications" />
      </View>

      {/* About Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
            <SymbolView
              name={{ android: 'info', ios: 'info.circle.fill', web: 'info' }}
              tintColor={colors.primary}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>About</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          ScannerApp helps users inspect accessible files and understand storage usage through a clear, safety-focused interface.
        </Text>
      </View>

      {/* Features Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintGreen }]}>
            <SymbolView
              name={{ android: 'checklist', ios: 'list.bullet.rectangle.fill', web: 'checklist' }}
              tintColor={colors.green}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>Features</Text>
        </View>
        <View style={styles.bulletList}>
          <FeatureBullet text="Scan accessible files and folders via the Android Storage Access Framework." />
          <FeatureBullet text="Review actual filenames, file sizes, and directory hierarchies." />
          <FeatureBullet text="Analyze supported temporary and cache files owned by ScannerApp." />
          <FeatureBullet text="Review detailed scan results before any selective cleanup operation." />
          <FeatureBullet text="View past session scan history when available." />
        </View>
      </View>

      {/* How it works Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintPurple }]}>
            <SymbolView
              name={{ android: 'settings_suggest', ios: 'gearshape.2.fill', web: 'settings_suggest' }}
              tintColor={colors.purple}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>How It Works</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          ScannerApp operates across two distinct modes based on Android storage boundaries:
        </Text>
        <View style={styles.bulletList}>
          <FeatureBullet text="App-Owned Cache: Automatically inspects ScannerApp's internal cache directory without needing permission prompts." />
          <FeatureBullet text="User-Authorized Folders: Opens the system folder picker so you choose which specific directory to inspect." />
        </View>
      </View>

      {/* Safety Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintOrange }]}>
            <SymbolView
              name={{ android: 'verified_user', ios: 'shield.checkerboard', web: 'verified_user' }}
              tintColor={colors.orange}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>Safety & Integrity</Text>
        </View>
        <View style={styles.bulletList}>
          <FeatureBullet text="Scanning does not automatically delete files." />
          <FeatureBullet text="Cleanup requires explicit user review and confirmation dialogs." />
          <FeatureBullet text="The app cannot access every Android system directory or other apps' private cache." />
          <FeatureBullet text="Actual capabilities depend on Android storage permissions and the installed implementation." />
        </View>
      </View>

      {/* App Information Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintCyan }]}>
            <SymbolView
              name={{ android: 'badge', ios: 'person.text.rectangle.fill', web: 'badge' }}
              tintColor={colors.cyan}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>App Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.secondary }]}>Name</Text>
          <Text style={[styles.infoValue, { color: colors.heading }]}>{appName}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.secondary }]}>Version</Text>
          <Text style={[styles.infoValue, { color: colors.heading }]}>{appVersion}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.secondary }]}>Platform</Text>
          <Text style={[styles.infoValue, { color: colors.heading }]}>
            {Platform.OS === 'android' ? 'Android' : Platform.OS}
          </Text>
        </View>

        {Constants.expoConfig?.sdkVersion ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.surfaceAlt }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Expo SDK</Text>
              <Text style={[styles.infoValue, { color: colors.heading }]}>
                {Constants.expoConfig.sdkVersion}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={{ height: spacing.xl }} />
    </ScreenLayout>
  );
}

function FeatureBullet({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
      <Text style={[styles.bulletText, { color: colors.secondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  bulletList: {
    gap: 8,
    marginTop: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
