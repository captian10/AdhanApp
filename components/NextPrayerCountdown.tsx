// components/NextPrayerCountdown.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text } from "react-native"; // ✅ Text for timer only
import { useTheme } from "../utils/ThemeContext";
import ThemedText from "./ThemedText";

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

// Unicode direction marks
const LRM = "\u200E"; // left-to-right mark

export default function NextPrayerCountdown({ nextPrayerTime, nextPrayerName }: Props) {
  const { colors: C, primaryColor, scale } = useTheme();

  const [timeLeft, setTimeLeft] = useState("- : - : -");
  const [isUrgent, setIsUrgent] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!nextPrayerTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextPrayerTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00 : 00 : 00");
        setIsUrgent(false);
        return;
      }

      setIsUrgent(diff < 10 * 60 * 1000);

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const h = String(hours).padStart(2, "0");
      const m = String(minutes).padStart(2, "0");
      const s = String(seconds).padStart(2, "0");

      setTimeLeft(`${h} : ${m} : ${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextPrayerTime]);

  useEffect(() => {
    if (isUrgent) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isUrgent, scaleAnim]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { alignItems: "center", justifyContent: "center", paddingVertical: 5 },

        // ✅ Timer must be plain Text (LTR) to avoid RTL mirroring
        timerText: {
          fontSize: scale(32),
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
          letterSpacing: 2,
          color: isUrgent ? C.danger : C.text,
          textAlign: "center",
          writingDirection: "ltr",
        },

        labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },

        // ✅ NO fontFamily here -> let ThemedText enforce it globally
        labelText: {
          color: C.textMuted,
          fontWeight: "600",
          fontSize: scale(13),
        },

        // ✅ NO fontFamily here -> let ThemedText enforce it globally
        prayerName: {
          color: primaryColor,
          fontWeight: "900",
          fontSize: scale(14),
        },
      }),
    [C, isUrgent, primaryColor, scale]
  );

  if (!nextPrayerTime) return null;

  const arabicName = nextPrayerName ? ARABIC_NAMES[nextPrayerName] || nextPrayerName : "";

  // ✅ Wrap with LRM to force correct number order in RTL layouts
  const safeTime = `${LRM}${timeLeft}${LRM}`;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.timerText}>{safeTime}</Text>

      <View style={styles.labelRow}>
        <ThemedText style={styles.labelText}>المتبقي على</ThemedText>
        <ThemedText style={styles.prayerName}>{arabicName}</ThemedText>
      </View>
    </Animated.View>
  );
}
