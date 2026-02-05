import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppColors, type AppColors } from "@/constants/Colors";

import NextPrayerCountdown from "../../components/NextPrayerCountdown";
import {
  AZAN_SOUNDS,
  getSoundPreference,
  saveSoundPreference,
  type AzanSound,
} from "../../utils/audioSettings";
import { checkAndroidBackgroundRestrictions } from "../../utils/autostart";
import { EGYPT_CITIES, type City } from "../../utils/egyptLocations";
import {
  refreshPrayerSchedule,
  saveLocationPreference,
  scheduleTestAzan,
  type PrayerItem,
} from "../../utils/scheduler";

const { width, height } = Dimensions.get("window");

// ✅ Map must match the lowercase filenames in assets/ folder exactly
const SOUND_MAP: Record<string, any> = {
  azan_nasser_elktamy: require("../../assets/azan_nasser_elktamy.mp3"),
  azan_egypt: require("../../assets/azan_egypt.mp3"),
  azan_good: require("../../assets/azan_good.mp3"),
  azan_good_2: require("../../assets/azan_good_2.mp3"),
  azan_abdel_baset: require("../../assets/azan_abdel_baset.mp3"),
};

const ARABIC_NAMES: Record<string, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
  Sunrise: "الشروق",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const C = useAppColors();

  const styles = useMemo(() => makeStyles(C, insets.bottom), [C, insets.bottom]);

  const [refreshing, setRefreshing] = useState(false);
  const [nextPrayer, setNextPrayer] = useState<PrayerItem | null>(null);
  const [todayPrayers, setTodayPrayers] = useState<PrayerItem[]>([]);
  const [locationName, setLocationName] = useState("جاري التحديد...");
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Audio State
  const [soundModalVisible, setSoundModalVisible] = useState(false);
  const [soundName, setSoundName] = useState("الافتراضي");
  const [selectedSoundId, setSelectedSoundId] = useState("azan_nasser_elktamy");

  // ✅ Preview player
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<any>(null);
  const player = useAudioPlayer(audioSource);

  useEffect(() => {
    if (player && previewId) player.play();
  }, [player, previewId]);

  const todayDate = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    checkAndroidBackgroundRestrictions();
    loadSettings();
    handleSync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    const prefId = await getSoundPreference();
    setSelectedSoundId(prefId);
    const soundObj = AZAN_SOUNDS.find((s) => s.id === prefId);
    if (soundObj) setSoundName(soundObj.name);
  };

  const handleSync = async (force: boolean = false) => {
    setRefreshing(true);
    try {
      const result = await refreshPrayerSchedule({ daysAhead: 5, forceGps: force });
      setNextPrayer(result.nextPrayer);
      setTodayPrayers(result.todayPrayers);
      if (result.locationName) setLocationName(result.locationName);
    } catch {
      // quiet fail
    } finally {
      setRefreshing(false);
    }
  };

  const testAdhan = async () => {
    await scheduleTestAzan(5);
    alert("تم جدولة تجربة الآذان خلال 5 ثواني");
  };

  const selectCity = async (city: City) => {
    setLocationModalVisible(false);
    setLocationName(city.name);
    await saveLocationPreference("manual", { lat: city.lat, lng: city.lng, name: city.name });
    handleSync(true);
  };

  const selectAuto = async () => {
    setLocationModalVisible(false);
    setLocationName("جاري تحديد الموقع...");
    await saveLocationPreference("auto");
    handleSync(true);
  };

  const handleSoundSelect = async (sound: AzanSound) => {
    if (player?.playing) player.pause();
    setPreviewId(null);
    setAudioSource(null);

    setSelectedSoundId(sound.id);
    setSoundName(sound.name);
    await saveSoundPreference(sound.id);
    setSoundModalVisible(false);

    handleSync(false);
  };

  const playPreview = (id: string) => {
    const asset = SOUND_MAP[id];
    if (!asset) return alert("الملف الصوتي غير موجود في الأصول");

    if (previewId === id && player?.playing) {
      player.pause();
      setPreviewId(null);
      setAudioSource(null);
    } else {
      setAudioSource(asset);
      setPreviewId(id);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HERO */}
      <ImageBackground
        source={require("../../assets/mosque.jpg")}
        style={[styles.headerBg, { paddingTop: insets.top + 10 }]}
        resizeMode="cover"
      >
        <LinearGradient colors={C.heroGradient} style={StyleSheet.absoluteFill} />

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.locationBtn} onPress={() => setLocationModalVisible(true)}>
            <Ionicons name="location-sharp" size={16} color={C.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.locationText}>{locationName}</Text>
            <Ionicons name="chevron-down" size={14} color={C.chipChevron} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <Text style={styles.dateText}>{todayDate}</Text>
        </View>

        <View style={styles.countdownWrapper}>
          <NextPrayerCountdown
            nextPrayerTime={nextPrayer?.time || null}
            nextPrayerName={nextPrayer?.name || null}
          />
        </View>
      </ImageBackground>

      {/* SHEET */}
      <View style={styles.sheetContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => handleSync(true)}
              tintColor={C.primary}
            />
          }
        >
          <View style={styles.handleBar} />

          {todayPrayers.map((p, i) => {
            const isNext = p.name === nextPrayer?.name;
            const arabicName = ARABIC_NAMES[p.name] || p.name;

            return (
              <View key={`${p.name}-${i}`} style={[styles.prayerRow, isNext && styles.activeRow]}>
                <Text style={[styles.prayerTime, isNext && styles.activeText]}>
                  {p.time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </Text>

                <View style={styles.rowRight}>
                  <Text style={[styles.prayerName, isNext && styles.activeText]}>{arabicName}</Text>
                  <Ionicons
                    name={isNext ? "time" : "ellipse-outline"}
                    size={18}
                    color={isNext ? C.textOnDark : C.textMuted2}
                  />
                </View>
              </View>
            );
          })}

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={testAdhan}>
              <LinearGradient colors={C.primaryGradient} style={styles.controlBtnGradient}>
                <Ionicons name="play-circle" size={20} color={C.secondary} />
                <Text style={styles.controlBtnText}>تجربة الآذان (5ث)</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={() => setSoundModalVisible(true)}>
              <LinearGradient colors={C.primaryGradient} style={styles.controlBtnGradient}>
                <Ionicons name="volume-high" size={20} color={C.secondary} />
                <Text style={styles.controlBtnText}>تغيير الآذان</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* LOCATION MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تغيير الموقع</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.autoLocationBtn} onPress={selectAuto}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="navigate-circle" size={28} color={C.link} />
                <Text style={styles.autoText}>تحديد تلقائي (GPS)</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={C.textMuted2} />
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>محافظات مصر</Text>

            <FlatList
              data={EGYPT_CITIES}
              keyExtractor={(item) => item.nameEn}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.cityItem} onPress={() => selectCity(item)}>
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.cityNameEn}>{item.nameEn}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: height * 0.4 }}
            />
          </View>
        </View>
      </Modal>

      {/* SOUND MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={soundModalVisible}
        onRequestClose={() => setSoundModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "60%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>صوت الآذان</Text>
              <TouchableOpacity onPress={() => setSoundModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={AZAN_SOUNDS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = item.id === selectedSoundId;

                return (
                  <View style={[styles.cityItem, selected && styles.selectedRow]}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10 }}
                      onPress={() => handleSoundSelect(item)}
                    >
                      {selected && <Ionicons name="checkmark-circle" size={24} color={C.link} />}
                      <Text style={[styles.cityName, selected && styles.selectedText]}>{item.name}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => playPreview(item.id)} style={{ padding: 8 }}>
                      <Ionicons
                        name={previewId === item.id ? "stop-circle" : "play-circle"}
                        size={32}
                        color={previewId === item.id ? C.danger : C.primary}
                      />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(C: AppColors, safeBottom: number) {
  return StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: C.homeBg,
    },
    headerBg: {
      width,
      height: height * 0.4,
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    topBar: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dateText: {
      color: C.textOnDark,
      fontSize: 14,
      opacity: 0.9,
      fontWeight: "600",
    },
    locationBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: C.chipBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.chipBorder,
    },
    locationText: {
      color: C.textOnDark,
      fontSize: 16,
      fontWeight: "bold",
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    countdownWrapper: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 40,
    },

    sheetContainer: {
      flex: 1,
      marginTop: -30,
      backgroundColor: C.sheetBg,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: "hidden",
    },
    scrollContent: {
      padding: 20,
      paddingTop: 10,
      paddingBottom: 40 + safeBottom, // ✅ safe with tabs
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: C.handle,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20,
      marginTop: 10,
    },

    prayerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 10,
      backgroundColor: C.cardBg,
      borderRadius: 16,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
      borderWidth: 1,
      borderColor: C.border,
    },
    activeRow: {
      backgroundColor: C.primary,
      transform: [{ scale: 1.02 }],
      shadowColor: C.primary,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
      borderColor: "transparent",
    },
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    prayerName: {
      fontSize: 18,
      color: C.text,
      fontWeight: "600",
    },
    prayerTime: {
      fontSize: 18,
      color: C.text,
      fontWeight: "700",
    },
    activeText: {
      color: C.secondary,
    },

    controlsRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      gap: 15,
      marginTop: 20,
      paddingHorizontal: 10,
    },
    controlBtn: {
      flex: 1,
      borderRadius: 25,
      overflow: "hidden",
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    controlBtnGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      gap: 8,
    },
    controlBtnText: {
      color: C.textOnDark,
      fontSize: 14,
      fontWeight: "bold",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: C.modalBg,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 20,
      maxHeight: "80%",
      borderTopWidth: 1,
      borderColor: C.border,
    },
    modalHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: C.text,
    },

    autoLocationBtn: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: C.selectionBg,
      padding: 15,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: C.link,
    },
    autoText: {
      fontSize: 16,
      fontWeight: "600",
      color: C.link,
    },
    sectionTitle: {
      fontSize: 14,
      color: C.textMuted,
      marginBottom: 10,
      textAlign: "right",
    },
    cityItem: {
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: C.divider,
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cityName: {
      fontSize: 18,
      color: C.text,
    },
    cityNameEn: {
      fontSize: 14,
      color: C.textMuted,
    },

    selectedRow: {
      backgroundColor: C.selectionBg,
      borderRadius: 12,
      paddingHorizontal: 10,
      borderBottomColor: "transparent",
    },
    selectedText: {
      color: C.link,
      fontWeight: "bold",
    },
  });
}
