import { nativeApi } from '@/api/native.api';
import { NativeError } from '@/utils/native-error.util';

const REFRESH_TOKEN_KEY = 'refresh-token';

/**
 * Access token lives ONLY in memory — it is short-lived and re-obtainable, so
 * it never touches persistent storage.
 *
 * The refresh token is persisted in the OS keychain (via the shell's secrets
 * API) so sessions survive an app restart — never in localStorage, which any
 * script in the webview could read. When no keychain is available (e.g. Linux
 * without a secret service), it falls back to memory: the session then simply
 * doesn't survive a restart.
 */
let accessToken: string | null = null;
let memoryRefreshToken: string | null = null;

const isUnsupported = (caught: unknown) =>
  caught instanceof NativeError && caught.kind === 'unsupported';

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  async getRefreshToken(): Promise<string | null> {
    if (memoryRefreshToken) {
      return memoryRefreshToken;
    }
    try {
      return await nativeApi.secrets.get(REFRESH_TOKEN_KEY);
    } catch (caught) {
      if (isUnsupported(caught)) {
        return null;
      }
      throw caught;
    }
  },

  async setTokens(nextAccessToken: string, nextRefreshToken: string): Promise<void> {
    accessToken = nextAccessToken;
    try {
      await nativeApi.secrets.set(REFRESH_TOKEN_KEY, nextRefreshToken);
      memoryRefreshToken = null;
    } catch (caught) {
      if (!isUnsupported(caught)) {
        throw caught;
      }
      memoryRefreshToken = nextRefreshToken;
    }
  },

  async clear(): Promise<void> {
    accessToken = null;
    memoryRefreshToken = null;
    try {
      await nativeApi.secrets.delete(REFRESH_TOKEN_KEY);
    } catch (caught) {
      if (!isUnsupported(caught)) {
        throw caught;
      }
    }
  },
};
