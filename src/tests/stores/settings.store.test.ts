import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/stores/settings.store';
import { fakeNative } from '@/tests/support/fake-native';
import { NativeError } from '@/utils/native-error.util';

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('load reads the natively persisted settings', async () => {
    await fakeNative.settings.set({ theme: 'dark' });

    const store = useSettingsStore();
    await store.load();

    expect(store.loaded).toBe(true);
    expect(store.settings.theme).toBe('dark');
  });

  it('setTheme persists through the shell and mirrors the result', async () => {
    const store = useSettingsStore();
    await store.setTheme('light');

    expect(store.settings.theme).toBe('light');
    expect((await fakeNative.settings.get()).theme).toBe('light');
  });

  it('surfaces native failures as an error message', async () => {
    const spy = vi
      .spyOn(fakeNative.settings, 'set')
      .mockRejectedValueOnce(new NativeError('io', 'Disk is read-only'));

    const store = useSettingsStore();
    await store.setTheme('dark');

    expect(store.error).toBe('Disk is read-only');
    expect(store.settings.theme).toBe('system');
    spy.mockRestore();
  });
});
