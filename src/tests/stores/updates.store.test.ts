import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeUpdateState, useUpdatesStore } from '@/stores/updates.store';
import { fakeNative } from '@/tests/support/fake-native';
import { NativeError } from '@/utils/native-error.util';

describe('useUpdatesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('check stores the shell’s answer', async () => {
    fakeNative.control.nextUpdateCheck = { status: 'available', version: '2.0.0' };

    const store = useUpdatesStore();
    await store.check();

    expect(store.state).toEqual({ status: 'available', version: '2.0.0' });
  });

  it('check reports unsupported environments as-is (e.g. dev builds)', async () => {
    fakeNative.control.nextUpdateCheck = { status: 'unsupported', reason: 'Development build' };

    const store = useUpdatesStore();
    await store.check();

    expect(store.state.status).toBe('unsupported');
  });

  it('check turns native failures into an error state', async () => {
    const spy = vi
      .spyOn(fakeNative.updates, 'check')
      .mockRejectedValueOnce(new NativeError('io', 'Offline'));

    const store = useUpdatesStore();
    await store.check();

    expect(store.state).toEqual({ status: 'error', message: 'Offline' });
    spy.mockRestore();
  });

  it('install only runs after a check found an update', async () => {
    const store = useUpdatesStore();
    await store.install();
    expect(fakeNative.control.installCalls).toBe(0);

    fakeNative.control.nextUpdateCheck = { status: 'available', version: '2.0.0' };
    await store.check();
    await store.install();

    expect(fakeNative.control.installCalls).toBe(1);
    expect(store.state).toEqual({ status: 'installing', version: '2.0.0' });
  });

  it('install failures move to the error state', async () => {
    fakeNative.control.nextUpdateCheck = { status: 'available', version: '2.0.0' };
    const spy = vi
      .spyOn(fakeNative.updates, 'install')
      .mockRejectedValueOnce(new NativeError('internal', 'Signature mismatch'));

    const store = useUpdatesStore();
    await store.check();
    await store.install();

    expect(store.state).toEqual({ status: 'error', message: 'Signature mismatch' });
    spy.mockRestore();
  });
});

describe('describeUpdateState', () => {
  it('has a message for every state', () => {
    expect(describeUpdateState({ status: 'idle' })).toBe('Not checked yet.');
    expect(describeUpdateState({ status: 'checking' })).toContain('Checking');
    expect(describeUpdateState({ status: 'up-to-date' })).toContain('latest');
    expect(describeUpdateState({ status: 'available', version: '2.0.0' })).toContain('2.0.0');
    expect(describeUpdateState({ status: 'installing', version: '2.0.0' })).toContain('2.0.0');
    expect(describeUpdateState({ status: 'unsupported', reason: 'Dev build' })).toContain(
      'Dev build',
    );
    expect(describeUpdateState({ status: 'error', message: 'Offline' })).toContain('Offline');
  });
});
