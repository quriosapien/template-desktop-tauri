import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { nativeApi } from '@/api/native.api';
import type { UpdateCheck } from '@/types/native.types';
import { toNativeError } from '@/utils/native-error.util';

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | UpdateCheck
  | { status: 'installing'; version: string }
  | { status: 'error'; message: string };

/** One human-readable line per state, shared by the settings view and the banner. */
export function describeUpdateState(state: UpdateState): string {
  switch (state.status) {
    case 'idle':
      return 'Not checked yet.';
    case 'checking':
      return 'Checking for updates…';
    case 'up-to-date':
      return 'You’re on the latest version.';
    case 'available':
      return `Version ${state.version} is available.`;
    case 'installing':
      return `Installing version ${state.version}…`;
    case 'unsupported':
      return `Updates unavailable: ${state.reason}`;
    case 'error':
      return `Update failed: ${state.message}`;
  }
}

export const useUpdatesStore = defineStore('updates', () => {
  const state = ref<UpdateState>({ status: 'idle' });
  const summary = computed(() => describeUpdateState(state.value));

  async function check(): Promise<void> {
    if (state.value.status === 'checking' || state.value.status === 'installing') {
      return;
    }
    state.value = { status: 'checking' };
    try {
      state.value = await nativeApi.updates.check();
    } catch (caught) {
      state.value = { status: 'error', message: toNativeError(caught).message };
    }
  }

  /** Only valid after a check found an update; the shell restarts the app on success. */
  async function install(): Promise<void> {
    if (state.value.status !== 'available') {
      return;
    }
    state.value = { status: 'installing', version: state.value.version };
    try {
      await nativeApi.updates.install();
    } catch (caught) {
      state.value = { status: 'error', message: toNativeError(caught).message };
    }
  }

  return { state, summary, check, install };
});
