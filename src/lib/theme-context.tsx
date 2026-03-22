"use client";

import { createContext, useContext, useState } from "react";

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
  bg: "#FFFFFF",
  bg2: "#F2F2F2",
  s1: "#F2F2F2",
  s2: "#E5E5E5",
  s3: "#D0D0D0",
  acc: "#0F0F0F",
  accDim: "#EBEBEB",
  accBorder: "#D0D0D0",
  t1: "#0F0F0F",
  t2: "#606060",
  t3: "#AAAAAA",
  sep: "#E5E5E5",
  sepStrong: "#D0D0D0",
  hover: "#F2F2F2",
  green: "#404040",
  greenDim: "#F2F2F2",
  greenText: "#0F0F0F",
  blue: "#505050",
  blueDim: "#EBEBEB",
  blueText: "#0F0F0F",
  orange: "#404040",
  orangeDim: "#F2F2F2",
  orangeText: "#0F0F0F",
  purple: "#505050",
  purpleDim: "#E8E8E8",
  purpleText: "#0F0F0F",
  red: "#ff3b30",
  redDim: "rgba(255,59,48,0.08)",
};

export const DARK: Colors = {
  bg: "#0F0F0F",
  bg2: "#212121",
  s1: "#212121",
  s2: "#3F3F3F",
  s3: "#555555",
  acc: "#F1F1F1",
  accDim: "#3F3F3F",
  accBorder: "#555555",
  t1: "#F1F1F1",
  t2: "#AAAAAA",
  t3: "#606060",
  sep: "#3F3F3F",
  sepStrong: "#555555",
  hover: "#2A2A2A",
  green: "#AAAAAA",
  greenDim: "#2A2A2A",
  greenText: "#F1F1F1",
  blue: "#999999",
  blueDim: "#252525",
  blueText: "#F1F1F1",
  orange: "#AAAAAA",
  orangeDim: "#2A2A2A",
  orangeText: "#F1F1F1",
  purple: "#999999",
  purpleDim: "#252525",
  purpleText: "#F1F1F1",
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
  // localStorage から初期値を同期読み込みして useState に渡すことで、
  // mounted フラグ + null return パターンを廃止する。
  // これにより再マウント時に画面が白くなる問題がなくなる。
  const [isDark, setIsDarkState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "dark";
  });

  const setIsDark = (v: boolean) => {
    setIsDarkState(v);
    localStorage.setItem(STORAGE_KEY, v ? "dark" : "light");
  };

  const C = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, C }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
