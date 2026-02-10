// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NextPrayerCountdown from "../../components/NextPrayerCountdown";
import ThemedText from "../../components/ThemedText";
import { checkAndroidBackgroundRestrictions } from "../../utils/autostart";
import { getHijriText } from "../../utils/hijri";
import { refreshPrayerSchedule, type PrayerItem } from "../../utils/scheduler";
import { useTheme } from "../../utils/ThemeContext";

const { width, height } = Dimensions.get("window");

const ARABIC_NAMES: Record<string, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
  Sunrise: "الشروق",
};

// TOP AZKAR shortcuts
const TOP_AZKAR = [
  { id: "morning", title: "أذكار الصباح", icon: "weather-sunset-up", route: "/(tabs)/azkar/morning" },
  { id: "evening", title: "أذكار المساء", icon: "weather-night", route: "/(tabs)/azkar/evening" },
  { id: "post_prayer", title: "بعد الصلاة", icon: "hand-heart", route: "/(tabs)/azkar/afterPrayer" },
  { id: "tasbih", title: "تسابيح", icon: "counter", route: "/(tabs)/azkar/tasabeeh" },
  { id: "sleep", title: "أذكار النوم", icon: "bed", route: "/(tabs)/azkar/sleep" },
  { id: "waking", title: "الاستيقاظ", icon: "alarm", route: "/(tabs)/azkar/wakeUp" },
];

// Services
const SERVICES_GRID = [
  { id: "azkar", title: "أذكار", icon: "book-heart", route: "/(tabs)/azkar" },
  { id: "quran", title: "القرآن", icon: "book-open-page-variant", route: "/(tabs)/quran" },
  { id: "duas", title: "الأدعية", icon: "hands-pray", route: "/(tabs)/azkar/prophetic_duas" },
  { id: "adhan", title: "الآذان", icon: "alarm", route: "/(tabs)/settings" },
  { id: "qibla", title: "القبلة", icon: "compass", route: "/(tabs)/qibla" },

  // external
  { id: "calendar", title: "التقويم", icon: "calendar-month", route: "https://hijri-calendar.com/" },
  { id: "mosques", title: "المساجد", icon: "mosque", route: "__MOSQUES__" },
  { id: "radio", title: "الإذاعة", icon: "radio", route: "__RADIO__" },
  { id: "settings", title: "الإعدادات", icon: "cog", route: "/(tabs)/settings" },
  { id: "hadith", title: "صحيح البخاري", icon: "script-text", route: "https://shamela.ws/book/1681" },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ✅ Live theme
  const { colors, primaryColor, scale } = useTheme();

  const styles = useMemo(() => makeStyles(primaryColor, colors, scale), [primaryColor, colors, scale]);

  const [refreshing, setRefreshing] = useState(false);
  const [nextPrayer, setNextPrayer] = useState<PrayerItem | null>(null);
  const [todayPrayers, setTodayPrayers] = useState<PrayerItem[]>([]);
  const [locationName, setLocationName] = useState("جاري التحديد...");
  const [hijriText, setHijriText] = useState("");

  useEffect(() => {
    checkAndroidBackgroundRestrictions();
    handleSync(false);
    loadHijri(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHijri = async (force = false) => {
    const text = await getHijriText({ force });
    setHijriText(text);
  };

  const handleSync = async (force: boolean = false) => {
    setRefreshing(true);
    try {
      const result = await refreshPrayerSchedule({ daysAhead: 2, forceGps: force });
      setNextPrayer(result.nextPrayer);
      setTodayPrayers(result.todayPrayers);
      if (result.locationName) setLocationName(result.locationName);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePress = (route: string) => {
    if (route === "__MOSQUES__") {
      return Linking.openURL("https://www.google.com/maps/search/" + encodeURIComponent("مسجد"));
    }
    if (route === "__RADIO__") {
      return Linking.openURL("https://www.holyquranradio.com/?m=1");
    }
    if (route.startsWith("__")) return;

    // @ts-ignore
    router.push(route);
  };

  const gregDate = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <View style={styles.topRow}>
          <View>
            <ThemedText style={styles.dateText}>{gregDate}</ThemedText>
            <ThemedText style={styles.hijriText}>{hijriText}</ThemedText>
          </View>

          <View style={styles.locationPill}>
            <Ionicons name="location" size={14} color={primaryColor} />
            <ThemedText style={styles.locationText}>{locationName}</ThemedText>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 25 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                handleSync(true);
                loadHijri(true);
              }}
              colors={[primaryColor]}
            />
          }
        >
          {/* Top Azkar */}
          <View style={styles.azkarGrid}>
            {TOP_AZKAR.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.azkarItem}
                onPress={() => handlePress(item.route)}
                activeOpacity={0.85}
              >
                <View style={[styles.azkarIconCircle, { backgroundColor: primaryColor + "15" }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color={primaryColor} />
                </View>

                <ThemedText style={styles.azkarLabel} numberOfLines={1}>
                  {item.title}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Prayer Card */}
          <View style={styles.prayerCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prayerStrip}>
              {todayPrayers.map((p, i) => {
                const isNext = p.name === nextPrayer?.name;
                return (
                  <View key={i} style={[styles.prayerItem, isNext && styles.prayerItemActive]}>
                    <ThemedText style={[styles.prayerName, isNext && styles.activeText]}>
                      {ARABIC_NAMES[p.name]}
                    </ThemedText>

                    <ThemedText style={[styles.prayerTime, isNext && styles.activeText]}>
                      {p.time
                        .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                        .replace(/AM|PM/i, "")
                        .trim()}
                    </ThemedText>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.cardDivider} />

            <View style={styles.counterSection}>
              <NextPrayerCountdown
                nextPrayerTime={nextPrayer?.time || null}
                nextPrayerName={nextPrayer?.name || null}
              />
            </View>
          </View>

          {/* Services */}
          <ThemedText style={styles.sectionTitle}>الخدمات</ThemedText>

          <View style={styles.gridContainer}>
            {SERVICES_GRID.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                onPress={() => handlePress(item.route)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.gridIconCircle,
                    { backgroundColor: primaryColor + "10", borderColor: primaryColor + "20" },
                  ]}
                >
                  <MaterialCommunityIcons name={item.icon as any} size={26} color={primaryColor} />
                </View>

                <ThemedText style={styles.gridLabel}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function makeStyles(primary: string, C: any, scale: (n: number) => number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.sheetBg },

    header: {
      width,
      height: height * 0.2,
      backgroundColor: primary,
      paddingHorizontal: 20,
    },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },

    // ✅ No fontFamily here (ThemedText handles it)
    dateText: { color: "#FFF", fontSize: scale(16), fontWeight: "900", textAlign: "left" },
    hijriText: { color: "#FFF", fontSize: scale(16), fontWeight: "900", marginTop: 4, textAlign: "left" },

    locationPill: {
      flexDirection: "row",
      backgroundColor: "#FFF",
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 10,
      alignItems: "center",
      gap: 5,
      elevation: 2,
    },
    locationText: { color: primary, fontSize: scale(12), fontWeight: "900", textAlign: "left" },

    sheet: {
      flex: 1,
      marginTop: -30,
      backgroundColor: C.sheetBg,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: "hidden",
    },

    azkarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      marginBottom: 20,
    },
    azkarItem: {
      width: "31%",
      backgroundColor: C.cardBg,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.divider,
      elevation: 1,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
    azkarIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
    },
    azkarLabel: { fontSize: scale(12), fontWeight: "800", color: C.text, textAlign: "center" },

    prayerCard: {
      backgroundColor: C.cardBg,
      marginHorizontal: 15,
      borderRadius: 18,
      paddingVertical: 15,
      elevation: 2,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: C.divider,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 5,
    },
    prayerStrip: { paddingHorizontal: 15, gap: 5 },
    prayerItem: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, minWidth: 60 },
    prayerItemActive: { backgroundColor: primary },
    prayerName: { fontSize: scale(11), color: C.textMuted, marginBottom: 4, textAlign: "left" },
    prayerTime: { fontSize: scale(13), fontWeight: "900", color: C.text, textAlign: "left" },
    activeText: { color: "#FFF" },

    cardDivider: { height: 1, backgroundColor: C.divider, marginVertical: 15, marginHorizontal: 20 },
    counterSection: { alignItems: "center", paddingHorizontal: 20 },

    sectionTitle: {
      fontSize: scale(14),
      fontWeight: "900",
      color: C.textMuted,
      marginHorizontal: 20,
      marginBottom: 12,
      textAlign: "left",
    },

    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 15,
      justifyContent: "space-between",
    },
    gridItem: { width: "23%", alignItems: "center", marginBottom: 20 },
    gridIconCircle: {
      width: 50,
      height: 50,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
      borderWidth: 1,
    },
    gridLabel: { fontSize: scale(11), color: C.text, fontWeight: "800", textAlign: "center" },
  });
}
