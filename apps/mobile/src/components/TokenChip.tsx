import { Pressable, StyleSheet, Text } from "react-native";
import type { Token } from "../lib/api";
import { colors, radius } from "../theme/theme";

export function TokenChip({
  token,
  onPress
}: {
  token: Token;
  onPress: () => void;
}) {
  const disabled = !token.is_learnable || token.token_type === "punctuation";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        token.status === "known" && styles.known,
        token.status === "unknown" && styles.unknown,
        token.status === "review" && styles.review,
        token.status === "ignored" && styles.ignored,
        disabled && styles.disabled,
        pressed && !disabled ? styles.pressed : null
      ]}
    >
      <Text style={styles.text}>{token.text}</Text>
      {token.pinyin ? <Text style={styles.pinyin}>{token.pinyin}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 54,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2
  },
  known: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.blueSoft
  },
  unknown: {
    backgroundColor: colors.unknownSoft,
    borderColor: colors.unknownSoft
  },
  review: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft
  },
  ignored: {
    backgroundColor: colors.surfaceMuted
  },
  disabled: {
    opacity: 0.44
  },
  pressed: {
    transform: [{ translateY: 1 }]
  },
  text: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18
  },
  pinyin: {
    color: colors.textMuted,
    fontSize: 11
  }
});
