import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { colors } from '@/constants/ui';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  icon?: SymbolViewProps['name'];
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  icon,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
      {icon ? (
        <View style={styles.icon}>
          <SymbolView name={icon} size={18} tintColor={colors.background} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 56, width: '100%', borderRadius: 18, paddingHorizontal: 20, backgroundColor: colors.cyan, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { color: colors.background, fontSize: 15, letterSpacing: 1, fontWeight: '800' },
  icon: { position: 'absolute', right: 20 },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
