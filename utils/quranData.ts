// utils/quranData.ts

export type QuranAyah = {
  number: number;   // ayah number inside the surah
  text: string;
  page?: number;    // ✅ 1..~604 (virtual mushaf pages)
  juz?: number;     // ✅ optional (reserved)
};

export type QuranSurah = {
  number: number;
  name_ar: string;
  name_en?: string;
  ayahs: QuranAyah[];
};

export type QuranData = {
  meta?: Record<string, any>;
  surahs: QuranSurah[];
};

export type SurahMeta = { number: number; name_ar: string; ayahs: number };

let cachedQuran: QuranData | null = null;
let cachedMeta: SurahMeta[] | null = null;

function asArray(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

function toInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickFirstString(obj: any, keys: string[], fallback = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return fallback;
}

/**
 * ✅ Virtual paging (approx 604 pages)
 * Tuned for Uthmani text: produces ~603-605 pages typically.
 *
 * You can tweak these if you change font/line-height heavily later:
 * - CHARS_PER_LINE (bigger => fewer pages)
 * - LINES_PER_PAGE (bigger => fewer pages)
 */
const VIRTUAL_PAGING = {
  CHARS_PER_LINE: 90,
  LINES_PER_PAGE: 19,
};

/**
 * Estimate how many "lines" an ayah will take on a mushaf-like page.
 * This is an approximation (good enough for page UI & page numbers).
 */
function estimateLines(text: string) {
  const t = (text ?? "").replace(/\ufeff/g, "").trim();
  if (!t) return 1;
  return Math.max(1, Math.ceil(t.length / VIRTUAL_PAGING.CHARS_PER_LINE));
}

/**
 * Assign virtual page numbers across the entire Quran sequentially.
 * Starts from page=1, increments when page capacity is exceeded.
 */
function assignVirtualPages(surahs: QuranSurah[]) {
  let page = 1;
  let usedLines = 0;

  for (const s of surahs) {
    for (const a of s.ayahs) {
      const lines = estimateLines(a.text);

      // move to next page if this ayah doesn't fit
      if (usedLines + lines > VIRTUAL_PAGING.LINES_PER_PAGE && usedLines > 0) {
        page += 1;
        usedLines = 0;
      }

      a.page = page;
      usedLines += lines;
    }
  }

  return page; // last page number
}

/** ✅ يدعم ملفك: { meta:[{number,name,ayahCount}] } */
function normalizeMeta(raw: any): SurahMeta[] {
  const arr =
    (Array.isArray(raw) && raw) ||
    raw?.meta || // ✅ YOUR FILE SHAPE
    raw?.data ||
    raw?.surahs ||
    raw?.chapters ||
    raw?.chapters?.data ||
    [];

  const list = asArray(arr).map((s: any, idx: number) => {
    const number = toInt(s.number ?? s.id ?? s.chapter_number ?? s.surah_number, idx + 1);

    const name_ar = pickFirstString(
      s,
      ["name_ar", "name", "arabic_name", "arabicName"],
      `سورة ${number}`
    );

    const ayahs = toInt(
      s.ayahs ??
        s.ayahCount ?? // ✅ YOUR KEY
        s.verses_count ??
        s.total_verses ??
        s.numberOfAyahs,
      0
    );

    return { number, name_ar, ayahs };
  });

  return list.filter((x) => x.number >= 1);
}

function normalizeQuran(rawAny: any): QuranData {
  // supports common shapes:
  // 1) { surahs:[...] }
  // 2) { data:{ surahs:[...] } }  (AlQuranCloud)
  // 3) custom shapes
  const root = rawAny?.data?.surahs ? rawAny.data : rawAny;

  const surahsRaw =
    root?.surahs ||
    root?.data?.surahs ||
    root?.chapters ||
    root?.quran?.surahs ||
    [];

  const surahs: QuranSurah[] = asArray(surahsRaw).map((s: any, sIdx: number): QuranSurah => {
    const number = toInt(s.number ?? s.id ?? s.chapter_number ?? s.surah_number, sIdx + 1);

    const name_ar = pickFirstString(
      s,
      ["name_ar", "name", "arabic_name", "arabicName"],
      `سورة ${number}`
    );

    const name_en = pickFirstString(s, ["name_en", "englishName", "english_name"], "");

    const ayahsRaw =
      s.ayahs ||
      s.verses ||
      s.ayas ||
      s?.data?.ayahs ||
      [];

    const ayahs: QuranAyah[] = asArray(ayahsRaw).map((a: any, aIdx: number): QuranAyah => {
      // If ayah is plain string (YOUR FILE)
      if (typeof a === "string") {
        return { number: aIdx + 1, text: a };
      }

      const ayahNum = toInt(
        a.numberInSurah ?? a.number_in_surah ?? a.number ?? a.id ?? a.verse_number,
        aIdx + 1
      );

      const text = pickFirstString(
        a,
        ["text", "text_uthmani", "textUthmani", "uthmani", "arabic_text", "content"],
        ""
      );

      // if you ever add page/juz inside your json later, we keep them
      const page =
        toInt(a.page ?? a.page_number ?? a.pageNumber, 0) || undefined;

      const juz =
        toInt(a.juz ?? a.juz_number ?? a.juzNumber, 0) || undefined;

      return { number: ayahNum, text, page, juz };
    });

    return {
      number,
      name_ar,
      name_en: name_en || undefined,
      ayahs,
    };
  });

  // ✅ If no pages provided in json, assign virtual pages
  const hasAnyPage = surahs.some((s) => s.ayahs.some((a) => typeof a.page === "number" && a.page! > 0));
  let lastPage = 0;

  if (!hasAnyPage) {
    lastPage = assignVirtualPages(surahs);
  } else {
    // if your dataset already includes pages, compute last page
    for (const s of surahs) {
      for (const a of s.ayahs) {
        if (a.page && a.page > lastPage) lastPage = a.page;
      }
    }
  }

  const metaOut = {
    ...(root?.meta ?? rawAny?.meta ?? {}),
    paging: hasAnyPage ? "dataset" : "virtual",
    pagesCount: lastPage,
    virtualPaging: hasAnyPage ? undefined : { ...VIRTUAL_PAGING },
  };

  return { meta: metaOut, surahs };
}

export async function loadSurahMeta(): Promise<SurahMeta[]> {
  if (cachedMeta) return cachedMeta;

  const raw: any = require("../assets/quran/surah-meta.json");
  const meta = normalizeMeta(raw);

  console.log("[Quran] meta loaded:", meta.length, meta[0]);

  cachedMeta = meta;
  return meta;
}

export async function loadQuran(): Promise<QuranData> {
  if (cachedQuran) return cachedQuran;

  const raw: any = require("../assets/quran/quran-uthmani.json");
  const data = normalizeQuran(raw);

  console.log(
    "[Quran] quran loaded:",
    data?.surahs?.length,
    data?.surahs?.[0]?.name_ar,
    data?.surahs?.[0]?.ayahs?.[0]?.text?.slice?.(0, 30),
    "page:",
    data?.surahs?.[0]?.ayahs?.[0]?.page,
    "pagesCount:",
    (data as any)?.meta?.pagesCount
  );

  cachedQuran = data;
  return data;
}

export function normalizeArabicForSearch(s: string) {
  return (s ?? "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .trim();
}
