import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  I18nManager,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ThemedText from "../../components/ThemedText";
import { useTheme } from "../../utils/ThemeContext";

// --- RTL Configuration ---
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// --- Dimensions ---
const { width } = Dimensions.get("window");
const COMPASS_SIZE = width * 0.8;
const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

// --- Math ---
function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}
function rad2deg(r: number) {
  return (r * 180) / Math.PI;
}

function bearingToKaaba(lat: number, lng: number) {
  const φ1 = deg2rad(lat);
  const φ2 = deg2rad(KAABA_COORDS.lat);
  const Δλ = deg2rad(KAABA_COORDS.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (rad2deg(Math.atan2(y, x)) + 360) % 360;
}

// --- Components ---
const KaabaIcon = ({ accent }: { accent: string }) => (
  <View style={styles.kaabaBox}>
    <View style={[styles.kaabaBand, { backgroundColor: accent }]} />
  </View>
);

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { scale, colors, isDark, primaryColor } = useTheme();

  /**
   * ✅ Dynamic palette driven by ThemeContext
   * - accent = your picked color (primaryColor / colors.primary)
   * - background/card/text adapt to light/dark
   */
  const C = useMemo(() => {
    const accent = primaryColor ?? colors.primary;
    const bg = isDark ? (colors.sheetBg ?? "#05060a") : (colors.sheetBg ?? "#f7f7fb");
    const text = colors.text ?? (isDark ? "#fff" : "#111");
    const muted = colors.textMuted ?? (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)");
    const subtle = colors.textMuted2 ?? (isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)");

    const cardBg = colors.cardBg ?? (isDark ? "rgba(20,20,20,0.85)" : "rgba(255,255,255,0.88)");
    const cardBorder = colors.border ?? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");

    const danger = colors.danger ?? "#FF4444";
    const success = (colors as any).success ?? "#4ADE80";

    return {
      accent,
      bg,
      text,
      muted,
      subtle,
      cardBg,
      cardBorder,
      danger,
      success,

      // compass fixed colors (keep nice contrast)
      bezelBg: isDark ? "#111" : "#fff",
      bezelBorder: isDark ? "#333" : "rgba(0,0,0,0.15)",
      tickMinor: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.20)",
      shadow: colors.shadow ?? "#000",
    };
  }, [colors, isDark, primaryColor]);

  // State
  const [hasPermission, setHasPermission] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [headingState, setHeadingState] = useState(0);
  const [isAligned, setIsAligned] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animations
  const compassAnim = useRef(new Animated.Value(0)).current;
  const currentCompassVal = useRef(0);
  const lastHaptic = useRef(0);

  const qiblaBearing = useMemo(() => {
    if (!coords) return 0;
    return bearingToKaaba(coords.lat, coords.lng);
  }, [coords]);

  // Alignment Logic (Tolerance: 3 degrees)
  const isAlignedCalc = Math.abs(((qiblaBearing - headingState + 540) % 360) - 180) < 3;

  useEffect(() => {
    if (isAlignedCalc !== isAligned) {
      setIsAligned(isAlignedCalc);
      if (isAlignedCalc && Date.now() - lastHaptic.current > 1000) {
        Vibration.vibrate(50);
        lastHaptic.current = Date.now();
      }
    }
  }, [isAlignedCalc, isAligned]);

  useEffect(() => {
    let headingSub: Location.LocationSubscription | null = null;
    let locationSub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("يرجى تفعيل خدمة الموقع للإستمرار");
        return;
      }
      setHasPermission(true);

      locationSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (loc) => {
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      );

      headingSub = await Location.watchHeadingAsync((obj) => {
        const heading = obj.trueHeading >= 0 ? obj.trueHeading : obj.magHeading;
        setHeadingState(heading);

        const target = -heading;
        let nextVal = target;
        const diff = target - currentCompassVal.current;

        if (Math.abs(diff) > 180) {
          if (diff > 0) nextVal -= 360;
          else nextVal += 360;
        }

        Animated.timing(compassAnim, {
          toValue: nextVal,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        currentCompassVal.current = nextVal;
      });
    })();

    return () => {
      headingSub?.remove();
      locationSub?.remove();
    };
  }, [compassAnim]);

  const renderCompassFace = () => {
    return (
      <View style={styles.faceContainer}>
        {/* Ticks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const angle = i * 5;
          const isCardinal = i % 18 === 0; // N, E, S, W
          const isMajor = i % 6 === 0; // Every 30 deg

          return (
            <View key={i} style={[styles.tickWrap, { transform: [{ rotate: `${angle}deg` }] }]}>
              <View
                style={[
                  styles.tick,
                  {
                    height: isCardinal ? 18 : isMajor ? 12 : 6,
                    width: isCardinal ? 3 : 1,
                    backgroundColor: isCardinal ? C.accent : C.tickMinor,
                  },
                ]}
              />
            </View>
          );
        })}

        {/* Cardinal Words */}
        <View style={[styles.cardinalWrap, { top: 40 }]}>
          <ThemedText
            weight="bold"
            style={{
              color: C.danger,
              fontSize: scale(16),
              lineHeight: scale(22),
              paddingVertical: 2,
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
              textShadowColor: "black",
              textShadowRadius: 3,
            }}
          >
            شمال
          </ThemedText>
        </View>

        <View style={[styles.cardinalWrap, { bottom: 40 }]}>
          <ThemedText
            weight="bold"
            style={{
              color: C.text,
              fontSize: scale(16),
              lineHeight: scale(22),
              paddingVertical: 2,
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
              textShadowColor: "black",
              textShadowRadius: 3,
            }}
          >
            جنوب
          </ThemedText>
        </View>

        <View style={[styles.cardinalWrap, { right: 40 }]}>
          <ThemedText
            weight="bold"
            style={{
              color: C.text,
              fontSize: scale(16),
              lineHeight: scale(22),
              paddingVertical: 2,
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
              textShadowColor: "black",
              textShadowRadius: 3,
            }}
          >
            شرق
          </ThemedText>
        </View>

        <View style={[styles.cardinalWrap, { left: 40 }]}>
          <ThemedText
            weight="bold"
            style={{
              color: C.text,
              fontSize: scale(16),
              lineHeight: scale(22),
              paddingVertical: 2,
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
              textShadowColor: "black",
              textShadowRadius: 3,
            }}
          >
            غرب
          </ThemedText>
        </View>
      </View>
    );
  };

  if (!hasPermission && !errorMsg) {
    return (
      <View style={[styles.centerLoader, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <ThemedText style={{ color: C.text, marginTop: 10, textAlign: "center" }}>
          جاري البحث عن الموقع...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ImageBackground source={require("../../assets/qibla3.png")} style={styles.bgImage} resizeMode="cover">
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <ThemedText
              weight="bold"
              style={{
                fontSize: scale(28),
                color: C.text,
                textAlign: "center",
                lineHeight: scale(40),
                paddingVertical: 6,
                ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
              }}
            >
            </ThemedText>

            <View
              style={[
                styles.coordsBadge,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.10)",
                  borderColor: C.cardBorder,
                },
              ]}
            >
              <Ionicons name="location" size={12} color={C.accent} />
              <ThemedText
                style={{
                  color: C.subtle,
                  fontSize: scale(12),
                  lineHeight: scale(16),
                  paddingVertical: 2,
                  textAlign: "left",
                }}
              >
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "--"}
              </ThemedText>
            </View>
          </View>

          {/* COMPASS */}
          <View style={styles.compassSection}>
            <View style={styles.topArrowContainer}>
              <FontAwesome5 name="caret-down" size={40} color={isAligned ? C.success : C.accent} />
            </View>

            <View
              style={[
                styles.compassBezel,
                {
                  backgroundColor: C.bezelBg,
                  borderColor: isAligned ? C.success : C.bezelBorder,
                  shadowColor: isAligned ? C.success : C.shadow,
                },
                isAligned && styles.compassBezelAligned,
              ]}
            >
              <Animated.View
                style={[
                  styles.compassDial,
                  {
                    transform: [
                      {
                        rotate: compassAnim.interpolate({
                          inputRange: [-360, 0, 360],
                          outputRange: ["-360deg", "0deg", "360deg"],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {renderCompassFace()}

                <View style={[styles.qiblaLayer, { transform: [{ rotate: `${qiblaBearing}deg` }] }]}>
                  <View style={styles.kaabaContainer}>
                    <KaabaIcon accent={C.accent} />
                  </View>

                  <View style={[styles.qiblaLine, { backgroundColor: isAligned ? C.success : C.accent }]} />
                </View>
              </Animated.View>

              <View style={[styles.crosshair, { backgroundColor: C.accent }]} />
            </View>
          </View>

          {/* FOOTER */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: C.cardBg,
                borderColor: C.cardBorder,
              },
            ]}
          >
            <View style={styles.statBox}>
              <ThemedText style={{ color: C.muted, fontSize: scale(12), marginBottom: 4, textAlign: "center" }}>
                زاوية القبلة
              </ThemedText>
              <ThemedText weight="bold" style={{ color: C.accent, fontSize: scale(24), textAlign: "center" }}>
                {Math.round(qiblaBearing)}°
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: C.cardBorder }]} />

            <View style={styles.statBox}>
              <ThemedText style={{ color: C.muted, fontSize: scale(12), marginBottom: 4, textAlign: "center" }}>
                اتجاهك الحالي
              </ThemedText>
              <ThemedText weight="bold" style={{ color: C.accent, fontSize: scale(24), textAlign: "center" }}>
                {Math.round(headingState)}°
              </ThemedText>
            </View>
          </View>

          <ThemedText
            style={{
              marginTop: 10,
              fontSize: scale(14),
              color: isAligned ? C.success : C.muted,
              textAlign: "center",
            }}
          >
            {isAligned ? "القبلة صحيحة تماماً " : "قم بتدوير الهاتف للبحث عن القبلة"}
          </ThemedText>

          {errorMsg && (
            <Pressable
              onPress={Linking.openSettings}
              style={[
                styles.errBtn,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
                  borderColor: C.cardBorder,
                },
              ]}
            >
              <ThemedText style={[styles.errText, { color: C.text }]}>{errorMsg}</ThemedText>
            </Pressable>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  bgImage: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  centerLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    alignItems: "center",
    height: 90,
    justifyContent: "center",
  },

  coordsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
  },

  compassSection: {
    alignItems: "center",
    justifyContent: "center",
    height: width * 0.9,
    width: width,
  },
  topArrowContainer: {
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  compassBezel: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 20,
  },
  compassBezelAligned: {
    shadowOpacity: 0.5,
  },
  compassDial: {
    width: "100%",
    height: "100%",
  },
  faceContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  tickWrap: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    top: 0,
    left: 0,
  },
  tick: {
    marginTop: 10,
    borderRadius: 2,
  },
  cardinalWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  qiblaLayer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 5,
  },

  kaabaContainer: {
    marginTop: 45,
    marginBottom: 5,
    zIndex: 10,
  },

  kaabaBox: {
    width: 28,
    height: 32,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 5,
  },

  kaabaBand: {
    width: "100%",
    height: 6,
    marginTop: -10,
  },

  qiblaLine: {
    width: 3,
    height: COMPASS_SIZE / 2 - 82,
    borderRadius: 2,
  },

  crosshair: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 20,
    borderWidth: 2,
    borderColor: "#000",
  },

  footer: {
    flexDirection: "row",
    width: width * 0.9,
    paddingVertical: 15,
    borderRadius: 20,
    justifyContent: "space-evenly",
    borderWidth: 1,
  },
  statBox: {
    alignItems: "center",
    minWidth: 100,
  },
  divider: {
    width: 1,
    height: "80%",
  },

  errBtn: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  errText: { textAlign: "center" },
});
