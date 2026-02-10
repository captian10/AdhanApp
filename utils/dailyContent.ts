// utils/dailyContent.ts
// (Simplified) Daily content: Hijri only.
// ✅ No network/APIs except Hijri calendar (AlAdhan fallback).

import { getHijriText } from "./hijri";

export type DailyKind = "hijri";

export type DailyItem = {
  kind: DailyKind;
  title: string;
  body: string;
  footer?: string;
  sourceUrl?: string;
};

type Opts = { force?: boolean };

export async function getDailyItems(opts: Opts = {}): Promise<DailyItem[]> {
  const text = await getHijriText({ force: opts.force });

  return [
    {
      kind: "hijri",
      title: "التقويم الهجري",
      body: text,
      footer: "اللهم بارك لنا في يومنا هذا",
      sourceUrl: "https://aladhan.com/prayer-times-api",
    },
  ];
}
