import { create } from "zustand";
import { persist } from "zustand/middleware";

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: "light",
      
      setTheme: (theme) => {
        set({ theme });
        // Immediately update body class when theme is changed
        updateBodyClass(theme);
      },
      
      toggleTheme: () => {
        const newTheme = get().theme === "light" ? "dark" : "light";
        set({ theme: newTheme });
        // Immediately update body class when theme is toggled
        updateBodyClass(newTheme);
      },

      // Initialize theme on app load
      init: () => {
        const currentTheme = get().theme;
        updateBodyClass(currentTheme);
      }
    }),
    {
      name: "theme-storage",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : { state: { theme: "light" } };
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Helper function to update body classes
const updateBodyClass = (theme) => {
  if (typeof window !== "undefined") {
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(`theme-${theme}`);
  }
};

export default useThemeStore;