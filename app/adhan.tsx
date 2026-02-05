import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Dimensions,
  ImageBackground,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { stopAdhan } from "../native/adhanAlarm";

const { width, height } = Dimensions.get("window");

// Arabic Mapping
const ARABIC_NAMES: Record<string, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
  Sunrise: "الشروق",
  "Test": "تجربة الآذان", // ✅ Mapped "Test" from scheduler
  "Test Adhan": "تجربة الآذان"
};

export default function AdhanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayer?: string }>();
  const [prayerName] = useState(params.prayer ?? "Prayer");
  const [locationName, setLocationName] = useState("مصر");

  // ✅ Check if this is a test
  const isTest = prayerName === "Test" || prayerName === "Test Adhan";

  // Get Arabic Name
  const displayPrayer = ARABIC_NAMES[prayerName] || prayerName;

  // ✅ Dynamic Header Text
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
          if (data.name) setLocationName(data.name);
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

  return (
    <ImageBackground
      source={require("../assets/mosque2.jpg")}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.5, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <StatusBar hidden={true} />
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.container}>

        {/* ICON ANIMATION */}
        <View style={styles.iconContainer}>
          <View style={styles.ring2} />
          <View style={styles.ring1} />
          <Ionicons name="volume-high" size={40} color="#FFD700" />
        </View>

        {/* TEXT INFO */}
        {/* ✅ Updated Status Text */}
        <Text style={styles.statusText}>{statusText}</Text>

        <Text style={styles.prayerName}>{displayPrayer}</Text>

        <View style={styles.locationContainer}>
          <Ionicons name="location-sharp" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.cityText}>{locationName}</Text>
        </View>

        {/* STOP BUTTON */}
        <TouchableOpacity style={styles.btnWrapper} onPress={onStop} activeOpacity={0.8}>
          <LinearGradient
            colors={['#1a2a6c', '#1a2a6c']}
            style={styles.stopBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="stop-circle" size={32} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.stopText}>إيقاف الآذان</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.hintText}>اضغط للإيقاف والعودة للتطبيق</Text>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: width,
    height: height,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  ring1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  ring2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  statusText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "500",
    marginBottom: 8,
    opacity: 0.9,
    letterSpacing: 1,
  },
  prayerName: {
    color: "#FFD700",
    fontSize: 60,
    fontWeight: "800",
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center' // Ensure long names center properly
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 50,
    gap: 6
  },
  cityText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    fontWeight: "600",
  },
  btnWrapper: {
    width: '100%',
    shadowColor: "#1a2a6c",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  stopBtn: {
    flexDirection: 'row',
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stopText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  hintText: {
    marginTop: 20,
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
  }
});