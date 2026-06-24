import type { ReactNode } from "react";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "../theme/theme";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  variant = "primary",
  onPress,
  disabled
}: {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "soft" | "success";
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primaryButton,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        variant === "soft" && styles.softButton,
        variant === "success" && styles.successButton,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "primary" ? styles.primaryButtonText : styles.secondaryButtonText,
          variant === "danger" ? styles.dangerButtonText : null,
          variant === "soft" ? styles.softButtonText : null,
          variant === "success" ? styles.successButtonText : null
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  multiline,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
  keyboardType
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  keyboardType?: TextInputProps["keyboardType"];
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSoft}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? "top" : "center"}
      style={[styles.input, multiline ? styles.textarea : null]}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 7,
    marginBottom: 18
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: 0,
    color: colors.text,
    fontWeight: "800"
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted
  },
  card: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  button: {
    minHeight: 46,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  dangerButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft
  },
  softButton: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft
  },
  successButton: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successSoft
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800"
  },
  primaryButtonText: {
    color: "#FFFFFF"
  },
  secondaryButtonText: {
    color: colors.text
  },
  dangerButtonText: {
    color: colors.danger
  },
  softButtonText: {
    color: colors.accentDark
  },
  successButtonText: {
    color: colors.success
  },
  pressed: {
    transform: [{ translateY: 1 }]
  },
  disabled: {
    opacity: 0.55
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: "#FFFDFA",
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  textarea: {
    minHeight: 176,
    lineHeight: 24
  }
});
