import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { Moon, Sun } from "@phosphor-icons/react";
const Theme = createContext(null);
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#101114" : "#fbfbfa");
    try {
      localStorage.setItem("wolf-theme", theme);
    } catch {}
    window.dispatchEvent(new Event("wolf-theme-change"));
  }, [theme]);
  return (
    <Theme.Provider value={{ theme, setTheme }}>{children}</Theme.Provider>
  );
}
export const useTheme = () => useContext(Theme);
export function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useTheme();
  return (
    <button
      className={`icon-button theme-toggle ${className}`}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      title={theme === "light" ? "Dark mode" : "Light mode"}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
