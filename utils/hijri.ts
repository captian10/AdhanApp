// utils/hijri.ts
// Hijri date helper.
// 1) Prefer OFFLINE calculation using Intl Islamic calendar when available.
// 2) Fallback to AlAdhan gToH API (HTTPS) when Intl is not supported.

import AsyncStorage from "@react-native-async-storage/async-storage";

const HIJRI_CACHE_KEY = "adhan_hijri_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const TIMEOUT_MS = 9000;

type HijriCache = { ts: number; gregKey: string; text: string };

function gregDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Removes weekday name only (e.g. "الأحد،") from the beginning of the Hijri string.
 * Keeps the day number (e.g. "14").
 */
function stripWeekdayPrefix(text: string): string {
  // matches: "<anything until Arabic comma>،" at start
  // Example: "الأحد، 14 شعبان 1447 هـ" => "14 شعبان 1447 هـ"
  return (text || "").replace(/^\s*[^،]+،\s*/u, "").trim();
}

function formatHijriIntl(d: Date): string | null {
  try {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const out = fmt.format(d);
    if (!out || /invalid/i.test(out)) return null;

    // ✅ Remove weekday name only, keep day number
    return stripWeekdayPrefix(out);
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

async function fetchHijriFromAlAdhan(d: Date): Promise<string> {
  const dateStr = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  const url = `https://api.aladhan.com/v1/gToH?date=${dateStr}`;
  const res = await fetchJson<any>(url);
  const h = res?.data?.hijri;
  if (!h) throw new Error("Bad hijri response");

  // ✅ Keep day number, remove weekday (do not include it)
  return `${h.day} ${h.month?.ar || ""} ${h.year} هـ`.trim();
}

/**
 * Returns Hijri date text (Arabic).
 * Uses offline Intl when possible. Otherwise uses AlAdhan API.
 * Caches per-day to AsyncStorage to avoid repeated calls.
 */
export async function getHijriText(opts?: { force?: boolean; date?: Date }) {
  const force = !!opts?.force;
  const now = opts?.date ?? new Date();
  const key = gregDayKey(now);

  // 1) Offline Intl (no network)
  const intl = formatHijriIntl(now);
  if (intl) return intl;

  // 2) Cache (AsyncStorage)
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(HIJRI_CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as HijriCache;
        if (c?.text && c?.gregKey === key && Date.now() - c.ts < CACHE_TTL_MS) {
          // ✅ ensure cached text also has weekday removed
          return stripWeekdayPrefix(c.text);
        }
      }
    } catch {
      // ignore
    }
  }

  // 3) AlAdhan fallback
  try {
    const text = await fetchHijriFromAlAdhan(now);
    try {
      const payload: HijriCache = { ts: Date.now(), gregKey: key, text };
      await AsyncStorage.setItem(HIJRI_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
    return text;
  } catch {
    return "تعذر تحميل التاريخ الهجري";
  }
}
