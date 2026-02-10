// app/(tabs)/quran.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  loadQuran,
  loadSurahMeta,
  normalizeArabicForSearch,
  type QuranAyah,
  type QuranSurah,
  type SurahMeta,
} from "@/utils/quranData";

import ThemedText from "@/components/ThemedText";
import { getLastRead, setLastReadPage } from "@/utils/quranStore";
import { useTheme } from "@/utils/ThemeContext";

const { width } = Dimensions.get("window");

type Mode = "list" | "reader";

type QuranPage = {
  page: number;
  ayahs: QuranAyah[];
};

type LastReadInfo = {
  name: string;
  ayah: number;
  surahNum: number;
  page?: number;
  offsetInPage?: number;
};

// ---------- Tiny saved banner for iOS/Web ----------
function SavedBanner({
  visible,
  text,
  colors,
  primaryColor,
  topInset = 0,
}: any) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (Platform.OS === "android") return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        stylesSaved.banner,
        {
          top: topInset + 10,
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[stylesSaved.dot, { backgroundColor: primaryColor }]} />
      <ThemedText style={{ color: colors.text, fontWeight: "800" }}>{text}</ThemedText>
    </Animated.View>
  );
}

const stylesSaved = StyleSheet.create({
  banner: {
    position: "absolute",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    zIndex: 999,
  },
  dot: { width: 10, height: 10, borderRadius: 99 },
});

export default function QuranScreen() {
  const { colors, primaryColor, scale } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () => makeStyles(colors, primaryColor, scale),
    [colors, primaryColor, scale]
  );

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [meta, setMeta] = useState<SurahMeta[]>([]);
  const [quran, setQuran] = useState<QuranSurah[]>([]);
  const [query, setQuery] = useState("");
  const [currentSurah, setCurrentSurah] = useState<QuranSurah | null>(null);
  const [lastReadInfo, setLastReadInfo] = useState<LastReadInfo | null>(null);

  // Font controls
  const [fontSize, setFontSize] = useState(scale(22));
  const [fontFamily] = useState<string | undefined>(undefined);
  const lineHeight = useMemo(() => Math.round(fontSize * 2.05), [fontSize]);

  const pagesRef = useRef<FlatList<QuranPage>>(null);
  const pageTargetRef = useRef<number | null>(null);

  // Track current visible page + its scroll offset
  const lastVisiblePageRef = useRef<{ page: number; firstAyah: number } | null>(null);
  const lastOffsetRef = useRef<number>(0);

  // Saved toast/banner state
  const [savedVisible, setSavedVisible] = useState(false);
  const savedTimerRef = useRef<any>(null);

  const showSaved = useCallback((msg = "تم الحفظ") => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
      return;
    }
    setSavedVisible(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedVisible(false), 1200);
  }, []);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    try {
      const [m, q] = await Promise.all([loadSurahMeta(), loadQuran()]);
      setMeta(m);
      setQuran(q.surahs);
      await refreshLastRead(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLastRead(m: SurahMeta[]) {
    const lr = await getLastRead();
    if (!lr) {
      setLastReadInfo(null);
      return;
    }
    const s = m.find((x) => x.number === lr.surah);
    setLastReadInfo({
      name: s?.name_ar || "",
      ayah: lr.ayah,
      surahNum: lr.surah,
      page: lr.page,
      offsetInPage: lr.offsetInPage,
    });
  }

  const openSurah = (num: number, ayah = 1) => {
    const s = quran.find((x) => x.number === num);
    if (!s) return;

    if (lastReadInfo?.surahNum === num && lastReadInfo?.page) {
      pageTargetRef.current = lastReadInfo.page;
    } else {
      const a = s.ayahs?.[ayah - 1];
      pageTargetRef.current = typeof a?.page === "number" ? a.page : null;
    }

    setCurrentSurah(s);
    setMode("reader");
  };

  // LIST MODE
  const filtered = useMemo(() => {
    if (!query.trim()) return meta;
    const nq = normalizeArabicForSearch(query);
    return meta.filter(
      (s) => normalizeArabicForSearch(s.name_ar).includes(nq) || String(s.number) === nq
    );
  }, [meta, query]);

  // READER MODE pages
  const pages = useMemo<QuranPage[]>(() => {
    if (!currentSurah?.ayahs?.length) return [];

    const map = new Map<number, QuranAyah[]>();
    for (const a of currentSurah.ayahs) {
      const p = typeof a.page === "number" ? a.page : 0;
      if (!p) continue;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(a);
    }

    if (map.size === 0) return [{ page: 1, ayahs: currentSurah.ayahs }];

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([page, ayahs]) => ({ page, ayahs }));
  }, [currentSurah]);

  // Jump to target page when opening
  useEffect(() => {
    if (mode !== "reader" || !pages.length) return;

    const targetPage = pageTargetRef.current;
    pageTargetRef.current = null;

    if (targetPage == null) return;

    const idx = pages.findIndex((p) => p.page === targetPage);
    if (idx >= 0) {
      setTimeout(() => {
        pagesRef.current?.scrollToIndex({ index: idx, animated: false });
      }, 350);
    }
  }, [mode, pages]);

  // Viewability (which page is visible)
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const v = viewableItems?.[0]?.item as QuranPage | undefined;
    if (!v || !currentSurah) return;

    const firstAyah = v.ayahs?.[0]?.number ?? 1;
    lastVisiblePageRef.current = { page: v.page, firstAyah };
    lastOffsetRef.current = 0;
  }).current;

  // Persist progress (page + offset)
  const persistProgress = useCallback(
    async (showToast = false) => {
      if (!currentSurah) return;

      const v = lastVisiblePageRef.current;
      if (!v) return;

      await setLastReadPage(currentSurah.number, v.firstAyah, v.page, lastOffsetRef.current);
      await refreshLastRead(meta);

      if (showToast) showSaved("تم الحفظ");
    },
    [currentSurah, meta, showSaved]
  );

  // autosave while reading
  useEffect(() => {
    if (mode !== "reader") return;
    const t = setInterval(() => persistProgress(false), 2500);
    return () => clearInterval(t);
  }, [mode, persistProgress]);

  // For header bookmark fill
  const visiblePage = lastVisiblePageRef.current?.page;
  const isThisPageSaved =
    !!currentSurah?.number &&
    lastReadInfo?.surahNum === currentSurah.number &&
    lastReadInfo?.page != null &&
    visiblePage != null &&
    lastReadInfo.page === visiblePage;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SavedBanner
        visible={savedVisible}
        text="تم الحفظ"
        colors={colors}
        primaryColor={primaryColor}
        topInset={insets.top}
      />

      {mode === "list" ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.number.toString()}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ThemedText weight="bold" style={styles.mainTitle}>
                القرآن الكريم
              </ThemedText>

              <Pressable
                style={styles.heroCard}
                onPress={() => openSurah(lastReadInfo?.surahNum || 1, lastReadInfo?.ayah || 1)}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <ThemedText style={styles.heroLabel}>آخر قراءة</ThemedText>
                  <ThemedText weight="bold" style={styles.heroSurah}>
                    {lastReadInfo?.name || "سورة الفاتحة"}
                  </ThemedText>
                  <ThemedText style={styles.heroAyah}>
                    {lastReadInfo?.page ? `صفحة ${lastReadInfo.page}` : `الآية رقم ${lastReadInfo?.ayah || 1}`}
                  </ThemedText>
                </View>

                <View style={styles.heroCircle}>
                  <Ionicons name="bookmark" size={28} color="#FFF" />
                </View>
              </Pressable>

              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput
                  placeholder="ابحث عن سورة..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.searchInput,
                    { color: colors.text, textAlign: "right", lineHeight: scale(22), paddingVertical: 8 },
                  ]}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.surahItem} onPress={() => openSurah(item.number)}>
              <View style={styles.surahLeft}>
                <ThemedText style={styles.surahMetaText}>{item.ayahs} آية</ThemedText>
              </View>

              <View style={styles.surahRight}>
                <View style={styles.surahNameContainer}>
                  <ThemedText weight="bold" style={styles.surahName}>
                    {item.name_ar}
                  </ThemedText>
                  <View style={styles.numberBadge}>
                    <ThemedText weight="bold" style={styles.numberText}>
                      {item.number}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Reader top bar */}
          <View style={styles.readerNav}>
            <Pressable
              onPress={async () => {
                await persistProgress(false);
                setMode("list");
              }}
              style={styles.navBtn}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>

            <ThemedText weight="bold" style={styles.readerNavTitle} numberOfLines={1}>
              {currentSurah?.name_ar}
            </ThemedText>

            <View style={{ flexDirection: "row", gap: 4 }}>
              <Pressable onPress={() => setFontSize((s) => Math.max(scale(16), s - 1))} style={styles.navBtn}>
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>

              <Pressable onPress={() => setFontSize((s) => Math.min(scale(34), s + 1))} style={styles.navBtn}>
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>

              {/* ONLY BOOKMARK */}
              <Pressable
                onPress={() => persistProgress(true)}
                style={[styles.navBtn, isThisPageSaved && { backgroundColor: primaryColor + "18" }]}
              >
                <Ionicons
                  name={isThisPageSaved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={isThisPageSaved ? primaryColor : colors.text}
                />
              </Pressable>
            </View>
          </View>

          {/* Horizontal pages */}
          <FlatList
            ref={pagesRef}
            data={pages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p) => String(p.page)}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onScrollToIndexFailed={() => {}}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            renderItem={({ item }) => (
              <MushafPage
                surahName={currentSurah?.name_ar ?? ""}
                page={item.page}
                ayahs={item.ayahs}
                colors={colors}
                primaryColor={primaryColor}
                scale={scale}
                fontFamily={fontFamily}
                fontSize={fontSize}
                lineHeight={lineHeight}
                initialOffsetY={
                  lastReadInfo?.surahNum === currentSurah?.number && lastReadInfo?.page === item.page
                    ? lastReadInfo?.offsetInPage ?? 0
                    : 0
                }
                onOffsetChange={(y) => {
                  if (lastVisiblePageRef.current?.page === item.page) {
                    lastOffsetRef.current = y;
                  }
                }}
              />
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// -------------------- PAGE (scrollable) --------------------
function MushafPage({
  surahName,
  page,
  ayahs,
  colors,
  primaryColor,
  scale,
  fontFamily,
  fontSize,
  lineHeight,
  initialOffsetY,
  onOffsetChange,
}: {
  surahName: string;
  page: number;
  ayahs: QuranAyah[];
  colors: any;
  primaryColor: string;
  scale: (n: number) => number;

  fontFamily?: string;
  fontSize: number;
  lineHeight: number;

  initialOffsetY?: number;
  onOffsetChange?: (y: number) => void;
}) {
  // ✅ detect dark-ish sheet to choose proper paper colors
  const isDarkish =
    typeof colors?.sheetBg === "string" &&
    (colors.sheetBg.startsWith("#0") ||
      colors.sheetBg.startsWith("#1") ||
      colors.sheetBg.startsWith("#2") ||
      colors.sheetBg.startsWith("#3"));

  const paperBg = isDarkish ? colors.cardBg : "#F7F2E7";
  const paperEdge = isDarkish ? colors.border : "#E6D9C4";

  const pageText = useMemo(() => ayahs.map((a) => `${a.text} ﴿${a.number}﴾`).join("  "), [ayahs]);

  const svRef = useRef<ScrollView>(null);

  useEffect(() => {
    const y = initialOffsetY ?? 0;
    const t = setTimeout(() => svRef.current?.scrollTo({ y, animated: false }), 50);
    return () => clearTimeout(t);
  }, [page, initialOffsetY]);

  return (
    <View style={{ width, padding: 16 }}>
      <View
        style={[
          stylesPage.paper,
          { backgroundColor: paperBg, borderColor: paperEdge, shadowColor: colors.shadow },
        ]}
      >
        <View pointerEvents="none" style={[stylesPage.frameOuter, { borderColor: primaryColor + "55" }]} />
        <View pointerEvents="none" style={[stylesPage.frameInner, { borderColor: primaryColor + "22" }]} />

        {/* Header inside page */}
        <View style={stylesPage.header}>
          <ThemedText
            weight="bold"
            style={{
              color: colors.text,
              fontSize: scale(14),
              textAlign: "center",
              lineHeight: scale(20),
              paddingVertical: 2,
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
            }}
            numberOfLines={1}
          >
            {surahName || "—"}
          </ThemedText>

          <View style={[stylesPage.headerRule, { backgroundColor: colors.divider }]} />
        </View>

        {/* Scrollable content */}
        <ScrollView
          ref={svRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          onScroll={(e) => onOffsetChange?.(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={160}
        >
          <ThemedText
            style={{
              color: colors.text,
              fontSize,
              lineHeight,
              writingDirection: "rtl",
              textAlign: "justify",
              fontFamily: fontFamily || undefined,
              paddingVertical: 6,
              ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
            }}
          >
            {pageText}
          </ThemedText>
        </ScrollView>

        {/* Footer */}
        <View style={stylesPage.footer}>
          <View style={[stylesPage.footerLine, { backgroundColor: colors.divider }]} />
          <ThemedText style={{ color: colors.textMuted, fontSize: scale(12), fontWeight: "800" }}>{page}</ThemedText>
          <View style={[stylesPage.footerLine, { backgroundColor: colors.divider }]} />
        </View>
      </View>
    </View>
  );
}

const stylesPage = StyleSheet.create({
  paper: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  frameOuter: { position: "absolute", top: 10, left: 10, right: 10, bottom: 10, borderWidth: 2, borderRadius: 18 },
  frameInner: { position: "absolute", top: 18, left: 18, right: 18, bottom: 18, borderWidth: 1, borderRadius: 14 },

  header: { paddingTop: 4, paddingBottom: 6 },
  headerRule: { height: 1, opacity: 0.7, marginTop: 10 },

  footer: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingTop: 10 },
  footerLine: { height: 1, flex: 1, opacity: 0.8 },
});

// -------------------- STYLES (main) --------------------
function makeStyles(colors: any, primaryColor: string, scale: (n: number) => number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.sheetBg },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    listContent: { padding: 20 },
    listHeader: { marginBottom: 20 },

    mainTitle: {
      fontSize: scale(32),
      color: colors.text,
      textAlign: "left",
      marginBottom: 20,
      lineHeight: scale(44),
      paddingVertical: 6,
      ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
    },

    heroCard: {
      backgroundColor: primaryColor,
      borderRadius: 24,
      padding: 24,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 25,
      shadowColor: primaryColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    heroLabel: { color: "rgba(255,255,255,0.75)", fontSize: scale(14), textAlign: "left" },
    heroSurah: { color: "#FFF", fontSize: scale(22), textAlign: "left", marginVertical: 4 },
    heroAyah: { color: "#FFF", fontSize: scale(14), textAlign: "left" },
    heroCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },

    searchBar: {
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      paddingHorizontal: 15,
      height: 55,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, marginRight: 10, fontSize: scale(16) },

    surahItem: {
      backgroundColor: colors.cardBg,
      padding: 18,
      borderRadius: 20,
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    surahLeft: { flexDirection: "row", alignItems: "center" },
    surahRight: { flexDirection: "row", alignItems: "center" },
    surahNameContainer: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
    surahName: { fontSize: scale(18), color: colors.text, textAlign: "left" },
    surahMetaText: { fontSize: scale(13), color: colors.textMuted, textAlign: "left" },

    numberBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.sheetBg,
      justifyContent: "center",
      alignItems: "center",
      transform: [{ rotate: "45deg" }],
      borderWidth: 1,
      borderColor: colors.border,
    },
    numberText: { transform: [{ rotate: "-45deg" }], color: primaryColor, fontSize: scale(12) },

    readerNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    readerNavTitle: {
      fontSize: scale(18),
      color: colors.text,
      textAlign: "center",
      flex: 1,
      lineHeight: scale(26),
      paddingVertical: 2,
      ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
    },
    navBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
    },
  });
}
