'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type ThemeId, DEFAULT_THEME, THEME_STORAGE_KEY, getTheme, THEMES } from './themes';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Apply CSS variables for the given theme to the document root */
function applyTheme(id: ThemeId) {
  const t = getTheme(id);
  const root = document.documentElement;

  // Remove all existing theme data attributes and dark class
  root.removeAttribute('data-theme');
  root.classList.remove('dark');

  // Apply CSS variables
  Object.entries(t.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Set data-theme for potential CSS targeting
  root.setAttribute('data-theme', id);

  // Apply Tailwind dark class when the theme is dark-style
  if (t.isDark) {
    root.classList.add('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // On mount: read from localStorage and apply
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    const initial = stored && THEMES.find(t => t.id === stored) ? stored : DEFAULT_THEME;
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    applyTheme(id);
  };

  // Apply theme on every state change (handles SSR→client sync)
  useEffect(() => {
    if (mounted) applyTheme(theme);
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
