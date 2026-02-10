// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTheme } from "../../utils/ThemeContext";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // ✅ use fontFamily (resolved) not fontType
  const { colors: C, primaryColor, fontFamily, scale } = useTheme();

  const isAndroid = Platform.OS === "android";

  const height = (isAndroid ? 60 : 78) + insets.bottom;
  const paddingTop = 6;
  const paddingBottom = (isAndroid ? 10 : 16) + insets.bottom;

  const tabLabelStyle = useMemo(
    () => ({
      fontSize: scale(12),
      marginTop: 2,
      writingDirection: "rtl" as const,
      textAlign: "center" as const,
      fontFamily, // ✅ now tabs follow selected font
    }),
    [fontFamily, scale]
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: C.textMuted2,

        tabBarLabelStyle: tabLabelStyle,

        tabBarStyle: {
          backgroundColor: C.cardBg,
          borderTopColor: C.border,
          borderTopWidth: 1,

          height,
          paddingTop,
          paddingBottom,

          ...(Platform.OS === "ios"
            ? {
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: -6 },
              }
            : { elevation: 10 }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الآذان",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "mosque" : "mosque-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="qibla"
        options={{
          title: "القبلة",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "compass" : "compass-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="quran"
        options={{
          title: "القرآن",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "book-open-page-variant" : "book-open-page-variant-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="azkar"
        options={{
          title: "الأذكار",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "hand-heart" : "hand-heart-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "cog" : "cog-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
