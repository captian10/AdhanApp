import { NativeModules, Platform } from "react-native";

type AdhanAlarmNative = {
  scheduleExact(id: string, triggerAtMs: number, prayerName: string, soundName: string): void;
  cancel(id: string): void;

  // ✅ NEW: repeating exact (Android only)
  scheduleExactRepeating?: (
    id: string,
    triggerAtMs: number,
    title: string,
    soundName: string,
    repeatIntervalMin: number,
    openUi: boolean
  ) => void;

  stopNow?: () => Promise<boolean> | boolean;
  canScheduleExactAlarms?: () => Promise<boolean> | boolean;
};

const Native: AdhanAlarmNative | null =
  Platform.OS === "android" ? ((NativeModules as any).AdhanAlarm as AdhanAlarmNative) : null;

export function scheduleExactAlarm(
  id: string,
  when: Date,
  prayerName: string,
  soundName: string = "azan"
) {
  if (!Native) return;
  Native.scheduleExact(id, when.getTime(), prayerName, soundName);
}

export function scheduleExactRepeating(
  id: string,
  when: Date,
  title: string,
  soundName: string,
  repeatIntervalMin: number,
  openUi: boolean
) {
  if (!Native?.scheduleExactRepeating) return;
  Native.scheduleExactRepeating(id, when.getTime(), title, soundName, repeatIntervalMin, openUi);
}

export function cancelExactAlarm(id: string) {
  if (!Native) return;
  Native.cancel(id);
}

export async function stopAdhan() {
  if (!Native?.stopNow) return false;
  try {
    const r = Native.stopNow();
    const resolved = typeof (r as any)?.then === "function" ? await (r as Promise<any>) : r;
    return Boolean(resolved);
  } catch {
    return false;
  }
}

export async function canScheduleExactAlarms() {
  if (!Native?.canScheduleExactAlarms) return true;
  try {
    const r = Native.canScheduleExactAlarms();
    const resolved = typeof (r as any)?.then === "function" ? await (r as Promise<any>) : r;
    return Boolean(resolved);
  } catch {
    return true;
  }
}
