"use client";

import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { CssBaseline, PaletteMode, useMediaQuery } from "@mui/material";
import {
  ThemeProvider,
  Theme,
  responsiveFontSizes
} from "@mui/material/styles";
import { createExpressiveTheme } from "@/lib/theme";

type ThemeSettings = {
  seedColor: string;
  mode: PaletteMode;
};

type ThemeContextValue = ThemeSettings & {
  setSeedColor: (value: string) => void;
  setMode: (mode: PaletteMode) => void;
};

const STORAGE_KEY = "material_expressive_theme_v1";

const MaterialThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

const defaultSeed = "#6750a4";

function readStoredSettings(): ThemeSettings | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ThemeSettings;
    if (
      typeof parsed?.seedColor === "string" &&
      (parsed.mode === "light" || parsed.mode === "dark")
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function storeSettings(settings: ThemeSettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function MaterialThemeProvider({ children }: PropsWithChildren) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", {
    noSsr: true
  });

  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const stored = readStoredSettings();
    if (stored) {
      return stored;
    }

    return {
      seedColor: defaultSeed,
      mode: prefersDark ? "dark" : "light"
    };
  });

  useEffect(() => {
    storeSettings(settings);
  }, [settings]);

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      mode: prev.mode ?? (prefersDark ? "dark" : "light")
    }));
  }, [prefersDark]);

  const setSeedColor = useCallback((value: string) => {
    setSettings((prev) => ({ ...prev, seedColor: value }));
  }, []);

  const setMode = useCallback((mode: PaletteMode) => {
    setSettings((prev) => ({ ...prev, mode }));
  }, []);

  const theme = useMemo<Theme>(() => {
    const expressive = createExpressiveTheme(settings.seedColor, settings.mode);
    return responsiveFontSizes(expressive);
  }, [settings]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      ...settings,
      setMode,
      setSeedColor
    }),
    [settings, setMode, setSeedColor]
  );

  return (
    <MaterialThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </MaterialThemeContext.Provider>
  );
}

export function useMaterialTheme() {
  const ctx = useContext(MaterialThemeContext);
  if (!ctx) {
    throw new Error("useMaterialTheme must be used within MaterialThemeProvider");
  }
  return ctx;
}
