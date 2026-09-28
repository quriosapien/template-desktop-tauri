import type { AppInfo, MenuAction, NativeApi, Settings, UpdateCheck } from '@/types/native.types';
import { NativeError } from '@/utils/native-error.util';

export const FAKE_APP_INFO: AppInfo = {
  name: 'Fake App',
  version: '1.2.3',
  platform: 'darwin',
  arch: 'arm64',
  homepage: 'https://example.com/fake-app',
};

const DEFAULT_SETTINGS: Settings = { theme: 'system' };

/**
 * In-memory stand-in for the desktop shell. `src/tests/setup.ts` swaps it in
 * for `@/api/native.api` in every test, so UI code runs without a shell.
 */
export function createFakeNative() {
  let secrets = new Map<string, string>();
  let settings: Settings = { ...DEFAULT_SETTINGS };
  let listeners = new Set<(action: MenuAction) => void>();

  const control = {
    /** Set to make every secrets call reject, e.g. Linux without a keyring. */
    secretsUnavailable: false,
    nextUpdateCheck: { status: 'up-to-date' } as UpdateCheck,
    installCalls: 0,
    openedUrls: [] as string[],
  };

  const assertSecretsAvailable = () => {
    if (control.secretsUnavailable) {
      throw new NativeError('unsupported', 'No keychain available');
    }
  };

  const api: NativeApi = {
    app: {
      info: async () => ({ ...FAKE_APP_INFO }),
    },
    secrets: {
      get: async (key) => {
        assertSecretsAvailable();
        return secrets.get(key) ?? null;
      },
      set: async (key, value) => {
        assertSecretsAvailable();
        secrets.set(key, value);
      },
      delete: async (key) => {
        assertSecretsAvailable();
        secrets.delete(key);
      },
    },
    settings: {
      get: async () => ({ ...settings }),
      set: async (patch) => {
        settings = { ...settings, ...patch };
        return { ...settings };
      },
    },
    updates: {
      check: async () => control.nextUpdateCheck,
      install: async () => {
        control.installCalls += 1;
      },
    },
    shell: {
      openExternal: async (url) => {
        control.openedUrls.push(url);
      },
    },
    onMenuAction: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    ...api,
    control,
    storedSecrets: () => new Map(secrets),
    emitMenuAction: (action: MenuAction) => {
      for (const listener of listeners) listener(action);
    },
    reset: () => {
      secrets = new Map();
      settings = { ...DEFAULT_SETTINGS };
      listeners = new Set();
      control.secretsUnavailable = false;
      control.nextUpdateCheck = { status: 'up-to-date' };
      control.installCalls = 0;
      control.openedUrls = [];
    },
  };
}

export const fakeNative = createFakeNative();
