import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'tavrida-theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('light');

  function apply(modeValue: ThemeMode) {
    document.documentElement.dataset.theme = modeValue;
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    mode.value = saved ?? (systemPrefersDark() ? 'dark' : 'light');
    apply(mode.value);
  }

  function toggle() {
    mode.value = mode.value === 'light' ? 'dark' : 'light';
  }

  function setTheme(next: ThemeMode) {
    mode.value = next;
  }

  watch(mode, (value) => {
    apply(value);
    localStorage.setItem(STORAGE_KEY, value);
  });

  return { mode, init, toggle, setTheme };
});
