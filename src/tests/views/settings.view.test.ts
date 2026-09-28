import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '@/router';
import { FAKE_APP_INFO, fakeNative } from '@/tests/support/fake-native';
import SettingsView from '@/views/settings.view.vue';

async function mountSettings() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter(createMemoryHistory());
  await router.push('/settings');
  await router.isReady();
  const wrapper = mount(SettingsView, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return wrapper;
}

describe('SettingsView', () => {
  it('shows the persisted theme and the app info from the shell', async () => {
    await fakeNative.settings.set({ theme: 'dark' });

    const wrapper = await mountSettings();

    expect(wrapper.find<HTMLInputElement>('input[value="dark"]').element.checked).toBe(true);
    expect(wrapper.find('[data-test="app-info"]').text()).toContain(FAKE_APP_INFO.version);
  });

  it('persists a theme change through the shell', async () => {
    const wrapper = await mountSettings();

    await wrapper.find('input[value="light"]').trigger('change');
    await flushPromises();

    expect((await fakeNative.settings.get()).theme).toBe('light');
  });

  it('checks for updates and offers the install when one is found', async () => {
    fakeNative.control.nextUpdateCheck = { status: 'available', version: '9.9.9' };
    const wrapper = await mountSettings();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="update-summary"]').text()).toContain('9.9.9');
    const install = wrapper.findAll('button').find((b) => b.text() === 'Restart to install');
    await install?.trigger('click');
    expect(fakeNative.control.installCalls).toBe(1);
  });

  it('opens the project homepage externally', async () => {
    const wrapper = await mountSettings();

    const link = wrapper.findAll('button').find((b) => b.text() === 'Project homepage');
    await link?.trigger('click');
    await flushPromises();

    expect(fakeNative.control.openedUrls).toEqual([FAKE_APP_INFO.homepage]);
  });
});
