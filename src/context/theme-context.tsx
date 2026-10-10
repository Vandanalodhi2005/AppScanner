import React, { createContext, useContext, useEffect, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { darkColors, lightColors, type ThemeColors, type ThemeMode } from '@/constants/ui';

export type ThemeContextType = ThemeColors & {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
};

const defaultContext: ThemeContextType = {
  ...lightColors,
  theme: 'light',
  colors: lightColors,
  setTheme: () => {},
  isDark: false,
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

const THEME_SETTINGS_FILE = 'scannerapp_theme.json';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  // Load persisted theme preference on app mount
  useEffect(() => {
    let isMounted = true;

    async function loadSavedTheme() {
      if (Platform.OS !== 'android') return;
      try {
        const themeFile = new File(Paths.document, THEME_SETTINGS_FILE);
        if (themeFile.exists) {
          const content = await themeFile.text();
          const parsed = JSON.parse(content);
          if (parsed?.theme === 'dark' || parsed?.theme === 'light') {
            if (isMounted) {
              setThemeState(parsed.theme);
            }
          }
        }
      } catch {
        // Fallback to default 'light' theme on error
      }
    }

    loadSavedTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    // Persist asynchronously without blocking UI
    try {
      if (Platform.OS === 'android') {
        const themeFile = new File(Paths.document, THEME_SETTINGS_FILE);
        if (!themeFile.exists) {
          themeFile.create();
        }
        themeFile.write(JSON.stringify({ theme: mode, updatedAt: Date.now() }));
      }
    } catch {
      // Non-critical persistence failure handled gracefully
    }
  };

  const currentColors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        ...currentColors,
        theme,
        colors: currentColors,
        setTheme,
        isDark: theme === 'dark',
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
