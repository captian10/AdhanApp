import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Bottom tabs group */}
      <Stack.Screen name="(tabs)" />

      {/* Full-screen adhan screen (opened by deep link from native service) */}
      <Stack.Screen
        name="adhan"
        options={{
          presentation: "fullScreenModal",
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
