import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "taskflow_theme";
const THEME_COLOR: Record<Theme, string> = { dark: "#05070C", light: "#F4F6FA" };

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Applies the theme to <html> and the browser-chrome color meta tag. */
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

// Apply the stored theme before React renders (this module is imported
// from main.tsx), so a light-mode user never sees a dark flash on load.
const initialTheme = readStoredTheme();
applyTheme(initialTheme);

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: initialTheme,

  toggleTheme() {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode) — theme still applies for this session */
    }
    set({ theme: next });
  },
}));
