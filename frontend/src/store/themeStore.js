import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: true,
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
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      }
    }),
    {
      name: 'theme-storage',
    }
  )
);

export default useThemeStore;
