import React, { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

export default function SettingsScreen() {
  const [alarmMode, setAlarmMode] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Alarm / Foreground Mode</Text>
            <Text style={styles.rowDesc}>Use native foreground service for Adhan</Text>
          </View>
          <Switch value={alarmMode} onValueChange={setAlarmMode} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7", padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  rowDesc: { color: "#666", marginTop: 2 },
});
