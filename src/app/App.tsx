import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeContext } from "../contexts/ThemeContext";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";

const THEME_STORAGE_KEY = "assessmentcore-theme";

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    
    // Dynamically update the favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (favicon) {
      favicon.href = isDark ? "/logo-dark-1.png" : "/AC_logo.png";
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark((prev) => !prev) }}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors theme={isDark ? "dark" : "light"} />
      </AuthProvider>
    </ThemeContext.Provider>
  );
}
