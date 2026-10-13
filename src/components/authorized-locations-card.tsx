import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Directory } from 'expo-file-system';

import { useTheme } from '@/context/theme-context';
import { spacing } from '@/constants/ui';
import { addAuthorizedLocation } from '@/services/authorizedLocations';
import type { AuthorizedLocation } from '@/types/authorizedLocations';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type AuthorizedLocationsCardProps = {
  locations: AuthorizedLocation[];
  onLocationsChange: () => void;
  onScanLocation: (location: AuthorizedLocation) => void;
  onScanAll: () => void;
  disabled?: boolean;
};

export function AuthorizedLocationsCard({
  locations,
  onLocationsChange,
  onScanLocation,
  onScanAll,
  disabled = false,
}: AuthorizedLocationsCardProps) {
  const { colors } = useTheme();

  const handleAuthorizeNew = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android Platform Only',
        'Storage Access Framework authorization is supported on Android.'
      );
      return;
    }

    Alert.alert(
      'Authorize Storage Location',
      'Under Android Scoped Storage, you choose which folders ScannerApp can access (such as Documents or specific Download subfolders). ScannerApp securely saves this permission so you can scan it without picking it every time.\n\nPersonal files are kept safe and never labeled junk.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Folder',
          onPress: async () => {
            try {
              const selectedDir = await Directory.pickDirectoryAsync();
              await addAuthorizedLocation({
                name: selectedDir.name || 'Authorized Folder',
                uri: selectedDir.uri,
              });
              onLocationsChange();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              if (!msg.toLowerCase().includes('cancelled')) {
                Alert.alert('Authorization Error', msg);
              }
            }
          },
        },
      ]
    );
  };

  const getKindIcon = (kind: AuthorizedLocation['kind']) => {
    switch (kind) {
      case 'downloads':
        return { android: 'download', ios: 'arrow.down.circle', web: 'download' } as const;
      case 'documents':
        return { android: 'description', ios: 'doc', web: 'description' } as const;
      case 'media':
        return { android: 'photo_library', ios: 'photo.stack', web: 'photo_library' } as const;
      default:
        return { android: 'folder', ios: 'folder', web: 'folder' } as const;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      {/* Header Row */}
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
          <SymbolView
            name={{ android: 'lock_open', ios: 'lock.open', web: 'lock_open' }}
            tintColor={colors.primary}
            size={20}
          />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.heading }]}>
            Authorized Storage Locations
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Scoped access saved · No repeated folder selection
          </Text>
        </View>
      </View>

      {/* Locations List */}
      {locations.length > 0 ? (
        <View style={styles.locationsList}>
          {locations.map((loc) => {
            const isRevoked = loc.status === 'permission_revoked';
            return (
              <View
                key={loc.id}
                style={[
                  styles.locationItem,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}>
                <View
                  style={[
                    styles.locIconWrap,
                    { backgroundColor: isRevoked ? colors.tintDanger : colors.tintBlue },
                  ]}>
                  <SymbolView
                    name={getKindIcon(loc.kind)}
                    tintColor={isRevoked ? colors.danger : colors.primary}
                    size={16}
                  />
                </View>

                <View style={styles.locInfo}>
                  <View style={styles.locNameRow}>
                    <Text
                      style={[styles.locName, { color: colors.heading }]}
                      numberOfLines={1}>
                      {loc.name}
                    </Text>
                    {isRevoked ? (
                      <View style={[styles.statusBadge, { backgroundColor: colors.tintDanger }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.danger }]}>
                          Revoked
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: colors.tintGreen }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.green }]}>
                          Active
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.locMeta, { color: colors.secondary }]}>
                    {loc.fileCount !== undefined
                      ? `${loc.fileCount} files · ${formatBytes(loc.totalBytes)}`
                      : 'Saved SAF permission · Tap to scan'}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Scan ${loc.name}`}
                  disabled={disabled}
                  onPress={() => onScanLocation(loc)}
                  style={({ pressed }) => [
                    styles.scanSingleBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.scanSingleBtnText, { color: colors.primary }]}>
                    {isRevoked ? 'Re-grant' : 'Scan'}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          {/* Quick scan all authorized locations */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan all authorized storage locations"
            disabled={disabled}
            onPress={onScanAll}
            style={({ pressed }) => [
              styles.scanAllBtn,
              { backgroundColor: colors.primary },
              disabled && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ android: 'play_arrow', ios: 'play.fill', web: 'play_arrow' }}
              tintColor="#FFFFFF"
              size={16}
            />
            <Text style={styles.scanAllBtnText}>
              Scan All Authorized Locations ({locations.length})
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.emptyBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            No external storage folders authorized yet. You can authorize folders once (such as Downloads or Documents) to scan them anytime without reprompting.
          </Text>
        </View>
      )}

      {/* Authorize New Location Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Authorize an additional Android storage location"
        disabled={disabled}
        onPress={handleAuthorizeNew}
        style={({ pressed }) => [
          styles.addBtn,
          { borderColor: colors.primary, backgroundColor: colors.tintBlue },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ android: 'add', ios: 'plus', web: 'add' }}
          tintColor={colors.primary}
          size={16}
        />
        <Text style={[styles.addBtnText, { color: colors.primary }]}>
          Authorize Additional Folder
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
  },
  locationsList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  locIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locInfo: {
    flex: 1,
    gap: 2,
  },
  locNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locName: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  locMeta: {
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scanSingleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scanSingleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scanAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    marginTop: 4,
  },
  scanAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
