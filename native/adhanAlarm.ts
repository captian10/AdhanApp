import { NativeModules, Platform } from "react-native";

type AdhanAlarmNative = {
  // ✅ Updated to accept soundName
  scheduleExact(id: string, triggerAtMs: number, prayerName: string, soundName: string): void;
  cancel(id: string): void;
  stopNow?: () => Promise<boolean> | boolean;
  canScheduleExactAlarms?: () => Promise<boolean> | boolean;
};

const Native: AdhanAlarmNative | null =
  Platform.OS === "android" ? (NativeModules as any).AdhanAlarm : null;

// ✅ Updated function signature
export function scheduleExactAlarm(id: string, when: Date, prayerName: string, soundName: string = "azan") {
  if (!Native) return;
  // Pass soundName to the Native Module
  Native.scheduleExact(id, when.getTime(), prayerName, soundName);
}

export function cancelExactAlarm(id: string) {
  if (!Native) return;
  Native.cancel(id);
}

export async function stopAdhan() {
  if (!Native?.stopNow) return false;
  const r = await Native.stopNow();
  return Boolean(r);
}

export async function canScheduleExactAlarms() {
  if (!Native?.canScheduleExactAlarms) return true;
  const r = await Native.canScheduleExactAlarms();
  return Boolean(r);
}