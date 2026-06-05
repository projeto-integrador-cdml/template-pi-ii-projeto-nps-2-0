import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export type Theme = "light" | "dark";
export type ColorPalette = "green" | "red" | "blue" | "pink" | "yellow";
export type SidebarSide = "left" | "right";

export interface ButtonPosition {
  x: number;
  y: number;
}

export interface UserPreferences {
  theme: Theme;
  palette: ColorPalette;
  sidebarSide: SidebarSide;
  buttonPosition: ButtonPosition;
  widgetOrder: string[];
}

const DEFAULT_WIDGET_ORDER = ["metrics", "pipeline", "activities", "overdue"];

const DEFAULT_PREFS: UserPreferences = {
  theme: "dark",
  palette: "blue",
  sidebarSide: "left",
  buttonPosition: { x: -1, y: -1 }, // -1 = use default bottom-right
  widgetOrder: DEFAULT_WIDGET_ORDER,
};

interface ThemeContextType extends UserPreferences {
  setTheme: (theme: Theme) => void;
  setPalette: (palette: ColorPalette) => void;
  setSidebarSide: (side: SidebarSide) => void;
  setButtonPosition: (pos: ButtonPosition) => void;
  setWidgetOrder: (order: string[]) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function loadLocalPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem("userPreferences");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        ...DEFAULT_PREFS,
        ...parsed,
        buttonPosition: parsed.buttonPosition ?? DEFAULT_PREFS.buttonPosition,
        widgetOrder: parsed.widgetOrder ?? DEFAULT_PREFS.widgetOrder,
      };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS };
}

function saveLocalPrefs(prefs: UserPreferences) {
  localStorage.setItem("userPreferences", JSON.stringify(prefs));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<UserPreferences>(loadLocalPrefs);
  const updatePrefsMutation = trpc.auth.updatePreferences.useMutation();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme & palette to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("data-palette", prefs.palette);
    root.setAttribute("data-sidebar", prefs.sidebarSide);
  }, [prefs.theme, prefs.palette, prefs.sidebarSide]);

  // Debounced sync to server
  const syncToServer = useCallback((newPrefs: UserPreferences) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      updatePrefsMutation.mutate({ preferences: JSON.stringify(newPrefs) });
    }, 800);
  }, [updatePrefsMutation]);

  const setPrefs = useCallback((updater: (prev: UserPreferences) => UserPreferences) => {
    setPrefsState(prev => {
      const next = updater(prev);
      saveLocalPrefs(next);
      syncToServer(next);
      return next;
    });
  }, [syncToServer]);

  const setTheme = useCallback((theme: Theme) => setPrefs(p => ({ ...p, theme })), [setPrefs]);
  const setPalette = useCallback((palette: ColorPalette) => setPrefs(p => ({ ...p, palette })), [setPrefs]);
  const setSidebarSide = useCallback((sidebarSide: SidebarSide) => setPrefs(p => ({ ...p, sidebarSide })), [setPrefs]);
  const setButtonPosition = useCallback((buttonPosition: ButtonPosition) => setPrefs(p => ({ ...p, buttonPosition })), [setPrefs]);
  const setWidgetOrder = useCallback((widgetOrder: string[]) => setPrefs(p => ({ ...p, widgetOrder })), [setPrefs]);
  const toggleTheme = useCallback(() => setPrefs(p => ({ ...p, theme: p.theme === "light" ? "dark" : "light" })), [setPrefs]);

  return (
    <ThemeContext.Provider
      value={{
        ...prefs,
        setTheme,
        setPalette,
        setSidebarSide,
        setButtonPosition,
        setWidgetOrder,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
