import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import UpdateBanner from '@/components/update-banner.component.vue';
import { useUpdatesStore } from '@/stores/updates.store';
import { fakeNative } from '@/tests/support/fake-native';

function mountBanner() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(UpdateBanner, { global: { plugins: [pinia] } });
}

describe('UpdateBanner', () => {
  it('stays hidden unless an update is available or installing', async () => {
    const wrapper = mountBanner();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    useUpdatesStore().state = { status: 'up-to-date' };
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it('offers the restart when an update is available', async () => {
    const wrapper = mountBanner();
    useUpdatesStore().state = { status: 'available', version: '2.0.0' };
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('2.0.0');
    await wrapper.find('button').trigger('click');
    expect(fakeNative.control.installCalls).toBe(1);
  });

  it('drops the button while installing', async () => {
    const wrapper = mountBanner();
    useUpdatesStore().state = { status: 'installing', version: '2.0.0' };
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Installing');
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
