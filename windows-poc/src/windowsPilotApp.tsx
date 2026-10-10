import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/ui';

const tabs = ['Home', 'Scan', 'History', 'Settings'] as const;
type Tab = (typeof tabs)[number];

export default function WindowsPilotApp() {
  const [activeTab, setActiveTab] = useState<Tab>('Home');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ScannerApp</Text>
        <Text style={styles.subtitle}>{activeTab} - Windows desktop pilot</Text>
        <Text style={styles.message}>
          Existing screen styles and navigation are reusable. Windows folder
          selection and read-only scanning are not implemented yet.
        </Text>
      </View>
      <View style={styles.navigation}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === tab }}
            onPress={() => setActiveTab(tab)}
            style={styles.navigationButton}>
            <Text
              style={[
                styles.navigationLabel,
                activeTab === tab && styles.activeNavigationLabel,
              ]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 64,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  navigationButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    paddingHorizontal: 12,
  },
  navigationLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeNavigationLabel: {
    color: colors.cyan,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.cyan,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  message: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 20,
    maxWidth: 520,
    textAlign: 'center',
  },
});
