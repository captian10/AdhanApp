// components/ThemedText.tsx
import React, { useMemo } from "react";
import {
  Text,
  type TextProps,
  type TextStyle,
  type StyleProp,
  Platform,
  StyleSheet,
} from "react-native";
import { useTheme } from "../utils/ThemeContext";

type Weight = "regular" | "bold";

type Props = TextProps & {
  style?: StyleProp<TextStyle>;
  weight?: Weight; // ✅ new
};

function isBoldWeight(w?: TextStyle["fontWeight"]) {
  if (!w) return false;
  const s = String(w);
  if (s === "bold") return true;
  const n = Number(s);
  return !Number.isNaN(n) && n >= 600;
}

export default function ThemedText({ style, weight, ...props }: Props) {
  const { colors, fontSize, fontFamilyRegular, fontFamilyBold } = useTheme();

  const flat = useMemo(() => StyleSheet.flatten(style) as TextStyle | undefined, [style]);

  const wantsBold = useMemo(() => {
    if (weight) return weight === "bold";
    return isBoldWeight(flat?.fontWeight);
  }, [weight, flat?.fontWeight]);

  const pickedFamily = useMemo(() => {
    if (!fontFamilyRegular && !fontFamilyBold) return undefined; // System font mode
    return wantsBold ? fontFamilyBold ?? fontFamilyRegular : fontFamilyRegular ?? fontFamilyBold;
  }, [wantsBold, fontFamilyRegular, fontFamilyBold]);

  const base = useMemo<TextStyle>(() => {
    const lineHeight = Math.round(fontSize * 1.35);
    return {
      color: colors.text,
      fontSize,
      lineHeight,
      writingDirection: "rtl",
      textAlign: "left",
      ...(Platform.OS === "android" ? ({ includeFontPadding: false } as any) : null),
    };
  }, [colors.text, fontSize]);

  /**
   * ✅ KEY PART:
   * If we are using a custom font family, force fontWeight to "normal"
   * so RN DOES NOT fallback to system font.
   */
  const force = useMemo<TextStyle>(() => {
    if (!pickedFamily) return {};
    return {
      fontFamily: pickedFamily,
      fontWeight: "normal", // ✅ critical
    };
  }, [pickedFamily]);

  return <Text {...props} style={[base, style, force]} />;
}
