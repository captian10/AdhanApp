import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as IntentLauncher from "expo-intent-launcher";
import * as Application from "expo-application";
import { Platform } from "react-native";
import { CalculationMethod, Coordinates, PrayerTimes } from "adhan";

import {
  cancelExactAlarm,
  scheduleExactAlarm,
  scheduleExactRepeating,
  canScheduleExactAlarms,
} from "../native/adhanAlarm";

import { getSoundPreference, getSalatSoundPreference } from "./audioSettings";

export type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type PrayerItem = { name: PrayerName; time: Date };

const IDS_KEY = "adhan_native_alarm_ids_v1";
const LOCATION_PREF_KEY = "adhan_location_pref_v1";
const CACHED_CITY_KEY = "adhan_cached_city_name_v1";

// ✅ Adhan enable/disable flag
const ADHAN_ENABLED_KEY = "adhan_enabled_v1";

// ✅ NEW: Salat enable/disable + interval
const SALAT_ENABLED_KEY = "salat_enabled_v1";
const SALAT_INTERVAL_MIN_KEY = "salat_interval_min_v1";
const SALAT_ALARM_ID = "salat_repeat_alarm_v1";

// ------------------------
// Adhan Enabled Helpers
// ------------------------

export async function setAdhanEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(ADHAN_ENABLED_KEY, enabled ? "1" : "0");
  } catch {}
}

export async function isAdhanEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ADHAN_ENABLED_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

// ------------------------
// Salat ("صلي على محمد") Helpers
// ------------------------

export async function setSalatEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(SALAT_ENABLED_KEY, enabled ? "1" : "0");
  } catch {}
}

export async function isSalatEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SALAT_ENABLED_KEY);
    if (v === null) return false; // default OFF (غير مفعل)
    return v === "1";
  } catch {
    return false;
  }
}

export async function setSalatIntervalMinutes(min: number) {
  const safe = Math.max(1, Math.min(Math.floor(min), 24 * 60));
  try {
    await AsyncStorage.setItem(SALAT_INTERVAL_MIN_KEY, String(safe));
  } catch {}
}

export async function getSalatIntervalMinutes(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(SALAT_INTERVAL_MIN_KEY);
    const n = v ? Number(v) : 30;
    if (!Number.isFinite(n) || n <= 0) return 30;
    return Math.max(1, Math.min(Math.floor(n), 24 * 60));
  } catch {
    return 30;
  }
}

export async function cancelSalatSchedule() {
  if (Platform.OS !== "android") return;
  cancelExactAlarm(SALAT_ALARM_ID);
}

export async function refreshSalatSchedule() {
  if (Platform.OS !== "android") return;

  await requestNeededPermissions();

  const enabled = await isSalatEnabled();
  if (!enabled) {
    await cancelSalatSchedule();
    return;
  }

  const intervalMin = await getSalatIntervalMinutes();
  const soundName = await getSalatSoundPreference();

  // schedule first fire after intervalMin from now
  const when = new Date(Date.now() + intervalMin * 60_000);

  // ✅ openUi=false (مايفتحش شاشة الأذان)
  scheduleExactRepeating(SALAT_ALARM_ID, when, "صلي على محمد", soundName, intervalMin, false);
}

export async function scheduleTestSalat(seconds = 5) {
  if (Platform.OS !== "android") return;

  await requestNeededPermissions();

  if (!(await isSalatEnabled())) throw new Error("Salat disabled");

  const soundName = await getSalatSoundPreference();
  const when = new Date(Date.now() + seconds * 1000);

  // test: single-shot (repeat=0)
  scheduleExactRepeating(`salat_test_${Date.now()}`, when, "صلي على محمد", soundName, 0, false);
}

// ------------------------
// Location Helpers
// ------------------------

export async function saveLocationPreference(
  mode: "auto" | "manual",
  cityData?: { lat: number; lng: number; name: string }
) {
  const data = { mode, ...cityData };
  await AsyncStorage.setItem(LOCATION_PREF_KEY, JSON.stringify(data));
}

export async function getLocationPreference() {
  const data = await AsyncStorage.getItem(LOCATION_PREF_KEY);
  return data ? JSON.parse(data) : { mode: "auto" };
}

// ------------------------

function getPrayersForDate(coords: Coordinates, date: Date): PrayerItem[] {
  const params = CalculationMethod.Egyptian();
  const pt = new PrayerTimes(coords, date, params);

  return [
    { name: "Fajr", time: pt.fajr },
    { name: "Dhuhr", time: pt.dhuhr },
    { name: "Asr", time: pt.asr },
    { name: "Maghrib", time: pt.maghrib },
    { name: "Isha", time: pt.isha },
  ];
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function alarmIdFor(prayer: PrayerName, when: Date) {
  return `adhan_${dayKey(when)}_${prayer}`;
}

async function getStoredIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function storeIds(ids: string[]) {
  try {
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
  } catch {}
}

export async function resetAllNotificationsAndAlarms() {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}

  const ids = await getStoredIds();
  for (const id of ids) cancelExactAlarm(id);
  await storeIds([]);
}

// ------------------------

async function requestNeededPermissions() {
  try {
    await Notifications.requestPermissionsAsync();
  } catch {}

  if (Platform.OS === "android") {
    const ok = await canScheduleExactAlarms();
    if (!ok) {
      try {
        await IntentLauncher.startActivityAsync("android.settings.REQUEST_SCHEDULE_EXACT_ALARM", {
          data: `package:${Application.applicationId ?? ""}`,
        });
      } catch {
        try {
          await IntentLauncher.startActivityAsync("android.settings.APPLICATION_DETAILS_SETTINGS", {
            data: `package:${Application.applicationId ?? ""}`,
          });
        } catch {}
      }
    }
  }
}

export type RefreshScheduleResult = {
  scheduledCount: number;
  nextPrayer: PrayerItem | null;
  todayPrayers: PrayerItem[];
  scheduledRangeDays: number;
  locationName: string;
};

export async function refreshPrayerSchedule(options?: { daysAhead?: number; forceGps?: boolean }) {
  const daysAhead = Math.max(1, Math.min(options?.daysAhead ?? 5, 14));

  await requestNeededPermissions();

  const soundName = await getSoundPreference();

  // --- 1. DETERMINE LOCATION ---
  let coords: Coordinates;
  let locationName = "موقعي الحالي";

  const pref = await getLocationPreference();

  if (pref.mode === "manual") {
    coords = new Coordinates(pref.lat, pref.lng);
    locationName = pref.name || "موقع محدد";
  } else {
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== "granted") throw new Error("Location permission missing");

    let loc: Location.LocationObject | null = null;

    if (!options?.forceGps) {
      loc = await Location.getLastKnownPositionAsync({});
    }

    if (!loc) {
      loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }

    coords = new Coordinates(loc.coords.latitude, loc.coords.longitude);

    const cachedName = await AsyncStorage.getItem(CACHED_CITY_KEY);
    if (cachedName && !options?.forceGps) {
      locationName = cachedName;
    } else {
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (reverse[0]?.city || reverse[0]?.region) {
          locationName = reverse[0].city || reverse[0].region || "مصر";
          await AsyncStorage.setItem(CACHED_CITY_KEY, locationName);
        }
      } catch {
        if (cachedName) locationName = cachedName;
      }
    }
  }

  // --- 2. CALCULATE & SCHEDULE ---
  const now = new Date();
  const todayPrayers = getPrayersForDate(coords, now);

  // ✅ Always clear old stuff first (so OFF mode also stops future alarms)
  const oldIds = await getStoredIds();
  for (const id of oldIds) cancelExactAlarm(id);
  await storeIds([]);

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}

  const enabled = await isAdhanEnabled();

  let scheduledCount = 0;
  let nextPrayer: PrayerItem | null = null;
  const newIds: string[] = [];

  // ✅ FIX: when adhan disabled, still compute next prayer using tomorrow if needed
  if (!enabled) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const tomorrowPrayers = getPrayersForDate(coords, tomorrow);

    nextPrayer =
      todayPrayers.find((p) => p.time.getTime() > now.getTime()) ??
      tomorrowPrayers[0] ??
      null;

    return {
      scheduledCount: 0,
      nextPrayer,
      todayPrayers,
      scheduledRangeDays: daysAhead,
      locationName,
    } satisfies RefreshScheduleResult;
  }

  // ✅ Scheduling mode (adhan ON)
  for (let offset = 0; offset < daysAhead; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);

    const prayers = getPrayersForDate(coords, d);

    for (const p of prayers) {
      if (p.time.getTime() <= now.getTime() + 60_000) continue;

      if (!nextPrayer || p.time < nextPrayer.time) nextPrayer = p;

      const id = alarmIdFor(p.name, p.time);
      scheduleExactAlarm(id, p.time, p.name, soundName);

      newIds.push(id);
      scheduledCount++;
    }
  }

  await storeIds(newIds);

  return {
    scheduledCount,
    nextPrayer,
    todayPrayers,
    scheduledRangeDays: daysAhead,
    locationName,
  } satisfies RefreshScheduleResult;
}

export async function scheduleTestAzan(seconds = 5) {
  if (Platform.OS !== "android") return;

  if (!(await isAdhanEnabled())) throw new Error("Adhan disabled");

  const when = new Date(Date.now() + seconds * 1000);
  const id = `test_${Date.now()}`;
  const soundName = await getSoundPreference();
  scheduleExactAlarm(id, when, "Test", soundName);
}
