import { Suspense, useEffect } from "react";
import { RouterProvider } from "react-router";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeContext } from "../contexts/ThemeContext";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";

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
      favicon.href = "/AC_logo.png";
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {} }}>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center bg-background">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            </div>
          }
        >
          <RouterProvider router={router} />
        </Suspense>
        <Toaster
          position="top-right"
          richColors
          theme="light"
        />
      </AuthProvider>
    </ThemeContext.Provider>
  );
}
