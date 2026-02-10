// app/(tabs)/azkar/index.tsx
import React, { useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../../utils/ThemeContext";
import ThemedText from "../../../components/ThemedText";

const { width } = Dimensions.get("window");

type AzkarCategory = {
  title: string;
  slug: string;
  image: any;
  desc?: string;
};

// Keep your CATS array exactly as it is
const CATS: AzkarCategory[] = [
  { title: "أذكار الصباح", slug: "morning", image: require("../../../assets/azkar/morning.jpg"), desc: "ابدأ يومك بذكر الله" },
  { title: "أذكار المساء", slug: "evening", image: require("../../../assets/azkar/evening.jpg"), desc: "حصن المسلم في المساء" },
  { title: "أذكار بعد الصلاة", slug: "afterPrayer", image: require("../../../assets/azkar/afterprayer.jpg"), desc: "أذكار بعد السلام من الصلاة المفروضة" },
  { title: "تسابيح", slug: "tasabeeh", image: require("../../../assets/azkar/tsabeh.jpg"), desc: "تسبيح وسبحة وأذكار عظيمة" },
  { title: "أذكار النوم", slug: "sleep", image: require("../../../assets/azkar/sleeping.jpg"), desc: "أذكار النوم والأحلام" },
  { title: "أذكار الاستيقاظ", slug: "wakeUp", image: require("../../../assets/azkar/wakingup.jpg"), desc: "أذكار الاستيقاظ من النوم" },
  { title: "أذكار الصلاة", slug: "prayer", image: require("../../../assets/azkar/praying.jpg"), desc: "أذكار وأدعية الصلاة" },
  { title: "جوامع الدعاء", slug: "jawami", image: require("../../../assets/azkar/do3a2.jpg"), desc: "أدعية جامعة من القرآن والسنة" },
  { title: "أدعية نبوية", slug: "prophetic_duas", image: require("../../../assets/azkar/nabaweya.jpg"), desc: "أدعية من السنة النبوية" },
  { title: "الأدعية القرآنية", slug: "quran_duas", image: require("../../../assets/azkar/quraneya.jpg"), desc: "أدعية من القرآن الكريم" },
  { title: "أدعية الأنبياء", slug: "prophets", image: require("../../../assets/azkar/alanbeya2.jpg"), desc: "أدعية الأنبياء من القرآن الكريم" },
  { title: "أذكار متفرقة", slug: "misc", image: require("../../../assets/azkar/azkarmotafreka.jpg"), desc: "أدعية وأذكار متنوعة" },
  { title: "أذكار عند سماع الأذان", slug: "adhan", image: require("../../../assets/azkar/3ndElazan.jpg"), desc: "ما يقال عند سماع الأذان وبعده" },
  { title: "أذكار المسجد", slug: "mosque", image: require("../../../assets/azkar/azkarElmasged.jpg"), desc: "أذكار الذهاب للمسجد ودخوله والخروج منه" },
  { title: "أذكار الوضوء", slug: "wudu", image: require("../../../assets/azkar/wudu.jpg"), desc: "أذكار قبل الوضوء وبعده" },
  { title: "أذكار دخول وخروج المنزل", slug: "home", image: require("../../../assets/azkar/do5olElmnzl.jpg"), desc: "أذكار الدخول والخروج من المنزل" },
  { title: "أذكار دخول وخروج الخلاء", slug: "toilet", image: require("../../../assets/azkar/do5olEl5la2.jpg"), desc: "أذكار قبل الدخول وبعد الخروج" },
  { title: "أذكار الطعام والشراب", slug: "food", image: require("../../../assets/azkar/foodanddrink.jpg"), desc: "أذكار الطعام والشراب والضيف" },
  { title: "أذكار الحج والعمرة", slug: "hajjUmrah", image: require("../../../assets/azkar/makka.jpg"), desc: "أذكار وأدعية الحج والعمرة" },
  { title: "دعاء ختم القرآن", slug: "khatmQuran", image: require("../../../assets/azkar/5tmElquran.jpg"), desc: "دعاء جامع عند ختم القرآن" },
  { title: "فضل الدعاء", slug: "fadluDuaa", image: require("../../../assets/azkar/fdlEldo3a2.jpg"), desc: "مكانة الدعاء وفضله" },
  { title: "فضل الذكر", slug: "fadluDhikr", image: require("../../../assets/azkar/fdlElzekr.jpg"), desc: "آيات وأحاديث في فضل الذكر" },
  { title: "فضل السور", slug: "fadailAlSuwar", image: require("../../../assets/azkar/fda2lElsowr.jpg"), desc: "فضائل سور من القرآن" },
  { title: "فضل القرآن", slug: "fadaelAlQuran", image: require("../../../assets/azkar/fdlElquran.jpg"), desc: "فضائل القرآن الكريم" },
  { title: "أسماء الله الحسنى", slug: "asmaAllah", image: require("../../../assets/azkar/asma2AllahAl7osna.jpg"), desc: "الأسماء الحسنى (99 اسماً)" },
  { title: "أدعية للميت", slug: "duaMayyit", image: require("../../../assets/azkar/myt.jpg"), desc: "أدعية للمتوفى وصلاة الجنازة" },
  { title: "الرقية الشرعية", slug: "ruqyah", image: require("../../../assets/azkar/rokyaShar3eya.jpg"), desc: "الرقية من القرآن والسنة" },
];

export default function AzkarHome() {
  const { colors, primaryColor, scale, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const go = useCallback((slug: string) => {
    router.push({
      pathname: "/(tabs)/azkar/[slug]",
      params: { slug },
    });
  }, []);

  const padTop = insets.top + 16;
  const padBottom = Math.max(40, insets.bottom + 24);

  // For image cards, we want text to stay readable.
  // Use primaryColor for accent glow, but keep text near-white over the dark gradient.
  const cardTitleColor = "#fff";
  const cardDescColor = "rgba(255,255,255,0.9)";

  const gradientColors = useMemo(() => {
    // slightly stronger on light mode so text always readable
    const mid = isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.55)";
    const end = isDark ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0.95)";
    return ["rgba(0,0,0,0)", mid, end] as const;
  }, [isDark]);

  const renderItem = ({ item }: { item: AzkarCategory }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => go(item.slug)}
      style={[
        styles.cardContainer,
        {
          shadowColor: colors.shadow ?? "#000",
        },
      ]}
    >
      <ImageBackground
        source={item.image}
        resizeMode="cover"
        style={[
          styles.cardImageBg,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
          },
        ]}
        imageStyle={{ borderRadius: 24 }}
      >
        <LinearGradient
          colors={gradientColors as any}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardContent}>
          <View style={styles.textWrapper}>
            <ThemedText
              weight="bold"
              style={[
                styles.cardTitle,
                {
                  color: cardTitleColor,
                  fontSize: scale(26),
                  lineHeight: scale(34),
                  paddingVertical: 2,
                  ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
                  textShadowColor: "rgba(0,0,0,0.55)",
                },
              ]}
            >
              {item.title}
            </ThemedText>

            {!!item.desc && (
              <ThemedText
                style={[
                  styles.cardDesc,
                  {
                    color: cardDescColor,
                    fontSize: scale(16),
                    lineHeight: scale(22),
                    paddingVertical: 1,
                    ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
                  },
                ]}
                numberOfLines={1}
              >
                {item.desc}
              </ThemedText>
            )}

            {/* tiny accent line to reflect theme color */}
            <View
              style={{
                marginTop: 10,
                width: Math.min(56, width * 0.18),
                height: 4,
                borderRadius: 999,
                backgroundColor: (primaryColor ?? colors.primary) + "CC",
              }}
            />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <FlatList
        data={CATS}
        renderItem={renderItem}
        keyExtractor={(item) => item.slug}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={{ flex: 1 }}>
              <ThemedText
                weight="bold"
                style={[
                  styles.title,
                  {
                    color: colors.text,
                    fontSize: scale(34),
                    lineHeight: scale(46), // ✅ avoid Arabic clipping
                    paddingVertical: 6,
                    ...(Platform.OS === "android" ? ({ includeFontPadding: true } as any) : null),
                  },
                ]}
              >
                حصن المسلم
              </ThemedText>

              <ThemedText
                style={{
                  marginTop: 6,
                  color: colors.textMuted,
                  fontSize: scale(13),
                  lineHeight: scale(18),
                  textAlign: "left",
                }}
              >
                اختر قسم الأذكار لبدء القراءة
              </ThemedText>
            </View>
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: padTop,
          paddingBottom: padBottom,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontWeight: "800",
    textAlign: "left",
    letterSpacing: -0.5,
  },

  cardContainer: {
    borderRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 8,
  },
  cardImageBg: {
    height: 160,
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 1,
  },
  cardContent: {
    padding: 24,
    width: "100%",
  },
  textWrapper: {
    alignItems: "flex-start",
  },
  cardTitle: {
    fontWeight: "800",
    textAlign: "left",
    marginBottom: 6,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardDesc: {
    textAlign: "left",
    fontWeight: "500",
  },
});
