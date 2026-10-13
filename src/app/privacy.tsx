import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ScreenLayout } from '@/components/screen-layout';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <ScreenLayout activeTab="settings">
      {/* Top Bar with Back Button */}
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
        <SectionHeader
          title="Privacy & Security"
          subtitle="How your storage and file data are handled"
        />
      </View>

      {/* 1. File Access */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
            <SymbolView
              name={{ android: 'folder_shared', ios: 'folder.badge.gearshape', web: 'folder_shared' }}
              tintColor={colors.primary}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>1. File Access</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          File system access is strictly limited to:
        </Text>
        <View style={styles.bulletList}>
          <PrivacyBullet text="ScannerApp's own internal cache and temporary files." />
          <PrivacyBullet text="Specific folders explicitly chosen and authorized by you via the Android Storage Access Framework (SAF) system picker." />
        </View>
      </View>

      {/* 2. Scanning */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintCyan }]}>
            <SymbolView
              name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
              tintColor={colors.cyan}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>2. What Scanning Reads</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          During a scan, the application reads only file system metadata necessary to display storage metrics:
        </Text>
        <View style={styles.bulletList}>
          <PrivacyBullet text="Filename and extension" />
          <PrivacyBullet text="Relative folder path" />
          <PrivacyBullet text="File size in bytes" />
          <PrivacyBullet text="Last modified timestamp and reported MIME type" />
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary, marginTop: 8 }]}>
          File contents are not indexed, parsed for personal content, or transferred.
        </Text>
      </View>

      {/* 3. File Deletion */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintOrange }]}>
            <SymbolView
              name={{ android: 'delete_sweep', ios: 'trash', web: 'delete_sweep' }}
              tintColor={colors.orange}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>3. File Deletion Policy</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          Scanning itself never deletes, moves, or modifies files. Deletion is implemented strictly as a two-step, user-initiated action:
        </Text>
        <View style={styles.bulletList}>
          <PrivacyBullet text="You manually review discovered candidates and choose which items to clean." />
          <PrivacyBullet text="A confirmation dialog requires explicit approval before any file is removed." />
          <PrivacyBullet text="Only eligible files in verified locations are removed; system root folders are never deleted." />
        </View>
      </View>

      {/* 4. Personal Data */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintGreen }]}>
            <SymbolView
              name={{ android: 'lock', ios: 'lock.fill', web: 'lock' }}
              tintColor={colors.green}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>4. Personal Data & Telemetry</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          ScannerApp does not collect personal data. Specifically:
        </Text>
        <View style={styles.bulletList}>
          <PrivacyBullet text="No analytics, tracking SDKs, or crash-reporting telemetry are integrated." />
          <PrivacyBullet text="No user accounts, logins, or identities are created or stored." />
          <PrivacyBullet text="File metadata and scan results exist purely in local memory during your active session." />
          <PrivacyBullet text="No files or file lists are uploaded to remote servers or external third parties." />
        </View>
      </View>

      {/* 5. Permissions */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintPurple }]}>
            <SymbolView
              name={{ android: 'verified_user', ios: 'checkmark.shield.fill', web: 'verified_user' }}
              tintColor={colors.purple}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>5. Android Permissions</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          The application requests storage access exclusively on-demand through Android&apos;s system folder picker.
        </Text>
        <Text style={[styles.bodyText, { color: colors.secondary, marginTop: 8 }]}>
          How to revoke: You can inspect and revoke folder authorizations or app permissions at any time via Android Settings → Apps → ScannerApp → Permissions.
        </Text>
      </View>

      {/* 6. Security Limitations */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintDanger }]}>
            <SymbolView
              name={{ android: 'security', ios: 'shield.fill', web: 'security' }}
              tintColor={colors.danger}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>6. Security Limitations</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          In accordance with Android Scoped Storage security architecture, ScannerApp cannot and does not bypass platform sandboxing:
        </Text>
        <View style={styles.bulletList}>
          <PrivacyBullet text="Access to other applications' private directories (/data/data) is strictly blocked by the Android OS." />
          <PrivacyBullet text="Protected system operating files are inaccessible." />
          <PrivacyBullet text="The app never requests root or device administrator privileges." />
        </View>
      </View>

      {/* 7. Contact / Privacy Policy */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
            <SymbolView
              name={{ android: 'contact_support', ios: 'questionmark.circle.fill', web: 'contact_support' }}
              tintColor={colors.primary}
              size={18}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>7. Policy Notice</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.secondary }]}>
          ScannerApp is an on-device utility in active development. This privacy summary reflects the actual code and permission model of the installed release. No external web privacy policy URL is currently published.
        </Text>
      </View>

      <View style={{ height: spacing.xl }} />
    </ScreenLayout>
  );
}

function PrivacyBullet({ text }: { text: string }) {
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
  pressed: {
    opacity: 0.72,
  },
});
