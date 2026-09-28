import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import App from '@/app.vue';
import { createAppRouter } from '@/router';
import { useUpdatesStore } from '@/stores/updates.store';
import { fakeNative } from '@/tests/support/fake-native';

async function mountApp() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter(createMemoryHistory());
  await router.push('/');
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [pinia, router] } });
  return { wrapper, router };
}

describe('App menu actions', () => {
  it('"open-settings" navigates to the settings view', async () => {
    const { router } = await mountApp();

    fakeNative.emitMenuAction('open-settings');

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('settings'));
  });

  it('"check-updates" runs an update check', async () => {
    fakeNative.control.nextUpdateCheck = { status: 'available', version: '3.0.0' };
    await mountApp();

    fakeNative.emitMenuAction('check-updates');
    await flushPromises();

    expect(useUpdatesStore().state).toEqual({ status: 'available', version: '3.0.0' });
  });

  it('unsubscribes from menu actions when unmounted', async () => {
    const { wrapper, router } = await mountApp();
    const push = vi.spyOn(router, 'push');
    wrapper.unmount();

    fakeNative.emitMenuAction('open-settings');
    await flushPromises();

    expect(push).not.toHaveBeenCalled();
  });
});
