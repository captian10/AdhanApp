import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AzanSound {
  id: string; // Android raw name (lowercase_with_underscores)
  name: string;
}

export const AZAN_SOUNDS: AzanSound[] = [
  { id: "azan_nasser_elktamy", name: "الافتراضي (ناصر القطامي)" },
  { id: "azan_egypt", name: "آذان 1" },
  { id: "azan_good", name: "آذان 2" },
  { id: "azan_good_2", name: "آذان 3" },
  { id: "azan_abdel_baset", name: "آذان 4" },
];

const SOUND_PREF_KEY = "adhan_sound_pref_v1";

export async function getSoundPreference(): Promise<string> {
  const stored = await AsyncStorage.getItem(SOUND_PREF_KEY);
  return stored || "azan_nasser_elktamy";
}

export async function saveSoundPreference(soundId: string) {
  await AsyncStorage.setItem(SOUND_PREF_KEY, soundId);
}

/* ===========================================================
   ✅ NEW: "صلي على محمد" voices
   =========================================================== */

export const SALAT_SOUNDS: AzanSound[] = [
  { id: "salat_mohammad_1", name: "صلي على محمد 1" },
  { id: "salat_mohammad_2", name: "صلي على محمد 2" },
  { id: "salat_mohammad_3", name: "صلي على محمد 3" },
  { id: "salat_mohammad_4", name: "صلي على محمد 4" },
];

const SALAT_SOUND_PREF_KEY = "salat_moh_sound_pref_v1";

export async function getSalatSoundPreference(): Promise<string> {
  const stored = await AsyncStorage.getItem(SALAT_SOUND_PREF_KEY);
  return stored || "salat_mohammad_1";
}

export async function saveSalatSoundPreference(soundId: string) {
  await AsyncStorage.setItem(SALAT_SOUND_PREF_KEY, soundId);
}
