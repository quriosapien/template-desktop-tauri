import { defineStore } from 'pinia';
import { ref } from 'vue';
import { nativeApi } from '@/api/native.api';
import type { Settings, Theme } from '@/types/native.types';
import { toNativeError } from '@/utils/native-error.util';

/**
 * Mirror of the natively persisted settings. The shell owns persistence and
 * applies each setting (e.g. the theme, which the webview's
 * prefers-color-scheme then follows) — this store only reads and requests.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({ theme: 'system' });
  const loaded = ref(false);
  const error = ref<string | null>(null);

  async function load(): Promise<void> {
    try {
      settings.value = await nativeApi.settings.get();
      loaded.value = true;
      error.value = null;
    } catch (caught) {
      error.value = toNativeError(caught).message;
    }
  }

  async function setTheme(theme: Theme): Promise<void> {
    try {
      settings.value = await nativeApi.settings.set({ theme });
      error.value = null;
    } catch (caught) {
      error.value = toNativeError(caught).message;
    }
  }

  return { settings, loaded, error, load, setTheme };
});
