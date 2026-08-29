import { ref, computed } from 'vue';
import { setTheme } from '@ui5/webcomponents-base/dist/config/Theme.js';

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
  const ui5Theme = mode === 'dark' ? 'sap_horizon_dark' : 'sap_horizon';
  setTheme(ui5Theme);
  document.documentElement.setAttribute('data-sap-theme', ui5Theme);
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
