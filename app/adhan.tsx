import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Dimensions,
  ImageBackground,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import ThemedText from "../components/ThemedText";
import { stopAdhan } from "../native/adhanAlarm";
import { useTheme } from "../utils/ThemeContext";

const { width, height } = Dimensions.get("window");

// Arabic Mapping
const ARABIC_NAMES: Record<string, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
  Sunrise: "الشروق",
  Test: "تجربة الآذان",
  "Test Adhan": "تجربة الآذان",
};

export default function AdhanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayer?: string }>();

  const { colors, primaryColor, scale } = useTheme();

  const [prayerName] = useState(params.prayer ?? "Prayer");
  const [locationName, setLocationName] = useState("مصر");

  const isTest = prayerName === "Test" || prayerName === "Test Adhan";
  const displayPrayer = ARABIC_NAMES[prayerName] || prayerName;
  const statusText = isTest ? "معاينة الصوت" : "حان الآن موعد صلاة";

  // Block Android back button
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // Fetch Saved Location Name
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const cached = await AsyncStorage.getItem("adhan_cached_city_name_v1");
        if (cached) {
          setLocationName(cached);
          return;
        }
        const pref = await AsyncStorage.getItem("adhan_location_pref_v1");
        if (pref) {
          const data = JSON.parse(pref);
          if (data?.name) setLocationName(data.name);
        }
      } catch { }
    };
    fetchLocation();
  }, []);

  const onStop = useCallback(async () => {
    try {
      await stopAdhan();
    } catch { }
    router.replace("/");
  }, [router]);

  // Theme-aware derived colors
  const ringStrong = useMemo(() => primaryColor + "55", [primaryColor]);
  const ringSoft = useMemo(() => primaryColor + "22", [primaryColor]);
  const iconColor = primaryColor;

  // Keep overlay dark for readability, but slightly theme-aware
  const overlay = useMemo(
    () =>
      [
        "transparent",
        "rgba(0,0,0,0.25)",
        "rgba(0,0,0,0.78)",
        "rgba(0,0,0,0.92)",
      ] as const,
    []
  );


  const styles = useMemo(() => makeStyles(scale), [scale]);

  return (
    <ImageBackground
      source={require("../assets/azanbackground.jpg")}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Overlay */}
      <LinearGradient colors={overlay} locations={[0, 0.5, 0.8, 1]} style={StyleSheet.absoluteFill} />

      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.container}>
        {/* ICON */}
        <View style={styles.iconContainer}>
          <View style={[styles.ring2, { borderColor: ringSoft }]} />
          <View style={[styles.ring1, { borderColor: ringStrong }]} />
          <Ionicons name="volume-high" size={40} color={iconColor} />
        </View>

        {/* TEXT */}
        <ThemedText
          style={[
            styles.statusText,
            {
              color: "#fff",
              fontSize: scale(16),
              lineHeight: scale(24),
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
            },
          ]}
        >
          {statusText}
        </ThemedText>

        <ThemedText
          weight="bold"
          style={[
            styles.prayerName,
            {
              color: primaryColor,
              fontSize: scale(46),
              lineHeight: scale(58),
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
            },
          ]}
          numberOfLines={2}
        >
          {displayPrayer}
        </ThemedText>

        <View style={styles.locationContainer}>
          <Ionicons name="location-sharp" size={16} color={"rgba(255,255,255,0.75)"} />
          <ThemedText
            style={[
              styles.cityText,
              {
                color: "rgba(255,255,255,0.85)",
                fontSize: scale(14),
                lineHeight: scale(20),
              },
            ]}
            numberOfLines={1}
          >
            {locationName}
          </ThemedText>
        </View>

        {/* STOP BUTTON */}
        <TouchableOpacity style={[styles.btnWrapper, { shadowColor: primaryColor }]} onPress={onStop} activeOpacity={0.85}>
          <LinearGradient
            colors={[primaryColor + "EE", primaryColor + "CC"]}
            style={[styles.stopBtn, { borderColor: "rgba(255,255,255,0.22)" }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="stop-circle" size={32} color="#fff" style={{ marginRight: 10 }} />
            <ThemedText weight="bold" style={[styles.stopText, { color: "#fff", fontSize: scale(16) }]}>
              إيقاف الآذان
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>

        <ThemedText style={[styles.hintText, { color: "rgba(255,255,255,0.45)", fontSize: scale(10) }]}>
          اضغط للإيقاف والعودة للتطبيق
        </ThemedText>
      </View>
    </ImageBackground>
  );
}

function makeStyles(scale: (n: number) => number) {
  return StyleSheet.create({
    bgImage: {
      flex: 1,
      width,
      height,
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      paddingHorizontal: 30,
      paddingBottom: 60,
    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 40,
    },
    ring1: {
      position: "absolute",
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 1,
    },
    ring2: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 1,
    },
    statusText: {
      fontWeight: "700",
      marginBottom: 8,
      opacity: 0.9,
      letterSpacing: 0.6,
      textAlign: "center",
    },
    prayerName: {
      fontWeight: "900",
      marginBottom: 10,
      textShadowColor: "rgba(0,0,0,0.65)",
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 10,
      textAlign: "center",
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 50,
      gap: 6,
    },
    cityText: {
      fontWeight: "800",
    },
    btnWrapper: {
      width: "100%",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 10,
    },
    stopBtn: {
      flexDirection: "row",
      height: 70,
      borderRadius: 35,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      borderWidth: 1,
    },
    stopText: {
      fontWeight: "900",
    },
    hintText: {
      marginTop: 20,
      fontWeight: "700",
      textAlign: "center",
    },
  });
}
