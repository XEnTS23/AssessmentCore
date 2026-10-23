import { Suspense, useEffect } from "react";
import { RouterProvider } from "react-router";
import { ThemeContext } from "../contexts/ThemeContext";
import { router } from "./routes";

export default function App() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    // Dynamically update the favicon to always be light mode
    const favicon = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement | null;
    if (favicon) {
      favicon.href = "/logo-dark-1.png";
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {} }}>
      <Suspense
        fallback={
          <div className="grid min-h-screen place-items-center bg-background">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </ThemeContext.Provider>
  );
}
