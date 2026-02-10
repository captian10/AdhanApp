// utils/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import { BaseColors, type AppColors } from "../constants/Colors";

// Google fonts (Arabic) - load Regular + Bold
import { Cairo_400Regular, Cairo_700Bold } from "@expo-google-fonts/cairo";
import { Tajawal_400Regular, Tajawal_700Bold } from "@expo-google-fonts/tajawal";
import { Amiri_400Regular, Amiri_700Bold } from "@expo-google-fonts/amiri";
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from "@expo-google-fonts/scheherazade-new";

type ThemeMode = "light" | "dark" | "system";

export type FontType = "System" | "Cairo" | "Tajawal" | "Amiri" | "ScheherazadeNew";

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;

  primaryColor: string;
  setColor: (c: string) => void;

  fontSize: number;
  setFontSize: (s: number) => void;

  fontType: FontType;
  setFontType: (f: FontType) => void;

  scale: (n: number) => number;

  // ✅ expose both, so ThemedText can choose based on fontWeight/weight
  fontFamilyRegular?: string;
  fontFamilyBold?: string;

  colors: AppColors;
  isDark: boolean;

  // keep if you use it elsewhere
  textStyle: { fontSize: number; fontFamily?: string };

  fontsReady: boolean;
  hydrated: boolean;
};

const K_MODE = "theme_mode";
const K_COLOR = "theme_color";
const K_SIZE = "theme_size";
const K_FONT = "theme_font";

const DEFAULT_COLOR = "#059649";
const DEFAULT_SIZE = 14;

const MIN_SIZE = 10;
const MAX_SIZE = 28;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function resolveFontFamilies(type: FontType): { regular?: string; bold?: string } {
  switch (type) {
    case "Cairo":
      return { regular: "Cairo_400Regular", bold: "Cairo_700Bold" };
    case "Tajawal":
      return { regular: "Tajawal_400Regular", bold: "Tajawal_700Bold" };
    case "Amiri":
      return { regular: "Amiri_400Regular", bold: "Amiri_700Bold" };
    case "ScheherazadeNew":
      return { regular: "ScheherazadeNew_400Regular", bold: "ScheherazadeNew_700Bold" };
    default:
      return {};
  }
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "system",
  setThemeMode: () => {},

  primaryColor: DEFAULT_COLOR,
  setColor: () => {},

  fontSize: DEFAULT_SIZE,
  setFontSize: () => {},

  fontType: "System",
  setFontType: () => {},

  scale: (n) => n,

  fontFamilyRegular: undefined,
  fontFamilyBold: undefined,

  colors: BaseColors.light,
  isDark: false,

  textStyle: { fontSize: DEFAULT_SIZE, fontFamily: undefined },

  fontsReady: false,
  hydrated: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();

  const [fontsLoadedOk] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
    Tajawal_400Regular,
    Tajawal_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
  });

  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR);
  const [fontSize, setFontSizeState] = useState(DEFAULT_SIZE);
  const [fontType, setFontTypeState] = useState<FontType>("System");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedMode, savedColor, savedSize, savedFont] = await Promise.all([
          AsyncStorage.getItem(K_MODE),
          AsyncStorage.getItem(K_COLOR),
          AsyncStorage.getItem(K_SIZE),
          AsyncStorage.getItem(K_FONT),
        ]);

        if (savedMode === "light" || savedMode === "dark" || savedMode === "system") {
          setThemeModeState(savedMode);
        }
        if (typeof savedColor === "string" && savedColor.trim()) {
          setPrimaryColor(savedColor);
        }
        if (typeof savedSize === "string" && savedSize.trim()) {
          const n = Number(savedSize);
          if (!Number.isNaN(n)) setFontSizeState(clamp(n, MIN_SIZE, MAX_SIZE));
        }
        if (
          savedFont === "System" ||
          savedFont === "Cairo" ||
          savedFont === "Tajawal" ||
          savedFont === "Amiri" ||
          savedFont === "ScheherazadeNew"
        ) {
          setFontTypeState(savedFont);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setThemeMode = (m: ThemeMode) => {
    setThemeModeState(m);
    AsyncStorage.setItem(K_MODE, m).catch(() => {});
  };

  const setColor = (c: string) => {
    setPrimaryColor(c);
    AsyncStorage.setItem(K_COLOR, c).catch(() => {});
  };

  const setFontSize = (s: number) => {
    const v = clamp(s, MIN_SIZE, MAX_SIZE);
    setFontSizeState(v);
    AsyncStorage.setItem(K_SIZE, String(v)).catch(() => {});
  };

  const setFontType = (f: FontType) => {
    setFontTypeState(f);
    AsyncStorage.setItem(K_FONT, f).catch(() => {});
  };

  const activeMode: "light" | "dark" =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  const isDark = activeMode === "dark";

  const { regular: rawRegular, bold: rawBold } = useMemo(
    () => resolveFontFamilies(fontType),
    [fontType]
  );

  const fontsReady = hydrated && fontsLoadedOk;

  // ✅ only apply if fonts ready AND fontType not System AND key exists
  const fontFamilyRegular = useMemo(() => {
    if (!fontsReady) return undefined;
    if (fontType === "System") return undefined;
    return rawRegular || undefined;
  }, [fontsReady, fontType, rawRegular]);

  const fontFamilyBold = useMemo(() => {
    if (!fontsReady) return undefined;
    if (fontType === "System") return undefined;
    return rawBold || undefined;
  }, [fontsReady, fontType, rawBold]);

  const scale = useMemo(() => {
    const factor = fontSize / DEFAULT_SIZE;
    return (n: number) => Math.round(n * factor);
  }, [fontSize]);

  const colors = useMemo<AppColors>(() => {
    const base = isDark ? BaseColors.dark : BaseColors.light;
    return {
      ...base,
      primary: primaryColor,
      primary2: primaryColor,
      tabBarActive: primaryColor,
      primaryGradient: [primaryColor, base.primary2],
    };
  }, [isDark, primaryColor]);

  const textStyle = useMemo(
    () => ({ fontSize, fontFamily: fontFamilyRegular }),
    [fontSize, fontFamilyRegular]
  );

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        primaryColor,
        setColor,
        fontSize,
        setFontSize,
        fontType,
        setFontType,
        scale,
        fontFamilyRegular,
        fontFamilyBold,
        colors,
        isDark,
        textStyle,
        fontsReady,
        hydrated,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
