// constants/Colors.ts
import { useColorScheme } from "react-native";

export type AppColors = {
  primary: string;
  primary2: string;
  secondary: string;

  black: string;
  white: string;

  homeBg: string;
  sheetBg: string;
  cardBg: string;
  modalBg: string;

  text: string;
  textOnDark: string;
  textMuted: string;
  textMuted2: string;

  border: string;
  divider: string;
  handle: string;

  link: string;
  danger: string;
  success: string;

  selectionBg: string;

  chipBg: string;
  chipBorder: string;
  chipChevron: string;

  shadow: string;

  heroGradient: [string, string, string];
  primaryGradient: [string, string];

  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
};

export const BRAND = {
  primary: "#1a2a6c",
  primary2: "#2a4a8c",
  secondary: "#FFD700",
  link: "#007AFF",
  danger: "#FF3B30",
  success: "#22C55E",
};

export const BaseColors: Record<"light" | "dark", AppColors> = {
  light: {
    primary: BRAND.primary,
    primary2: BRAND.primary2,
    secondary: BRAND.secondary,

    black: "#000000",
    white: "#FFFFFF",

    homeBg: "#F0F2F5",
    sheetBg: "#F7F9FC",
    cardBg: "#FFFFFF",
    modalBg: "#FFFFFF",

    text: "#1C1C1E",
    textOnDark: "#FFFFFF",
    textMuted: "#6B7280",
    textMuted2: "#8E8E93",

    border: "#E5E5EA",
    divider: "#EEEEEE",
    handle: "#D1D1D6",

    link: BRAND.link,
    danger: BRAND.danger,
    success: BRAND.success,

    selectionBg: "#F0F8FF",

    chipBg: "rgba(0,0,0,0.40)",
    chipBorder: "rgba(255,255,255,0.10)",
    chipChevron: "rgba(255,255,255,0.75)",

    shadow: "#000000",

    heroGradient: ["rgba(0,0,0,0.40)", "transparent", "rgba(0,0,0,0.60)"],
    primaryGradient: [BRAND.primary, BRAND.primary2],

    tabBarBg: "#FFFFFF",
    tabBarActive: BRAND.primary,
    tabBarInactive: "#8E8E93",
  },

  dark: {
    primary: BRAND.primary,
    primary2: BRAND.primary2,
    secondary: BRAND.secondary,

    black: "#000000",
    white: "#FFFFFF",

    homeBg: "#000000",
    sheetBg: "#121212",
    cardBg: "#1E1E1E",
    modalBg: "#121212",

    text: "#F5F5F5",
    textOnDark: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.70)",
    textMuted2: "rgba(255,255,255,0.55)",

    border: "rgba(255,255,255,0.12)",
    divider: "rgba(255,255,255,0.10)",
    handle: "rgba(255,255,255,0.25)",

    link: BRAND.link,
    danger: BRAND.danger,
    success: "#34D399",

    selectionBg: "rgba(26,42,108,0.18)",

    chipBg: "rgba(0,0,0,0.45)",
    chipBorder: "rgba(255,255,255,0.12)",
    chipChevron: "rgba(255,255,255,0.70)",

    shadow: "#000000",

    heroGradient: ["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.70)"],
    primaryGradient: [BRAND.primary, BRAND.primary2],

    tabBarBg: "#0B0B0B",
    tabBarActive: BRAND.secondary,
    tabBarInactive: "rgba(255,255,255,0.55)",
  },
};

// Optional: keep if you still use it in some screens.
// IMPORTANT: This hook does NOT include ThemeContext overrides.
// Use useTheme().colors for live updates.
export function useAppColors(): AppColors {
  const scheme = useColorScheme();
  return BaseColors[scheme === "dark" ? "dark" : "light"];
}
