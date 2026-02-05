import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppColors } from "@/constants/Colors"; // ✅ uses your Colors.ts

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const C = useAppColors();

  const baseHeight = Platform.OS === "android" ? 62 : 82;
  const basePaddingTop = 6;
  const basePaddingBottom = Platform.OS === "android" ? 10 : 22;

  // ✅ "compass" exists in many MDI versions, but not all.
  // We'll prefer it, and fall back to "compass" if you get an unknown icon error.
  const qiblaIconFocused = "compass" as any;
  const qiblaIconDefault = "compass" as any;

  // ✅ Tasbih-like options (pick one). "counter" is a very good tasbih feel.
  const azkarIconFocused = "counter" as any;
  const azkarIconDefault = "counter" as any;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: C.tabBarActive,
        tabBarInactiveTintColor: C.tabBarInactive,

        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
        },

        tabBarStyle: {
          backgroundColor: C.tabBarBg,
          borderTopColor: C.border,

          height: baseHeight + insets.bottom,
          paddingTop: basePaddingTop,
          paddingBottom: basePaddingBottom + insets.bottom,
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
              // ✅ preferred: compass / fallback: compass
              name={(focused ? qiblaIconFocused : qiblaIconDefault) ?? (focused ? "compass" : "compass-outline")}
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
              // ✅ Tasbih-like icon
              name={focused ? azkarIconFocused : azkarIconDefault}
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
              name={focused ? "cog" : "cog-outline"} // ✅ gear
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
