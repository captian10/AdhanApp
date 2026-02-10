// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect } from "react";
import { I18nManager, Platform } from "react-native";
import * as Updates from "expo-updates";

import { ThemeProvider } from "../utils/ThemeContext";
import ThemedText from "../components/ThemedText"; // ✅ ensure this file exists
import { Text } from "react-native";

// ✅ Make sure all default Text uses ThemedText styling by replacing Text usage in your app.
// NOTE: React Native cannot truly “globally” force all <Text> to re-render unless you use ThemedText everywhere.
// This _layout just wraps the app with ThemeProvider and keeps RTL logic.

export default function RootLayout() {
  useEffect(() => {
    const forceRTL = async () => {
      if (!I18nManager.isRTL) {
        try {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);

          if (Platform.OS !== "web") {
            await Updates.reloadAsync();
          }
        } catch (e) {
          console.error("Failed to force RTL:", e);
        }
      }
    };
    forceRTL();
  }, []);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="adhan"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
