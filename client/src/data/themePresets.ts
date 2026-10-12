export type ThemeMode = "light" | "dark";
type CssPalette = Record<"--paper" | "--paper-deep" | "--ink" | "--ink-soft" | "--muted" | "--line" | "--card" | "--brand" | "--brand-deep" | "--coral", string>;
type ThemePresetShape = {
  id: string;
  number: number;
  nameAr: string;
  nameEn: string;
  swatch: string;
  palettes: Record<ThemeMode, CssPalette>;
};

const families = [
  { id: "cobalt", ar: "كوبالت", en: "Cobalt", hue: 224 },
  { id: "ocean", ar: "محيط", en: "Ocean", hue: 198 },
  { id: "lagoon", ar: "بحيرة", en: "Lagoon", hue: 183 },
  { id: "teal", ar: "فيروزي", en: "Teal", hue: 174 },
  { id: "jade", ar: "يشم", en: "Jade", hue: 151 },
  { id: "forest", ar: "غابة", en: "Forest", hue: 137 },
  { id: "lime", ar: "ليموني", en: "Lime", hue: 105 },
  { id: "olive", ar: "زيتوني", en: "Olive", hue: 83 },
  { id: "citron", ar: "أترج", en: "Citron", hue: 65 },
  { id: "amber", ar: "كهرماني", en: "Amber", hue: 44 },
  { id: "saffron", ar: "زعفران", en: "Saffron", hue: 34 },
  { id: "copper", ar: "نحاسي", en: "Copper", hue: 23 },
  { id: "coral", ar: "مرجاني", en: "Coral", hue: 12 },
  { id: "rose", ar: "وردي", en: "Rose", hue: 348 },
  { id: "crimson", ar: "قرمزي", en: "Crimson", hue: 335 },
  { id: "magenta", ar: "أرجواني", en: "Magenta", hue: 316 },
  { id: "plum", ar: "برقوقي", en: "Plum", hue: 294 },
  { id: "violet", ar: "بنفسجي", en: "Violet", hue: 274 },
  { id: "indigo", ar: "نيلي", en: "Indigo", hue: 251 },
  { id: "slate", ar: "أردوازي", en: "Slate", hue: 218 },
] as const;

const moods = [
  { id: "editorial", ar: "تحريري", en: "Editorial", offset: 22, surfaceSat: 10, light: 97, brandSat: 75, brandLight: 43 },
  { id: "soft", ar: "هادئ", en: "Soft", offset: -18, surfaceSat: 16, light: 96, brandSat: 62, brandLight: 47 },
  { id: "studio", ar: "استوديو", en: "Studio", offset: 8, surfaceSat: 8, light: 98, brandSat: 84, brandLight: 39 },
  { id: "earth", ar: "طبيعي", en: "Earth", offset: 36, surfaceSat: 19, light: 95, brandSat: 68, brandLight: 41 },
  { id: "contrast", ar: "واضح", en: "Contrast", offset: -36, surfaceSat: 5, light: 99, brandSat: 90, brandLight: 35 },
] as const;

const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;

function palettes(hue: number, mood: (typeof moods)[number]): Record<ThemeMode, CssPalette> {
  const surfaceHue = hue + mood.offset;
  return {
    light: {
      "--paper": hsl(surfaceHue, Math.max(4, mood.surfaceSat - 5), mood.light),
      "--paper-deep": hsl(surfaceHue, mood.surfaceSat, mood.light - 5),
      "--ink": hsl(hue, 10, 14),
      "--ink-soft": hsl(hue, 7, 30),
      "--muted": hsl(hue, 5, 45),
      "--line": hsl(surfaceHue, Math.max(5, mood.surfaceSat - 2), 84),
      "--card": hsl(surfaceHue, Math.max(3, mood.surfaceSat - 7), Math.min(100, mood.light + 1)),
      "--brand": hsl(hue, mood.brandSat, mood.brandLight),
      "--brand-deep": hsl(hue + 5, Math.min(96, mood.brandSat + 6), Math.max(27, mood.brandLight - 9)),
      "--coral": hsl(hue + 102, 65, 54),
    },
    dark: {
      "--paper": hsl(surfaceHue, 13, 10),
      "--paper-deep": hsl(surfaceHue, 14, 15),
      "--ink": hsl(hue, 13, 94),
      "--ink-soft": hsl(hue, 9, 79),
      "--muted": hsl(hue, 7, 65),
      "--line": hsl(surfaceHue, 12, 28),
      "--card": hsl(surfaceHue, 15, 16),
      "--brand": hsl(hue, Math.max(55, mood.brandSat - 2), 73),
      "--brand-deep": hsl(hue + 5, Math.max(58, mood.brandSat - 4), 82),
      "--coral": hsl(hue + 102, 72, 70),
    },
  };
}

const gitprPalette: ThemePresetShape = {
  id: "gitpr-blue",
  number: 0,
  nameAr: "أزرق Gitpr",
  nameEn: "Gitpr Blue",
  swatch: "#1459e8",
  palettes: {
    light: {
      "--paper": "#f7faff",
      "--paper-deep": "#e6edfb",
      "--ink": "#0d1b3e",
      "--ink-soft": "#283f6d",
      "--muted": "#5d6b86",
      "--line": "#cfe0ff",
      "--card": "#ffffff",
      "--brand": "#1459e8",
      "--brand-deep": "#5034d4",
      "--coral": "#28c88f",
    },
    dark: {
      "--paper": "#0a1430",
      "--paper-deep": "#101f45",
      "--ink": "#eef4ff",
      "--ink-soft": "#d8e5ff",
      "--muted": "#9fb4d8",
      "--line": "#294b85",
      "--card": "#132653",
      "--brand": "#79a8ff",
      "--brand-deep": "#a18aff",
      "--coral": "#28c88f",
    },
  },
};

const generatedThemePresets = families.flatMap((family, familyIndex) => moods.map((mood, moodIndex) => {
  const hue = family.hue + (moodIndex - 2) * 3;
  return {
    id: `${family.id}-${mood.id}`,
    number: familyIndex * moods.length + moodIndex + 1,
    nameAr: `${family.ar} · ${mood.ar}`,
    nameEn: `${family.en} · ${mood.en}`,
    swatch: hsl(hue, mood.brandSat, mood.brandLight),
    palettes: palettes(hue, mood),
  };
}));

export const themePresets: ThemePresetShape[] = [gitprPalette, ...generatedThemePresets];

export type ThemePreset = ThemePresetShape;
export const defaultThemePreset = gitprPalette;
