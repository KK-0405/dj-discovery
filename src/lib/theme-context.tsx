"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Colors = {
  bg: string;
  bg2: string;
  s1: string;
  s2: string;
  s3: string;
  acc: string;
  accDim: string;
  accBorder: string;
  t1: string;
  t2: string;
  t3: string;
  sep: string;
  sepStrong: string;
  hover: string;
  green: string;
  greenDim: string;
  greenText: string;
  blue: string;
  blueDim: string;
  blueText: string;
  orange: string;
  orangeDim: string;
  orangeText: string;
  purple: string;
  purpleDim: string;
  purpleText: string;
  red: string;
  redDim: string;
};

export const LIGHT: Colors = {
  bg: "#ffffff",
  bg2: "#fafafa",
  s1: "#f5f5f7",
  s2: "#e8e8ed",
  s3: "#d2d2d7",
  acc: "#534AB7",
  accDim: "rgba(83,74,183,0.1)",
  accBorder: "rgba(83,74,183,0.3)",
  t1: "#1d1d1f",
  t2: "#6e6e73",
  t3: "#aeaeb2",
  sep: "rgba(0,0,0,0.08)",
  sepStrong: "rgba(0,0,0,0.15)",
  hover: "rgba(0,0,0,0.04)",
  green: "#34c759",
  greenDim: "rgba(52,199,89,0.1)",
  greenText: "#1b7a34",
  blue: "#007aff",
  blueDim: "rgba(0,122,255,0.1)",
  blueText: "#0055cc",
  orange: "#ff9500",
  orangeDim: "rgba(255,149,0,0.1)",
  orangeText: "#b06c00",
  purple: "#af52de",
  purpleDim: "rgba(175,82,222,0.1)",
  purpleText: "#7a35a8",
  red: "#ff3b30",
  redDim: "rgba(255,59,48,0.08)",
};

export const DARK: Colors = {
  bg: "#111111",
  bg2: "#161616",
  s1: "#1c1c1e",
  s2: "#2c2c2e",
  s3: "#3a3a3c",
  acc: "#7b74e0",
  accDim: "rgba(123,116,224,0.15)",
  accBorder: "rgba(123,116,224,0.35)",
  t1: "#f2f2f7",
  t2: "#98989f",
  t3: "#5a5a60",
  sep: "rgba(255,255,255,0.08)",
  sepStrong: "rgba(255,255,255,0.18)",
  hover: "rgba(255,255,255,0.06)",
  green: "#30d158",
  greenDim: "rgba(48,209,88,0.13)",
  greenText: "#30d158",
  blue: "#0a84ff",
  blueDim: "rgba(10,132,255,0.15)",
  blueText: "#4db6ff",
  orange: "#ff9f0a",
  orangeDim: "rgba(255,159,10,0.15)",
  orangeText: "#ff9f0a",
  purple: "#bf5af2",
  purpleDim: "rgba(191,90,242,0.15)",
  purpleText: "#bf5af2",
  red: "#ff453a",
  redDim: "rgba(255,69,58,0.1)",
};

type ThemeCtx = {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  C: Colors;
};

const ThemeContext = createContext<ThemeCtx>({
  isDark: false,
  setIsDark: () => {},
  C: LIGHT,
});

const STORAGE_KEY = "dj_theme_v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDarkState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark") setIsDarkState(true);
    setMounted(true);
  }, []);

  const setIsDark = (v: boolean) => {
    setIsDarkState(v);
    localStorage.setItem(STORAGE_KEY, v ? "dark" : "light");
  };

  const C = isDark ? DARK : LIGHT;

  // Avoid flash of wrong theme before mount
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, C }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
