import { emit } from '@tauri-apps/api/event';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as NativeApiModule from '@/api/native.api';
import { FAKE_APP_INFO } from '@/tests/support/fake-native';
import type { MenuAction } from '@/types/native.types';
import { NativeError } from '@/utils/native-error.util';

// setup.ts swaps in the fake shell everywhere; this suite tests the real one.
const { MENU_ACTION_EVENT, nativeApi } =
  await vi.importActual<typeof NativeApiModule>('@/api/native.api');

type Call = { cmd: string; payload: unknown };

function recordIpc(respond: (cmd: string) => unknown = () => null) {
  const calls: Call[] = [];
  mockIPC(
    (cmd, payload) => {
      calls.push({ cmd, payload });
      return respond(cmd);
    },
    { shouldMockEvents: true },
  );
  return calls;
}

describe('nativeApi (Tauri)', () => {
  afterEach(() => {
    clearMocks();
  });

  it('maps each method to its Rust command and arguments', async () => {
    const calls = recordIpc();

    await nativeApi.app.info();
    await nativeApi.secrets.get('refresh-token');
    await nativeApi.secrets.set('refresh-token', 'value');
    await nativeApi.secrets.delete('refresh-token');
    await nativeApi.settings.get();
    await nativeApi.settings.set({ theme: 'dark' });
    await nativeApi.updates.check();
    await nativeApi.updates.install();
    await nativeApi.shell.openExternal('https://example.com');

    expect(calls).toEqual([
      { cmd: 'app_info', payload: {} },
      { cmd: 'secret_get', payload: { key: 'refresh-token' } },
      { cmd: 'secret_set', payload: { key: 'refresh-token', value: 'value' } },
      { cmd: 'secret_delete', payload: { key: 'refresh-token' } },
      { cmd: 'settings_get', payload: {} },
      { cmd: 'settings_set', payload: { patch: { theme: 'dark' } } },
      { cmd: 'update_check', payload: {} },
      { cmd: 'update_install', payload: {} },
      { cmd: 'open_external', payload: { url: 'https://example.com' } },
    ]);
  });

  it('returns command results', async () => {
    recordIpc((cmd) => (cmd === 'app_info' ? FAKE_APP_INFO : { status: 'up-to-date' }));

    expect(await nativeApi.app.info()).toEqual(FAKE_APP_INFO);
    expect(await nativeApi.updates.check()).toEqual({ status: 'up-to-date' });
  });

  it('turns serialised Rust AppErrors into NativeError with the native kind', async () => {
    mockIPC(() => {
      throw { kind: 'unsupported', message: 'No keychain' };
    });

    const failure = await nativeApi.secrets.get('refresh-token').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NativeError);
    expect(failure).toMatchObject({ kind: 'unsupported', message: 'No keychain' });
  });

  it('wraps unstructured failures (e.g. a missing permission) as internal', async () => {
    mockIPC(() => {
      throw 'secret_get not allowed. Permissions associated with this command: allow-secret-get';
    });

    const failure = await nativeApi.secrets.get('refresh-token').catch((error: unknown) => error);

    expect(failure).toMatchObject({
      kind: 'internal',
      message: expect.stringContaining('allowed'),
    });
  });

  it('delivers menu events until unsubscribed', async () => {
    recordIpc();
    const received: MenuAction[] = [];

    const unsubscribe = nativeApi.onMenuAction((action) => received.push(action));
    await vi.waitFor(async () => {
      await emit(MENU_ACTION_EVENT, 'open-settings');
      expect(received).toContain('open-settings');
    });

    unsubscribe();
    await vi.waitFor(async () => {
      const before = received.length;
      await emit(MENU_ACTION_EVENT, 'check-updates');
      expect(received.length).toBe(before);
    });
  });
});
