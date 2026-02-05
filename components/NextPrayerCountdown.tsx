import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppColors } from "../constants/Colors";

interface Props {
  nextPrayerTime: Date | null;
  nextPrayerName: string | null;
}

const ARABIC_NAMES: Record<string, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
  Sunrise: "الشروق",
};

export default function NextPrayerCountdown({ nextPrayerTime, nextPrayerName }: Props) {
  const C = useAppColors();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!nextPrayerTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextPrayerTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("الآن");
        return;
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const h = String(hours).padStart(2, "0");
      const m = String(minutes).padStart(2, "0");
      const s = String(seconds).padStart(2, "0");

      // ✅ RTL version:
      // Use RLM (Right-to-Left Mark) to keep minus in correct position in RTL
      const RLM = "\u200F";
      const minus = "−"; // real minus

      // In RTL, putting RLM before minus helps it stay visually correct
      setTimeLeft(`${RLM}${minus}${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextPrayerTime]);

  if (!nextPrayerTime) return null;

  const arabicName = nextPrayerName ? ARABIC_NAMES[nextPrayerName] || nextPrayerName : "";

  const styles = StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 10,
    },
    label: {
      color: C.secondary,
      fontSize: 18,
      fontWeight: "700",
      textShadowColor: "rgba(0,0,0,0.50)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    timer: {
      color: C.textOnDark,
      fontSize: 50,
      fontWeight: "200",
      fontVariant: ["tabular-nums"],

      // ✅ THE CHANGE: RTL direction
      writingDirection: "rtl",
      textAlign: "center",

      textShadowColor: "rgba(0,0,0,0.30)",
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 10,
      lineHeight: 70,
    },
    subTime: {
      color: C.textOnDark,
      fontSize: 20,
      fontWeight: "500",
      marginTop: 5,
      textShadowColor: "rgba(0,0,0,0.50)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>الصلاة التالية: {arabicName}</Text>

      {/* ✅ RTL timer */}
      <Text style={styles.timer}>{timeLeft}</Text>

      <Text style={styles.subTime}>
        {nextPrayerTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </View>
  );
}
