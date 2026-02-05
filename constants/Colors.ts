import { useColorScheme } from "react-native";

export type AppColors = {
  // Brand
  primary: string;
  primary2: string;
  secondary: string;

  // Basics
  black: string;
  white: string;

  // Screen / surfaces
  homeBg: string;
  sheetBg: string;
  cardBg: string;
  modalBg: string;

  // Text
  text: string;
  textOnDark: string;
  textMuted: string;
  textMuted2: string;

  // Lines / borders
  border: string;
  divider: string;
  handle: string;

  // States / accents
  link: string;
  danger: string;
  selectionBg: string;

  // Chips (hero location)
  chipBg: string;
  chipBorder: string;
  chipChevron: string;

  // Shadows
  shadow: string;

  // Gradients
  heroGradient: [string, string, string];
  primaryGradient: [string, string];

  // Tabs
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
};

const BRAND = {
  primary: "#1a2a6c",
  primary2: "#2a4a8c",
  secondary: "#FFD700",
  link: "#007AFF",
  danger: "#FF3B30",
};

export const Colors: Record<"light" | "dark", AppColors> = {
  light: {
    primary: BRAND.primary,
    primary2: BRAND.primary2,
    secondary: BRAND.secondary,

    black: "#000000",
    white: "#FFFFFF",

    homeBg: "#000000",
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
    sheetBg: "#0B0B0B",
    cardBg: "#121212",
    modalBg: "#0B0B0B",

    text: "#F5F5F5",
    textOnDark: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.70)",
    textMuted2: "rgba(255,255,255,0.55)",

    border: "rgba(255,255,255,0.12)",
    divider: "rgba(255,255,255,0.10)",
    handle: "rgba(255,255,255,0.25)",

    link: BRAND.link,
    danger: BRAND.danger,
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

export function useAppColors(): AppColors {
  const scheme = useColorScheme();
  return Colors[scheme === "dark" ? "dark" : "light"];
}
