import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AzanSound {
  id: string;      // Must be lowercase for Android (e.g. 'azan_egypt')
  name: string;    // Display name
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
  // Default to the first one
  return stored || "azan_nasser_elktamy"; 
}

export async function saveSoundPreference(soundId: string) {
  await AsyncStorage.setItem(SOUND_PREF_KEY, soundId);
}