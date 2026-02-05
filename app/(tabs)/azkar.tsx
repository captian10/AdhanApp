import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AzkarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Azkar</Text>
      <Text style={styles.text}>Coming soon…</Text>
      <Text style={styles.sub}>Next: morning/evening azkar + favorites</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7", padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 12 },
  text: { fontSize: 16, color: "#333" },
  sub: { marginTop: 10, color: "#666" },
});
