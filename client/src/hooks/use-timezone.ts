import { useState, useEffect } from "react";

const TZ_KEY = "brandverse_timezone";
const LANG_KEY = "brandverse_language";

export const TIMEZONES = [
  { value: "UTC", label: "UTC — Coordinated Universal Time" },
  { value: "America/New_York", label: "New York (EST/EDT) — UTC-5/4" },
  { value: "America/Chicago", label: "Chicago (CST/CDT) — UTC-6/5" },
  { value: "America/Denver", label: "Denver (MST/MDT) — UTC-7/6" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT) — UTC-8/7" },
  { value: "America/Toronto", label: "Toronto (EST/EDT) — UTC-5/4" },
  { value: "America/Vancouver", label: "Vancouver (PST/PDT) — UTC-8/7" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT) — UTC-3" },
  { value: "Europe/London", label: "London (GMT/BST) — UTC+0/1" },
  { value: "Europe/Paris", label: "Paris (CET/CEST) — UTC+1/2" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST) — UTC+1/2" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST) — UTC+1/2" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST) — UTC+1/2" },
  { value: "Europe/Rome", label: "Rome (CET/CEST) — UTC+1/2" },
  { value: "Europe/Moscow", label: "Moscow (MSK) — UTC+3" },
  { value: "Africa/Cairo", label: "Cairo (EET) — UTC+2" },
  { value: "Africa/Lagos", label: "Lagos (WAT) — UTC+1" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST) — UTC+2" },
  { value: "Asia/Dubai", label: "Dubai (GST) — UTC+4" },
  { value: "Asia/Riyadh", label: "Riyadh (AST) — UTC+3" },
  { value: "Asia/Karachi", label: "Karachi (PKT) — UTC+5" },
  { value: "Asia/Kolkata", label: "Mumbai / Delhi (IST) — UTC+5:30" },
  { value: "Asia/Dhaka", label: "Dhaka (BST) — UTC+6" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT) — UTC+7" },
  { value: "Asia/Singapore", label: "Singapore (SGT) — UTC+8" },
  { value: "Asia/Shanghai", label: "Shanghai / Beijing (CST) — UTC+8" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT) — UTC+8" },
  { value: "Asia/Tokyo", label: "Tokyo (JST) — UTC+9" },
  { value: "Asia/Seoul", label: "Seoul (KST) — UTC+9" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT) — UTC+10/11" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT) — UTC+10/11" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT) — UTC+12/13" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
];

export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>(
    () => localStorage.getItem(TZ_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [language, setLanguageState] = useState<string>(
    () => localStorage.getItem(LANG_KEY) || "en"
  );

  function setTimezone(tz: string) {
    localStorage.setItem(TZ_KEY, tz);
    setTimezoneState(tz);
  }

  function setLanguage(lang: string) {
    localStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);
  }

  function formatInTz(date: Date, opts: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: timezone }).format(date);
  }

  return { timezone, setTimezone, language, setLanguage, formatInTz };
}
