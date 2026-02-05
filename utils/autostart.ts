import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking, Platform } from "react-native";

const KEY_PERMANENT = "adhan_reliability_dismissed_v1";
const KEY_SNOOZE_UNTIL = "adhan_reliability_snooze_until_v1";

export async function checkAndroidBackgroundRestrictions() {
  if (Platform.OS !== "android") return;

  // Permanent dismissed
  const dismissed = await AsyncStorage.getItem(KEY_PERMANENT);
  if (dismissed === "1") return;

  // Snooze
  const snoozeUntil = await AsyncStorage.getItem(KEY_SNOOZE_UNTIL);
  if (snoozeUntil) {
    const until = Number(snoozeUntil);
    if (!Number.isNaN(until) && Date.now() < until) return;
  }

  const manufacturer = (Device.manufacturer ?? "").toLowerCase();
  const brand = (Device.brand ?? "").toLowerCase();

  const problematic = ["xiaomi", "redmi", "poco", "oppo", "vivo", "huawei", "meizu"];
  const isProblematic =
    problematic.some((x) => manufacturer.includes(x)) || problematic.some((x) => brand.includes(x));

  if (!isProblematic) return;

  Alert.alert(
    "Improve Adhan reliability",
    "On some phones (Xiaomi/Redmi), you must enable Auto-start and set Battery to No restrictions so Adhan works when the app is closed.",
    [
      {
        text: "Later (7 days)",
        style: "cancel",
        onPress: async () => {
          const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
          await AsyncStorage.setItem(KEY_SNOOZE_UNTIL, String(sevenDays));
        },
      },
      {
        text: "I enabled it",
        onPress: async () => {
          await AsyncStorage.setItem(KEY_PERMANENT, "1");
        },
      },
      {
        text: "Open settings",
        onPress: async () => {
          await AsyncStorage.setItem(KEY_PERMANENT, "1");
          await openAutoStartSettings(manufacturer);
        },
      },
    ]
  );
}

async function openAutoStartSettings(manufacturer: string) {
  const map: Record<string, { pkg: string; cls: string } | undefined> = {
    xiaomi: {
      pkg: "com.miui.securitycenter",
      cls: "com.miui.permcenter.autostart.AutoStartManagementActivity",
    },
    oppo: {
      pkg: "com.coloros.safecenter",
      cls: "com.coloros.safecenter.permission.startup.StartupAppListActivity",
    },
    vivo: {
      pkg: "com.vivo.permissionmanager",
      cls: "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
    },
    huawei: {
      pkg: "com.huawei.systemmanager",
      cls: "com.huawei.systemmanager.optimize.process.ProtectActivity",
    },
  };

  const key = Object.keys(map).find((k) => manufacturer.includes(k));
  const target = key ? map[key] : undefined;

  // Try OEM autostart screen
  if (target) {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.MAIN", {
        packageName: target.pkg,
        className: target.cls,
      });
      return;
    } catch {}
  }

  // Fallback: app details screen
  try {
    const pkg = Application.applicationId ?? "";
    await IntentLauncher.startActivityAsync("android.settings.APPLICATION_DETAILS_SETTINGS", {
      data: `package:${pkg}`,
    });
    return;
  } catch {}

  Linking.openSettings();
}
