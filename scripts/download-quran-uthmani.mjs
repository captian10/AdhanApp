/* scripts/download-quran-uthmani.mjs
   Downloads the full Quran (Uthmani script) once and saves it into assets/quran/quran-uthmani.json
   Source API: https://alquran.cloud/api  (endpoint: /v1/quran/quran-uthmani)  */

import fs from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "assets", "quran");
const OUT_FILE = path.join(OUT_DIR, "quran-uthmani.json");
const OUT_META = path.join(OUT_DIR, "surah-meta.json");

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const url = "https://api.alquran.cloud/v1/quran/quran-uthmani";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);

  const json = await res.json();
  if (!json?.data?.surahs) throw new Error("Unexpected API response shape.");

  const surahs = json.data.surahs.map((s) => ({
    number: s.number,
    name: s.name, // Arabic name from API
    ayahs: s.ayahs.map((a) => a.text),
  }));

  const meta = surahs.map((s) => ({
    number: s.number,
    name: s.name,
    ayahCount: s.ayahs.length,
  }));

  const payload = {
    meta: {
      source: "alquran.cloud",
      edition: "quran-uthmani",
      generatedAt: new Date().toISOString(),
    },
    surahs,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload), "utf8");
  fs.writeFileSync(OUT_META, JSON.stringify({ meta }, null, 2), "utf8");

  console.log("✅ Saved:", OUT_FILE);
  console.log("✅ Saved:", OUT_META);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
