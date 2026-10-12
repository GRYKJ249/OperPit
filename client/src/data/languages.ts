export const languageOptions = [
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl" },
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr" },
  { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr" },
  { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr" },
  { code: "zh-CN", nativeName: "简体中文", englishName: "Chinese (Simplified)", dir: "ltr" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr" },
  { code: "ur", nativeName: "اردو", englishName: "Urdu", dir: "rtl" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali", dir: "ltr" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese", dir: "ltr" },
  { code: "ru", nativeName: "Русский", englishName: "Russian", dir: "ltr" },
  { code: "de", nativeName: "Deutsch", englishName: "German", dir: "ltr" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese", dir: "ltr" },
] as const;

export type SiteLocale = (typeof languageOptions)[number]["code"];
export function isSiteLocale(value: string | null): value is SiteLocale {
  return languageOptions.some(language => language.code === value);
}
export function isRtlLocale(locale: SiteLocale) {
  return locale === "ar" || locale === "ur";
}
