import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => set((state) => {
        const nextMode = !state.isDarkMode;
        document.documentElement.setAttribute('data-theme', nextMode ? 'dark' : 'light');
        return { isDarkMode: nextMode };
      }),
      initTheme: () => {
        const theme = localStorage.getItem('theme-storage');
        if (theme) {
          const parsed = JSON.parse(theme);
          document.documentElement.setAttribute('data-theme', parsed.state.isDarkMode ? 'dark' : 'light');
        }
      }
    }),
    {
      name: 'theme-storage',
    }
  )
);

export default useThemeStore;
