// app/(tabs)/settings.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard, KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Slider from "@react-native-community/slider";
import ColorPicker, { HueSlider, OpacitySlider, Panel1, Preview } from "reanimated-color-picker";

import ThemedText from "../../components/ThemedText";
import { useTheme } from "../../utils/ThemeContext";

import { stopAdhan } from "../../native/adhanAlarm";
import {
  AZAN_SOUNDS,
  SALAT_SOUNDS,
  getSalatSoundPreference,
  getSoundPreference,
  saveSalatSoundPreference,
  saveSoundPreference,
  type AzanSound,
} from "../../utils/audioSettings";
import { checkAndroidBackgroundRestrictions } from "../../utils/autostart";
import { EGYPT_CITIES, type City } from "../../utils/egyptLocations";
import {
  getSalatIntervalMinutes,
  isAdhanEnabled,
  // ✅ Salat ("صلي على محمد") scheduling
  isSalatEnabled,
  refreshPrayerSchedule,
  refreshSalatSchedule,
  resetAllNotificationsAndAlarms,
  saveLocationPreference,
  scheduleTestAzan,
  scheduleTestSalat,
  setAdhanEnabled,
  setSalatEnabled,
  setSalatIntervalMinutes,
} from "../../utils/scheduler";

type ColorResult = { hex?: string };

// --------- ✅ Preview Assets (Azan + Salat) ---------
const AZAN_SOUND_MAP: Record<string, any> = {
  azan_nasser_elktamy: require("../../assets/azan_nasser_elktamy.mp3"),
  azan_egypt: require("../../assets/azan_egypt.mp3"),
  azan_good: require("../../assets/azan_good.mp3"),
  azan_good_2: require("../../assets/azan_good_2.mp3"),
  azan_abdel_baset: require("../../assets/azan_abdel_baset.mp3"),
};

const SALAT_SOUND_MAP: Record<string, any> = {
  salat_mohammad_1: require("../../assets/salat_mohammad_1.mp3"),
  salat_mohammad_2: require("../../assets/salat_mohammad_2.mp3"),
  salat_mohammad_3: require("../../assets/salat_mohammad_3.mp3"),
  salat_mohammad_4: require("../../assets/salat_mohammad_4.mp3"),
};

const THEME_MODES = ["system", "light", "dark"] as const;
const MODE_LABEL: Record<(typeof THEME_MODES)[number], string> = {
  system: "حسب النظام",
  light: "فاتح",
  dark: "داكن",
};

const FONT_TYPES = ["System", "Cairo", "Tajawal", "Amiri", "ScheherazadeNew"] as const;
const FONT_LABEL: Record<(typeof FONT_TYPES)[number], string> = {
  System: "افتراضي",
  Cairo: "Cairo",
  Tajawal: "Tajawal",
  Amiri: "Amiri",
  ScheherazadeNew: "Scheherazade",
};

/**
 * ✅ ThemedPressable:
 * - consistent pressed feedback
 * - optional haptics
 */
function ThemedPressable({
  onPress,
  disabled,
  style,
  pressedStyle,
  haptic = true,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  haptic?: boolean;
  children: React.ReactNode;
}) {
  const handlePress = () => {
    if (!onPress || disabled) return;
    if (haptic && Platform.OS !== "web") Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled ? pressedStyle : null]}
    >
      {children}
    </Pressable>
  );
}

/**
 * ✅ ThemedButton:
 * A real button that ACCEPTS a title and ALWAYS renders it using ThemedText
 * (so the theme font is applied).
 */
function ThemedButton({
  title,
  onPress,
  disabled,
  style,
  pressedStyle,
  titleStyle,
  haptic = true,
  left,
  right,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  haptic?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <ThemedPressable
      onPress={onPress}
      disabled={disabled}
      style={style}
      pressedStyle={pressedStyle}
      haptic={haptic}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {left}
        <ThemedText style={titleStyle}>{title}</ThemedText>
        {right}
      </View>
    </ThemedPressable>
  );
}

const SectionHeader = ({ title }: { title: string }) => {
  const { colors, scale } = useTheme();
  return (
    <ThemedText
      style={{
        color: colors.textMuted2,
        fontSize: scale(13),
        fontWeight: "800",
        marginBottom: 8,
        marginLeft: 4,
        textAlign: "left",
      }}
    >
      {title}
    </ThemedText>
  );
};

const SectionContainer = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.sectionContainer,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {children}
    </View>
  );
};

type SettingRowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean; // ✅ NEW
};

function SettingRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  isLast,
  danger,
  loading,
  disabled,
}: SettingRowProps) {
  const { colors, primaryColor, scale } = useTheme();

  const rowDisabled = !!disabled || !onPress || loading;

  return (
    <ThemedPressable
      onPress={onPress}
      disabled={rowDisabled}
      style={[
        styles.rowContent,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
        rowDisabled && { opacity: 0.45 },
      ]}
      pressedStyle={!rowDisabled ? { opacity: 0.88 } : undefined}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: rowDisabled
              ? colors.divider
              : danger
                ? colors.danger + "15"
                : primaryColor + "15",
          },
        ]}
      >
        {loading ? (
          <MaterialCommunityIcons name="loading" size={20} color={colors.textMuted} style={styles.spin} />
        ) : (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={rowDisabled ? colors.textMuted2 : danger ? colors.danger : primaryColor}
          />
        )}
      </View>

      <View style={styles.rowRight}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ThemedText
            style={{
              color: rowDisabled ? colors.textMuted2 : danger ? colors.danger : colors.text,
              fontSize: scale(15),
              fontWeight: "800",
              opacity: loading ? 0.6 : 1,
              textAlign: "left",
            }}
          >
            {title}
          </ThemedText>

          {!!subtitle && (
            <ThemedText
              style={{
                color: rowDisabled ? colors.textMuted2 : colors.textMuted,
                fontSize: scale(12),
                marginTop: 2,
                textAlign: "left",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {right}
          {onPress && !right && (
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={colors.textMuted2}
              style={{ opacity: rowDisabled ? 0.35 : 0.7 }}
            />
          )}
        </View>
      </View>
    </ThemedPressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const {
    colors,
    primaryColor,
    setColor,
    fontSize,
    setFontSize,
    fontType,
    setFontType,
    themeMode,
    setThemeMode,
    scale,
    fontsReady,
  } = useTheme();

  const [busy, setBusy] = useState(false);

  // Adhan enable state
  const [adhanEnabled, setAdhanEnabledState] = useState(true);

  // ✅ Salat enable + interval UI
  const [salatEnabled, setSalatEnabledState] = useState(false);
  const [salatIntervalMin, setSalatIntervalMinState] = useState(30);
  const [salatIntervalModalVisible, setSalatIntervalModalVisible] = useState(false);
  const [customIntervalText, setCustomIntervalText] = useState("30");

  // Color picker
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [tempColor, setTempColor] = useState(primaryColor);

  useEffect(() => {
    if (colorModalVisible) setTempColor(primaryColor);
  }, [colorModalVisible, primaryColor]);

  const onPickColor = (result: ColorResult) => {
    const hex = result?.hex || tempColor;
    if (hex) setTempColor(hex);
  };

  // Azan sound
  const [soundModalVisible, setSoundModalVisible] = useState(false);
  const [soundId, setSoundId] = useState<string>("azan_nasser_elktamy");

  const soundLabel = useMemo(() => {
    const s = AZAN_SOUNDS.find((x) => x.id === soundId);
    return s?.name ?? "الافتراضي";
  }, [soundId]);

  // ✅ Salat sound
  const [salatModalVisible, setSalatModalVisible] = useState(false);
  const [salatSoundId, setSalatSoundId] = useState<string>("salat_mohammad_1");

  const salatSoundLabel = useMemo(() => {
    const s = SALAT_SOUNDS.find((x) => x.id === salatSoundId);
    return s?.name ?? "صلي على محمد 1";
  }, [salatSoundId]);

  // Preview (shared)
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<any>(null);
  const player = useAudioPlayer(audioSource);

  // Location
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationName, setLocationName] = useState<string>("تلقائي (GPS)");
  const [locationMode, setLocationMode] = useState<"auto" | "manual">("auto");

  const [showTips, setShowTips] = useState(true);

  const versionLabel = useMemo(() => {
    const v = Application.nativeApplicationVersion ?? "—";
    const b = Application.nativeBuildVersion ?? "—";
    return `${v} (${b})`;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const pref = await getSoundPreference();
        if (pref) setSoundId(pref);
      } catch { }

      try {
        const pref2 = await getSalatSoundPreference();
        if (pref2) setSalatSoundId(pref2);
      } catch { }

      try {
        const enabled = await isAdhanEnabled();
        setAdhanEnabledState(enabled);
      } catch {
        setAdhanEnabledState(true);
      }

      // ✅ Load Salat scheduling
      try {
        const se = await isSalatEnabled();
        setSalatEnabledState(se);
      } catch {
        setSalatEnabledState(false);
      }

      try {
        const iv = await getSalatIntervalMinutes();
        setSalatIntervalMinState(iv);
        setCustomIntervalText(String(iv));
      } catch {
        setSalatIntervalMinState(30);
        setCustomIntervalText("30");
      }
    })();

    checkAndroidBackgroundRestrictions().catch(() => { });
  }, []);

  useEffect(() => {
    if (player && previewKey) player.play();
  }, [player, previewKey]);

  const stopPreview = useCallback(() => {
    try {
      if (player?.playing) player.pause();
    } catch { }
    setPreviewKey(null);
    setAudioSource(null);
  }, [player]);

  const playPreviewFrom = useCallback(
    (map: Record<string, any>, id: string) => {
      const asset = map[id];
      if (!asset) {
        Alert.alert("غير موجود", "ملف الصوت غير موجود.");
        return;
      }
      if (previewKey === id && player?.playing) {
        stopPreview();
        return;
      }
      setAudioSource(asset);
      setPreviewKey(id);
    },
    [previewKey, player, stopPreview]
  );

  const onSelectSound = useCallback(
    async (s: AzanSound) => {
      if (!adhanEnabled) {
        Alert.alert("موقوف", "خاصية الآذان موقوفة. قم بتشغيلها أولاً.");
        return;
      }

      stopPreview();
      setSoundId(s.id);
      await saveSoundPreference(s.id);
      setSoundModalVisible(false);

      try {
        setBusy(true);
        await refreshPrayerSchedule({ daysAhead: 5 });
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("تم", "تم تحديث الصوت والجدولة ✅");
      } catch {
        Alert.alert("تنبيه", "تم حفظ الصوت، لكن تعذر التحديث الآن.");
      } finally {
        setBusy(false);
      }
    },
    [stopPreview, adhanEnabled]
  );

  const onSelectSalatSound = useCallback(
    async (s: AzanSound) => {
      stopPreview();
      setSalatSoundId(s.id);
      await saveSalatSoundPreference(s.id);
      setSalatModalVisible(false);

      // ✅ re-schedule if enabled
      try {
        if (await isSalatEnabled()) {
          await refreshSalatSchedule();
        }
      } catch { }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [stopPreview]
  );

  const toggleAdhan = useCallback(async () => {
    setBusy(true);
    try {
      if (adhanEnabled) {
        await setAdhanEnabled(false);
        setAdhanEnabledState(false);
        await resetAllNotificationsAndAlarms();
        await stopAdhan();
        Alert.alert("تم", "تم إيقاف خاصية الآذان ✅");
      } else {
        await setAdhanEnabled(true);
        setAdhanEnabledState(true);
        await refreshPrayerSchedule({ daysAhead: 5 });
        Alert.alert("تم", "تم تشغيل خاصية الآذان ✅");
      }
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث الإعداد.");
    } finally {
      setBusy(false);
    }
  }, [adhanEnabled]);

  const resync = useCallback(
    async (forceGps = false) => {
      if (!adhanEnabled) {
        Alert.alert("موقوف", "خاصية الآذان موقوفة. قم بتشغيلها أولاً.");
        return;
      }

      setBusy(true);
      try {
        await refreshPrayerSchedule({ daysAhead: 5, forceGps });
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("تم", "تم التحديث بنجاح ✅");
      } catch {
        Alert.alert("خطأ", "تأكد من صلاحيات الموقع.");
      } finally {
        setBusy(false);
      }
    },
    [adhanEnabled]
  );

  const testAdhan = useCallback(async () => {
    if (!adhanEnabled) {
      Alert.alert("موقوف", "خاصية الآذان موقوفة. قم بتشغيلها أولاً.");
      return;
    }

    setBusy(true);
    try {
      await scheduleTestAzan(5);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم", "سيعمل الأذان خلال 5 ثواني ⏳");
    } catch {
      Alert.alert("خطأ", "تحقق من الإشعارات.");
    } finally {
      setBusy(false);
    }
  }, [adhanEnabled]);

  // ✅ Salat handlers
  const toggleSalatEnabled = useCallback(async () => {
    setBusy(true);
    try {
      const next = !salatEnabled;
      await setSalatEnabled(next);
      setSalatEnabledState(next);

      await refreshSalatSchedule();

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم", next ? "تم تشغيل صلي على محمد ✅" : "تم إيقاف صلي على محمد ✅");
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث إعداد صلي على محمد.");
    } finally {
      setBusy(false);
    }
  }, [salatEnabled]);

  const applySalatInterval = useCallback(async (min: number) => {
    const safe = Math.max(1, Math.min(Math.floor(min), 24 * 60));
    setBusy(true);
    try {
      await setSalatIntervalMinutes(safe);
      setSalatIntervalMinState(safe);
      setCustomIntervalText(String(safe));
      setSalatIntervalModalVisible(false);

      await refreshSalatSchedule();

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم", `تم ضبط التكرار كل ${safe} دقيقة ✅`);
    } catch {
      Alert.alert("خطأ", "تعذر حفظ التكرار.");
    } finally {
      setBusy(false);
    }
  }, []);

  const testSalat = useCallback(async () => {
    setBusy(true);
    try {
      await scheduleTestSalat(5);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم", 'سيعمل "صلي على محمد" خلال 5 ثواني ⏳');
    } catch {
      Alert.alert("خطأ", "تأكد أن الميزة مُفعلة وأن الإشعارات مسموحة.");
    } finally {
      setBusy(false);
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert("تأكيد المسح", "هل أنت متأكد من مسح كل الجدولة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "مسح",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await Notifications.dismissAllNotificationsAsync();
            await Notifications.cancelAllScheduledNotificationsAsync();
            Alert.alert("تم", "تم تنظيف الإشعارات ✅");
          } catch {
            Alert.alert("خطأ", "فشل المسح.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, []);

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch { }
  };

  const onPickAutoLocation = async () => {
    setLocationMode("auto");
    setLocationName("تلقائي (GPS)");
    setLocationModalVisible(false);

    try {
      await saveLocationPreference("auto");
      if (adhanEnabled) await resync(true);
    } catch { }
  };

  const onPickCity = async (city: City) => {
    setLocationMode("manual");
    setLocationName(city.name);
    setLocationModalVisible(false);

    try {
      await saveLocationPreference("manual", {
        lat: city.lat,
        lng: city.lng,
        name: city.name,
      });
      if (adhanEnabled) await resync(false);
    } catch { }
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.sheetBg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40 + insets.bottom,
          paddingTop: insets.top + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText
            weight="bold"
            style={{
              fontSize: scale(30),
              color: colors.text,
              textAlign: "left",
              lineHeight: scale(42),
              paddingVertical: 6,
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
            }}
          >
            الإعدادات
          </ThemedText>

          {fontsReady === false && (
            <ThemedText style={{ marginTop: 8, color: colors.textMuted2, textAlign: "left" }}>
              جاري تحميل الخطوط...
            </ThemedText>
          )}
        </View>

        {/* Appearance */}
        <View style={styles.sectionWrapper}>
          <SectionHeader title="تخصيص المظهر" />
          <SectionContainer>
            {/* Theme mode */}
            <View style={styles.appearanceRow}>
              <ThemedText style={{ fontSize: scale(14), fontWeight: "800", color: colors.text, textAlign: "left" }}>
                وضع المظهر
              </ThemedText>

              <View style={styles.pillsRow}>
                {THEME_MODES.map((m) => {
                  const selected = themeMode === m;
                  return (
                    <ThemedButton
                      key={m}
                      title={MODE_LABEL[m]}
                      onPress={() => setThemeMode(m)}
                      style={[
                        styles.pill,
                        {
                          borderColor: selected ? primaryColor : colors.border,
                          backgroundColor: selected ? primaryColor : "transparent",
                        },
                      ]}
                      pressedStyle={{ transform: [{ scale: 0.98 }], opacity: 0.9 }}
                      titleStyle={{
                        color: selected ? "#FFF" : colors.text,
                        fontWeight: "900",
                        fontSize: scale(12),
                      }}
                    />
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Color Picker Button */}
            <View style={styles.appearanceRow}>
              <ThemedText style={{ fontSize: scale(14), fontWeight: "800", color: colors.text, textAlign: "left" }}>
                لون التطبيق
              </ThemedText>

              <ThemedPressable
                onPress={() => setColorModalVisible(true)}
                style={[styles.colorPickBtn, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
                pressedStyle={{ opacity: 0.9 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
                  <ThemedText style={{ color: colors.text, fontWeight: "900" }}>{primaryColor}</ThemedText>
                </View>

                <MaterialCommunityIcons name="chevron-left" size={20} color={colors.textMuted2} />
              </ThemedPressable>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Font size slider */}
            <View style={styles.appearanceRow}>
              <ThemedText style={{ fontSize: scale(14), fontWeight: "800", color: colors.text, textAlign: "left" }}>
                حجم الخط: {fontSize}
              </ThemedText>

              <Slider
                style={{ width: "100%", marginTop: 10 }}
                minimumValue={10}
                maximumValue={28}
                step={1}
                value={fontSize}
                onValueChange={(v) => setFontSize(Math.round(v))}
                minimumTrackTintColor={primaryColor}
                maximumTrackTintColor={colors.divider}
                thumbTintColor={primaryColor}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 6 }}>
                <ThemedText style={{ color: colors.textMuted2, fontSize: scale(11) }}>10</ThemedText>
                <ThemedText style={{ color: colors.textMuted2, fontSize: scale(11) }}>28</ThemedText>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Font types */}
            <View style={styles.appearanceRow}>
              <ThemedText style={{ fontSize: scale(14), fontWeight: "800", color: colors.text, textAlign: "left" }}>
                نوع الخط
              </ThemedText>

              <View style={styles.pillsRow}>
                {FONT_TYPES.map((f) => {
                  const selected = fontType === (f as any);
                  return (
                    <ThemedButton
                      key={f}
                      title={FONT_LABEL[f]}
                      onPress={() => setFontType(f as any)}
                      style={[
                        styles.pill,
                        {
                          borderColor: selected ? primaryColor : colors.border,
                          backgroundColor: selected ? primaryColor : "transparent",
                        },
                      ]}
                      pressedStyle={{ transform: [{ scale: 0.98 }], opacity: 0.9 }}
                      titleStyle={{
                        color: selected ? "#FFF" : colors.text,
                        fontWeight: "900",
                        fontSize: scale(12),
                      }}
                    />
                  );
                })}
              </View>

              <ThemedText style={{ marginTop: 10, color: colors.textMuted, textAlign: "left" }}>
                التغيير يظهر فورًا في كل الشاشات.
              </ThemedText>
            </View>
          </SectionContainer>
        </View>

        {/* Location */}
        <View style={styles.sectionWrapper}>
          <SectionHeader title="الموقع الجغرافي" />
          <SectionContainer>
            <SettingRow
              isLast
              icon="map-marker-radius"
              title="تحديد الموقع"
              subtitle={locationName}
              onPress={() => setLocationModalVisible(true)}
              right={
                <View style={[styles.badge, { backgroundColor: primaryColor + "20" }]}>
                  <ThemedText style={{ color: primaryColor, fontSize: scale(11), fontWeight: "900" }}>
                    {locationMode === "auto" ? "GPS" : "يدوي"}
                  </ThemedText>
                </View>
              }
            />
          </SectionContainer>
        </View>

        {/* Azan */}
        <View style={styles.sectionWrapper}>
          <SectionHeader title="إعدادات الآذان" />
          <SectionContainer>
            <SettingRow
              icon={adhanEnabled ? "bell-ring" : "bell-off"}
              title={adhanEnabled ? "إيقاف خاصية الآذان" : "تشغيل خاصية الآذان"}
              subtitle={adhanEnabled ? "الآذان يعمل وسيتم جدولة الصلوات" : "الآذان متوقف ولن يتم تشغيله"}
              onPress={toggleAdhan}
              right={
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: adhanEnabled ? colors.danger + "20" : primaryColor + "20" },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: adhanEnabled ? colors.danger : primaryColor,
                      fontSize: scale(11),
                      fontWeight: "900",
                    }}
                  >
                    {adhanEnabled ? "مُفعل" : "موقوف"}
                  </ThemedText>
                </View>
              }
            />

            <SettingRow
              icon="volume-high"
              title="المؤذن"
              subtitle={soundLabel}
              onPress={() => setSoundModalVisible(true)}
              disabled={!adhanEnabled}
            />

            <SettingRow
              icon="calendar-sync"
              title="تحديث المواقيت"
              subtitle="إعادة حساب وجدولة الصلوات"
              onPress={() => resync(false)}
              loading={busy}
              disabled={!adhanEnabled}
            />

            <SettingRow
              isLast
              icon="play-circle-outline"
              title="تجربة الصوت"
              subtitle="تشغيل أذان تجريبي الآن"
              onPress={testAdhan}
              loading={busy}
              disabled={!adhanEnabled}
            />
          </SectionContainer>
        </View>

        {/* ✅ Salat */}
        <View style={styles.sectionWrapper}>
          <SectionHeader title="صلي على محمد" />
          <SectionContainer>
            <SettingRow
              icon={salatEnabled ? "bell-ring" : "bell-off"}
              title={salatEnabled ? "إيقاف صلي على محمد" : "تشغيل صلي على محمد"}
              subtitle={
                Platform.OS === "android"
                  ? salatEnabled
                    ? `مُفعل • التكرار كل ${salatIntervalMin} دقيقة`
                    : "متوقف"
                  : "متاح حالياً على Android فقط"
              }
              onPress={toggleSalatEnabled}
              loading={busy}
              right={
                <View style={[styles.badge, { backgroundColor: salatEnabled ? primaryColor + "20" : colors.divider }]}>
                  <ThemedText
                    style={{
                      color: salatEnabled ? primaryColor : colors.textMuted2,
                      fontSize: scale(11),
                      fontWeight: "900",
                    }}
                  >
                    {salatEnabled ? "مُفعل" : "موقوف"}
                  </ThemedText>
                </View>
              }
            />

            <SettingRow
              icon="timer-cog-outline"
              title="تحديد التكرار"
              subtitle={`كل ${salatIntervalMin} دقيقة`}
              onPress={() => setSalatIntervalModalVisible(true)}
              disabled={!salatEnabled || Platform.OS !== "android"}
            />

            <SettingRow
              icon="music-note"
              title="اختيار الصوت"
              subtitle={salatSoundLabel}
              onPress={() => setSalatModalVisible(true)}
              disabled={!salatEnabled}
            />

            <SettingRow
              icon="play-circle-outline"
              title="تجربة الصوت"
              subtitle='تشغيل "صلي على محمد" تجريبي'
              onPress={testSalat}
              loading={busy}
              disabled={!salatEnabled || Platform.OS !== "android"}
            />


          </SectionContainer>
        </View>

        {/* System */}
        <View style={styles.sectionWrapper}>
          <SectionHeader title="النظام والموثوقية" />
          <SectionContainer>
            {Platform.OS === "android" && (
              <>
                <SettingRow
                  icon="battery-charging-high"
                  title="تحسين البطارية"
                  subtitle="منع النظام من إيقاف الأذان"
                  onPress={async () => {
                    try {
                      await IntentLauncher.startActivityAsync("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
                    } catch {
                      openAppSettings();
                    }
                  }}
                />
                <SettingRow
                  icon="alarm-check"
                  title="المنبه الدقيق"
                  subtitle="السماح بالتنبيهات الدقيقة (Android 12+)"
                  onPress={async () => {
                    try {
                      await IntentLauncher.startActivityAsync("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
                    } catch {
                      openAppSettings();
                    }
                  }}
                />
              </>
            )}

            <SettingRow
              isLast={Platform.OS !== "android"}
              icon="cog-outline"
              title="أذونات التطبيق"
              subtitle="الإشعارات والموقع"
              onPress={openAppSettings}
            />
          </SectionContainer>
        </View>

        {/* Others */}
        <View style={styles.sectionWrapper}>
          <SectionHeader title="خيارات أخرى" />
          <SectionContainer>
            <SettingRow
              icon="lightbulb-on-outline"
              title="نصائح الاستخدام"
              right={
                <Switch
                  value={showTips}
                  onValueChange={(v) => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    setShowTips(v);
                  }}
                  trackColor={{ false: colors.divider, true: primaryColor }}
                  thumbColor={"#FFF"}
                />
              }
            />

            <SettingRow
              icon="trash-can-outline"
              title="حذف الجدولة"
              subtitle="إلغاء جميع التنبيهات القادمة"
              danger
              onPress={clearAllNotifications}
              loading={busy}
            />

            <SettingRow
              isLast
              icon="information-outline"
              title="الإصدار"
              right={
                <ThemedText style={{ color: colors.textMuted2, fontSize: scale(13), fontWeight: "800" }}>
                  {versionLabel}
                </ThemedText>
              }
            />
          </SectionContainer>
        </View>

        <ThemedText style={[styles.footerText, { color: colors.textMuted }]}>
          {Platform.OS === "android"
            ? "تنويه: أجهزة Xiaomi/Oppo تتطلب تفعيل Autostart يدويًا."
            : "تأكد من عدم تفعيل وضع الصامت لسماع الأذان."}
        </ThemedText>
      </ScrollView>

      {/* COLOR PICKER MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={colorModalVisible}
        onRequestClose={() => setColorModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>اختر لون التطبيق</ThemedText>

            <View style={{ paddingHorizontal: 16, paddingBottom: 12 + insets.bottom }}>
              <ColorPicker value={tempColor} onCompleteJS={onPickColor} style={{ width: "100%" }}>
                <Preview hideInitialColor />
                <Panel1 style={{ marginTop: 12, borderRadius: 16 }} />
                <HueSlider style={{ marginTop: 12, borderRadius: 10 }} />
                <OpacitySlider style={{ marginTop: 12, borderRadius: 10 }} />
              </ColorPicker>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                <ThemedButton
                  title="إلغاء"
                  onPress={() => setColorModalVisible(false)}
                  style={[styles.modalBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  pressedStyle={{ opacity: 0.9 }}
                  titleStyle={{ color: colors.text, fontWeight: "900" }}
                />

                <ThemedButton
                  title="تطبيق"
                  onPress={() => {
                    setColor(tempColor);
                    setColorModalVisible(false);
                  }}
                  style={[styles.modalBtn, { backgroundColor: tempColor, borderColor: tempColor }]}
                  pressedStyle={{ opacity: 0.9 }}
                  titleStyle={{ color: "#FFF", fontWeight: "900" }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* AZAN SOUND MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={soundModalVisible}
        onRequestClose={() => setSoundModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>اختر المؤذن</ThemedText>

            <FlatList
              data={AZAN_SOUNDS}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isSelected = soundId === item.id;
                const isPlaying = previewKey === item.id;

                return (
                  <ThemedPressable
                    onPress={() => onSelectSound(item)}
                    style={[
                      styles.modalItem,
                      {
                        borderColor: isSelected ? primaryColor : colors.divider,
                        backgroundColor: isSelected ? primaryColor + "10" : "transparent",
                      },
                    ]}
                    pressedStyle={{ opacity: 0.9 }}
                    disabled={!adhanEnabled}
                  >
                    <ThemedPressable
                      onPress={() => playPreviewFrom(AZAN_SOUND_MAP, item.id)}
                      style={styles.playBtn}
                      pressedStyle={{ opacity: 0.85 }}
                      haptic={false}
                      disabled={!adhanEnabled}
                    >
                      <MaterialCommunityIcons
                        name={isPlaying ? "stop-circle" : "play-circle"}
                        size={34}
                        color={isPlaying ? colors.danger : primaryColor}
                      />
                    </ThemedPressable>

                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <ThemedText
                        style={{
                          color: colors.text,
                          fontWeight: isSelected ? "900" : "700",
                          fontSize: scale(14),
                          textAlign: "left",
                        }}
                      >
                        {item.name}
                      </ThemedText>

                      <ThemedText
                        style={{ color: colors.textMuted, fontSize: scale(12), marginTop: 2, textAlign: "left" }}
                      >
                        {isSelected ? "المؤذن الحالي" : "اضغط للاختيار"}
                      </ThemedText>
                    </View>

                    <View style={[styles.radioCircle, { borderColor: isSelected ? primaryColor : colors.textMuted2 }]}>
                      {isSelected && <View style={[styles.radioFill, { backgroundColor: primaryColor }]} />}
                    </View>
                  </ThemedPressable>
                );
              }}
            />

            <ThemedButton
              title="إغلاق"
              onPress={() => {
                stopPreview();
                setSoundModalVisible(false);
              }}
              style={[styles.closeBtn, { backgroundColor: colors.cardBg }]}
              pressedStyle={{ opacity: 0.9 }}
              titleStyle={{ color: colors.text, fontWeight: "900", fontSize: scale(14) }}
            />
          </View>
        </View>
      </Modal>

      {/* ✅ SALAT SOUND MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={salatModalVisible}
        onRequestClose={() => setSalatModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>اختر صوت "صلي على محمد"</ThemedText>

            <FlatList
              data={SALAT_SOUNDS}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isSelected = salatSoundId === item.id;
                const isPlaying = previewKey === item.id;

                return (
                  <ThemedPressable
                    onPress={() => onSelectSalatSound(item)}
                    style={[
                      styles.modalItem,
                      {
                        borderColor: isSelected ? primaryColor : colors.divider,
                        backgroundColor: isSelected ? primaryColor + "10" : "transparent",
                      },
                    ]}
                    pressedStyle={{ opacity: 0.9 }}
                  >
                    <ThemedPressable
                      onPress={() => playPreviewFrom(SALAT_SOUND_MAP, item.id)}
                      style={styles.playBtn}
                      pressedStyle={{ opacity: 0.85 }}
                      haptic={false}
                    >
                      <MaterialCommunityIcons
                        name={isPlaying ? "stop-circle" : "play-circle"}
                        size={34}
                        color={isPlaying ? colors.danger : primaryColor}
                      />
                    </ThemedPressable>

                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <ThemedText
                        style={{
                          color: colors.text,
                          fontWeight: isSelected ? "900" : "700",
                          fontSize: scale(14),
                          textAlign: "left",
                        }}
                      >
                        {item.name}
                      </ThemedText>

                      <ThemedText
                        style={{ color: colors.textMuted, fontSize: scale(12), marginTop: 2, textAlign: "left" }}
                      >
                        {isSelected ? "الصوت الحالي" : "اضغط للاختيار"}
                      </ThemedText>
                    </View>

                    <View style={[styles.radioCircle, { borderColor: isSelected ? primaryColor : colors.textMuted2 }]}>
                      {isSelected && <View style={[styles.radioFill, { backgroundColor: primaryColor }]} />}
                    </View>
                  </ThemedPressable>
                );
              }}
            />

            <ThemedButton
              title="إغلاق"
              onPress={() => {
                stopPreview();
                setSalatModalVisible(false);
              }}
              style={[styles.closeBtn, { backgroundColor: colors.cardBg }]}
              pressedStyle={{ opacity: 0.9 }}
              titleStyle={{ color: colors.text, fontWeight: "900", fontSize: scale(14) }}
            />
          </View>
        </View>
      </Modal>

      {/* ✅ SALAT INTERVAL MODAL (Keyboard-safe) */}
      <Modal
        animationType="slide"
        transparent
        visible={salatIntervalModalVisible}
        onRequestClose={() => setSalatIntervalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "position"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
              style={{ width: "100%" }}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.modalBg, maxHeight: "85%" }]}>
                <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>تحديد التكرار</ThemedText>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 + insets.bottom + 24 }}
                >
                  {/* Presets */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                    {[15, 30, 60, 120].map((m) => {
                      const selected = salatIntervalMin === m;
                      return (
                        <ThemedButton
                          key={m}
                          title={m === 60 ? "كل 1 ساعة" : m === 120 ? "كل 2 ساعة" : `كل ${m} دقيقة`}
                          onPress={() => applySalatInterval(m)}
                          style={[
                            styles.pill,
                            {
                              borderColor: selected ? primaryColor : colors.border,
                              backgroundColor: selected ? primaryColor : "transparent",
                            },
                          ]}
                          pressedStyle={{ transform: [{ scale: 0.98 }], opacity: 0.9 }}
                          titleStyle={{
                            color: selected ? "#FFF" : colors.text,
                            fontWeight: "900",
                            fontSize: scale(12),
                          }}
                        />
                      );
                    })}
                  </View>

                  {/* Custom */}
                  <ThemedText style={{ color: colors.textMuted2, fontWeight: "900", marginBottom: 8, textAlign: "left" }}>
                    أو اكتب عدد الدقائق
                  </ThemedText>

                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: colors.cardBg,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <TextInput
                      value={customIntervalText}

                      onChangeText={(t) => setCustomIntervalText(t.replace(/[^\d]/g, ""))}
                      keyboardType="number-pad"
                      placeholder="مثال: 45"
                      placeholderTextColor={colors.textMuted2}
                      returnKeyType="done"
                      blurOnSubmit
                      selectTextOnFocus
                      maxLength={4}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: scale(14),
                        textAlign: "left",
                      }}
                    />

                    <ThemedText style={{ color: colors.textMuted, fontWeight: "800" }}>دقيقة</ThemedText>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                    <ThemedButton
                      title="إلغاء"
                      onPress={() => setSalatIntervalModalVisible(false)}
                      style={[styles.modalBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                      pressedStyle={{ opacity: 0.9 }}
                      titleStyle={{ color: colors.text, fontWeight: "900" }}
                    />

                    <ThemedButton
                      title="تطبيق"
                      onPress={() => {
                        Keyboard.dismiss();
                        const n = Number(customIntervalText || "0");
                        applySalatInterval(n);
                      }}
                      style={[styles.modalBtn, { backgroundColor: primaryColor, borderColor: primaryColor }]}
                      pressedStyle={{ opacity: 0.9 }}
                      titleStyle={{ color: "#FFF", fontWeight: "900" }}
                    />
                  </View>

                  <ThemedText style={{ marginTop: 10, color: colors.textMuted, textAlign: "left", fontSize: scale(12) }}>
                    ملاحظة: أقل قيمة 1 دقيقة، وأقصى قيمة 1440 دقيقة.
                  </ThemedText>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </Modal>


      {/* LOCATION MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg, height: "70%" }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>تغيير الموقع</ThemedText>

            <ThemedPressable
              onPress={onPickAutoLocation}
              style={[styles.autoLocBtn, { backgroundColor: colors.cardBg, borderColor: primaryColor }]}
              pressedStyle={{ opacity: 0.9 }}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color={primaryColor} />
              <View style={{ marginLeft: 10 }}>
                <ThemedText style={{ color: primaryColor, fontWeight: "900", fontSize: scale(14), textAlign: "left" }}>
                  تحديد تلقائي (GPS)
                </ThemedText>
                <ThemedText style={{ color: colors.textMuted, fontSize: scale(12), marginTop: 2, textAlign: "left" }}>
                  الأكثر دقة للمواقيت
                </ThemedText>
              </View>
            </ThemedPressable>

            <ThemedText
              style={{
                paddingHorizontal: 16,
                marginTop: 10,
                color: colors.textMuted2,
                fontWeight: "800",
                fontSize: scale(13),
                textAlign: "left",
              }}
            >
              أو اختر محافظة
            </ThemedText>

            <FlatList
              data={EGYPT_CITIES}
              keyExtractor={(i) => i.nameEn}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <ThemedPressable
                  onPress={() => onPickCity(item)}
                  style={[styles.cityRow, { borderBottomColor: colors.divider }]}
                  pressedStyle={{ opacity: 0.9 }}
                >
                  <ThemedText
                    style={{ fontSize: scale(15), fontWeight: "800", color: colors.text, textAlign: "left" }}
                  >
                    {item.name}
                  </ThemedText>
                  <MaterialCommunityIcons name="chevron-left" size={20} color={colors.textMuted2} />
                </ThemedPressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: "flex-start",
    paddingTop: 2,
  },

  sectionWrapper: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },

  sectionContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  appearanceRow: { padding: 16, alignItems: "flex-start" },

  pillsRow: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  pill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  divider: { height: 1, marginHorizontal: 16 },

  colorPickBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },

  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },

  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  rowRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  spin: {
    transform: [{ rotate: "45deg" }],
  },

  footerText: {
    textAlign: "center",
    fontSize: 12,
    paddingHorizontal: 30,
    lineHeight: 18,
    opacity: 0.7,
    marginBottom: 20,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },

  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 16,
    opacity: 0.5,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },

  modalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },

  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },

  playBtn: { padding: 5 },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginLeft: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  closeBtn: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },

  autoLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },

  cityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
