// utils/quranStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type QuranLastReadV1 = {
  surah: number;     // 1..114
  ayah: number;      // 1..n
  updatedAt: number; // Date.now()
};

export type QuranLastReadV2 = {
  surah: number;     // 1..114
  ayah: number;      // 1..n
  updatedAt: number; // Date.now()

  /** Optional: for "mushaf pages" UI (virtual or real pages) */
  page?: number; // 1-based

  /** ✅ Scroll offset inside the page in pixels (y) */
  offsetInPage?: number; // >= 0 (float is OK)
};

const LAST_READ_KEY_V1 = "quran:last_read_v1";
const LAST_READ_KEY_V2 = "quran:last_read_v2";

function isFiniteInt(n: any) {
  return Number.isFinite(n) && Math.floor(n) === n;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeV2(input: any): QuranLastReadV2 | null {
  if (!input || typeof input !== "object") return null;

  const surah = Number(input.surah);
  const ayah = Number(input.ayah);
  const updatedAt = Number(input.updatedAt);

  if (!isFiniteInt(surah) || !isFiniteInt(ayah) || !Number.isFinite(updatedAt)) return null;

  const out: QuranLastReadV2 = {
    surah: clampInt(surah, 1, 114),
    ayah: Math.max(1, ayah),
    updatedAt: updatedAt > 0 ? updatedAt : Date.now(),
  };

  if (input.page != null) {
    const page = Number(input.page);
    if (isFiniteInt(page) && page > 0) out.page = page;
  }

  // ✅ allow float (scroll y)
  if (input.offsetInPage != null) {
    const offset = Number(input.offsetInPage);
    if (Number.isFinite(offset) && offset >= 0) out.offsetInPage = offset;
  }

  return out;
}

async function migrateV1ToV2IfNeeded(): Promise<void> {
  // If v2 exists, don't migrate
  const existingV2 = await AsyncStorage.getItem(LAST_READ_KEY_V2);
  if (existingV2) return;

  const rawV1 = await AsyncStorage.getItem(LAST_READ_KEY_V1);
  const v1 = safeParse<QuranLastReadV1>(rawV1);
  if (!v1) return;

  const v2 = normalizeV2(v1);
  if (!v2) return;

  await AsyncStorage.setItem(LAST_READ_KEY_V2, JSON.stringify(v2));
}

/** Read last read (V2). Migrates from V1 automatically. */
export async function getLastRead(): Promise<QuranLastReadV2 | null> {
  try {
    await migrateV1ToV2IfNeeded();

    const raw = await AsyncStorage.getItem(LAST_READ_KEY_V2);
    const parsed = safeParse<any>(raw);
    return normalizeV2(parsed);
  } catch {
    return null;
  }
}

/**
 * Save last read.
 * - Minimal required: surah + ayah
 * - Optionally pass page / offsetInPage
 */
export async function setLastRead(v: QuranLastReadV2): Promise<void> {
  try {
    const normalized = normalizeV2(v);
    if (!normalized) return;

    await AsyncStorage.setItem(LAST_READ_KEY_V2, JSON.stringify(normalized));
  } catch (e) {
    console.error("Failed to save progress", e);
  }
}

/** Convenience: update bookmark by surah/ayah only */
export async function setLastReadAyah(surah: number, ayah: number) {
  return setLastRead({ surah, ayah, updatedAt: Date.now() });
}

/** Convenience: used by page UI */
export async function setLastReadPage(
  surah: number,
  ayah: number,
  page: number,
  offsetInPage: number = 0
) {
  return setLastRead({
    surah,
    ayah,
    page,
    offsetInPage,
    updatedAt: Date.now(),
  });
}

export async function clearLastRead(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([LAST_READ_KEY_V1, LAST_READ_KEY_V2]);
  } catch (e) {
    console.error("Failed to clear progress", e);
  }
}
