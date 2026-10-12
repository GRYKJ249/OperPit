import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultThemePreset, themePresets, type ThemeMode } from "../data/themePresets";

type ThemeContextType = {
  theme: ThemeMode;
  presetId: string;
  presets: typeof themePresets;
  lowData: boolean;
  toggleTheme?: () => void;
  setPreset: (id: string) => void;
  setLowData: (enabled: boolean) => void;
  switchable: boolean;
};
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  switchable?: boolean;
}

export function ThemeProvider({ children, defaultTheme = "light", switchable = false }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);
  const [presetId, setPresetId] = useState(defaultThemePreset.id);
  const [lowData, setLowDataState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem("theme");
      if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
      else {
        const hour = new Date().getHours();
        setTheme(hour >= 19 || hour < 7 ? "dark" : defaultTheme);
      }
      const storedPreset = window.localStorage.getItem("folio-theme-preset");
      if (storedPreset && themePresets.some(preset => preset.id === storedPreset)) setPresetId(storedPreset);
      const storedData = window.localStorage.getItem("folio-low-data");
      if (storedData === "true" || storedData === "false") setLowDataState(storedData === "true");
      else {
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        setLowDataState(connection?.saveData === true);
      }
    } catch {
      // Retain in-memory defaults where local storage or connection information is unavailable.
    }
    setHydrated(true);
  }, [defaultTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const preset = themePresets.find(item => item.id === presetId) ?? defaultThemePreset;
    root.dataset.themePreset = preset.id;
    for (const [property, value] of Object.entries(preset.palettes[theme])) root.style.setProperty(property, value);
    root.dataset.lowData = lowData ? "true" : "false";
    if (!hydrated || !switchable) return;
    try {
      window.localStorage.setItem("theme", theme);
      window.localStorage.setItem("folio-theme-preset", preset.id);
      window.localStorage.setItem("folio-low-data", String(lowData));
    } catch {
      // Current preferences remain active in memory for this session.
    }
  }, [theme, presetId, lowData, hydrated, switchable]);

  const toggleTheme = switchable ? () => setTheme(previous => previous === "light" ? "dark" : "light") : undefined;
  const setPreset = useCallback((id: string) => {
    if (themePresets.some(preset => preset.id === id)) setPresetId(id);
  }, []);
  const setLowData = useCallback((enabled: boolean) => setLowDataState(enabled), []);
  const value = useMemo(() => ({ theme, presetId, presets: themePresets, lowData, toggleTheme, setPreset, setLowData, switchable }), [theme, presetId, lowData, toggleTheme, setPreset, setLowData, switchable]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
