import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  View,
  FlatList,
} from "react-native";

import { useTheme } from "../../../utils/ThemeContext";
import ThemedText from "../../../components/ThemedText";
import { AZKAR_DATA } from "../../../constants/AzkarData";

// --- Types ---
type Zekr = { id: string; text: string; repeat?: number; fadila?: string };
type AzkarSection = { title: string; subtitle: string; items: Zekr[] };

// --- ProgressHeader ---
function ProgressHeader({
  total,
  completed,
  title,
  subtitle,
  colors,
  primaryColor,
  scale,
}: any) {
  const progressPct = total > 0 ? (completed / total) * 100 : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progressPct,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressPct, widthAnim]);

  return (
    <View style={styles.headerRoot}>
      <LinearGradient
        colors={[colors.cardBg, colors.sheetBg]}
        style={[
          styles.headerGradient,
          {
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <ThemedText
              weight="bold"
              style={[
                styles.headerTitle,
                {
                  color: colors.text,
                  fontSize: scale(24),
                  lineHeight: scale(34),
                  paddingVertical: 4,
                  ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
                },
              ]}
              numberOfLines={2}
            >
              {title}
            </ThemedText>

            {!!subtitle && (
              <ThemedText
                style={[
                  styles.headerSub,
                  {
                    color: colors.textMuted,
                    fontSize: scale(12),
                    lineHeight: scale(18),
                    paddingVertical: 2,
                    ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
                  },
                ]}
                numberOfLines={2}
              >
                {subtitle}
              </ThemedText>
            )}
          </View>

          <View style={[styles.iconBox, { backgroundColor: primaryColor + "15" }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={22} color={primaryColor} />
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: widthAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: primaryColor,
                },
              ]}
            />
          </View>

          <ThemedText style={[styles.progressText, { color: colors.textMuted, fontSize: scale(11) }]}>
            {completed} / {total}
          </ThemedText>
        </View>
      </LinearGradient>
    </View>
  );
}

// --- ZekrCard ---
function ZekrCard({ item, colors, primaryColor, scale, onDoneOnce }: any) {
  const totalRepeats = Math.max(1, item.repeat ?? 1);
  const [count, setCount] = useState(totalRepeats);
  const [done, setDone] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const doneReportedRef = useRef(false);

  useEffect(() => {
    setCount(totalRepeats);
    setDone(false);
    doneReportedRef.current = false;
    fillAnim.setValue(0);
    scaleAnim.setValue(1);
  }, [item.id, totalRepeats, fillAnim, scaleAnim]);

  const handlePress = useCallback(async () => {
    if (done) return;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.98, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();

    setCount((prev: number) => {
      const next = Math.max(0, prev - 1);
      const progress = (totalRepeats - next) / totalRepeats;

      Animated.timing(fillAnim, {
        toValue: progress,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      if (next === 0) {
        setDone(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        if (!doneReportedRef.current) {
          doneReportedRef.current = true;
          onDoneOnce();
        }
      }
      return next;
    });
  }, [done, totalRepeats, fillAnim, scaleAnim, onDoneOnce]);

  const fillFromSide = I18nManager.isRTL ? { right: 0 } : { left: 0 };

  return (
    <Pressable onPress={handlePress} style={styles.cardWrapper}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: done ? primaryColor + "55" : colors.border,
            transform: [{ scale: scaleAnim }],
            shadowColor: colors.shadow,
          },
        ]}
      >
        {!done && (
          <Animated.View
            style={[
              styles.fillBackground,
              fillFromSide,
              {
                // ✅ subtle fill using theme primary
                backgroundColor: primaryColor + "10",
                width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              },
            ]}
          />
        )}

        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.counterBadge,
                {
                  // ✅ remove colors.secondary completely
                  backgroundColor: done ? primaryColor : primaryColor,
                  opacity: done ? 1 : 0.9,
                },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              ) : (
                <ThemedText weight="bold" style={[styles.counterBadgeText, { fontSize: scale(13) }]}>
                  {count}
                </ThemedText>
              )}
            </View>
          </View>

          <ThemedText
            weight="regular"
            style={[
              styles.zekrText,
              {
                color: done ? colors.textMuted : colors.text,
                opacity: done ? 0.6 : 1,
                fontSize: scale(18),
                lineHeight: scale(32),
                paddingVertical: 4,
                ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
              },
            ]}
          >
            {item.text}
          </ThemedText>

          {item.fadila ? (
            <ThemedText
              style={[
                styles.fadilaContent,
                {
                  // ✅ fadila uses primary like header accent
                  color: primaryColor,
                  fontSize: scale(11),
                  lineHeight: scale(16),
                  paddingVertical: 2,
                },
              ]}
            >
              {item.fadila}
            </ThemedText>
          ) : (
            !done && (
              <ThemedText
                style={[
                  styles.tapHint,
                  { color: colors.textMuted, fontSize: scale(10), lineHeight: scale(14) },
                ]}
              >
                اضغط للتسبيح
              </ThemedText>
            )
          )}
        </View>

        {!done && totalRepeats > 1 && (
          <View style={[styles.bottomProgressTrack, { flexDirection: I18nManager.isRTL ? "row-reverse" : "row" }]}>
            <Animated.View
              style={{
                height: "100%",
                // ✅ remove colors.secondary completely
                backgroundColor: primaryColor,
                width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }}
            />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// --- Main Screen ---
export default function AzkarSlugScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors, primaryColor, scale } = useTheme();

  const data = useMemo<AzkarSection>(() => {
    return AZKAR_DATA[String(slug || "")] || { title: "القسم غير موجود", subtitle: "", items: [] };
  }, [slug]);

  const [completedCount, setCompletedCount] = useState(0);
  useEffect(() => {
    setCompletedCount(0);
  }, [slug]);

  const renderItem = useCallback(
    ({ item }: { item: Zekr }) => (
      <ZekrCard
        item={item}
        colors={colors}
        primaryColor={primaryColor}
        scale={scale}
        onDoneOnce={() => setCompletedCount((p) => p + 1)}
      />
    ),
    [colors, primaryColor, scale]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.sheetBg }]}>
      <Stack.Screen
        options={{
          headerTitle: "",
          headerTransparent: true,
          headerTintColor: colors.text,
        }}
      />

      <View style={{ paddingTop: 60, paddingBottom: 6 }}>
        <ProgressHeader
          total={data.items.length}
          completed={completedCount}
          title={data.title}
          subtitle={data.subtitle}
          colors={colors}
          primaryColor={primaryColor}
          scale={scale}
        />
      </View>

      <FlatList
        data={data.items}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.textMuted, textAlign: "center" }}>لا يوجد محتوى</ThemedText>
          </View>
        }
        ListFooterComponent={<View style={{ height: 90 }} />}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerRoot: { marginBottom: 8 },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  headerTitle: {
    fontWeight: "800",
    textAlign: "left",
  },
  headerSub: {
    fontWeight: "500",
    textAlign: "left",
    marginTop: 2,
    opacity: 0.8,
  },

  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  progressContainer: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 5, borderRadius: 10, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 10 },
  progressText: { fontWeight: "700" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  emptyState: { alignItems: "center", marginTop: 100 },

  cardWrapper: { marginBottom: 12 },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  fillBackground: { position: "absolute", top: 0, bottom: 0, zIndex: 0 },

  cardInner: { padding: 16, zIndex: 1 },

  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 8,
  },

  counterBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBadgeText: { color: "#FFF", fontWeight: "bold", textAlign: "center" },

  zekrText: {
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 10,
  },

  fadilaContent: { textAlign: "center", opacity: 0.9, fontStyle: "italic" },
  tapHint: { textAlign: "center", opacity: 0.5, marginTop: 4 },

  bottomProgressTrack: { height: 3, width: "100%", backgroundColor: "transparent" },
});
