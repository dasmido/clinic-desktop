import { ref, computed } from 'vue';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'clinic_desktop_theme';

const currentTheme = ref<ThemeMode>('light');

/**
 * Initializes theme from localStorage or system preference.
 */
export function initTheme(): void {
  const savedTheme = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }
}

/**
 * Applies the selected theme mode ('light' or 'dark').
 */
export function applyTheme(mode: ThemeMode): void {
  currentTheme.value = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  document.documentElement.setAttribute('data-theme', mode);
  if (mode === 'dark') {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
}

/**
 * Toggles between light and dark theme.
 */
export function toggleTheme(): void {
  applyTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
}

/**
 * Vue composable for theme management.
 */
export function useTheme() {
  return {
    currentTheme,
    isDark: computed(() => currentTheme.value === 'dark'),
    applyTheme,
    toggleTheme,
  };
}
