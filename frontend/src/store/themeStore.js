import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => set((state) => {
        const nextMode = !state.isDarkMode;
        document.documentElement.setAttribute('data-theme', nextMode ? 'dark' : 'light');
        if (nextMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { isDarkMode: nextMode };
      }),
      initTheme: () => {
        const theme = localStorage.getItem('theme-storage');
        let isDark = false;
        if (theme) {
          try {
            const parsed = JSON.parse(theme);
            isDark = parsed.state.isDarkMode;
          } catch (e) {
            console.error(e);
          }
        }
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }),
    {
      name: 'theme-storage',
    }
  )
);

export default useThemeStore;
