import { beforeEach, describe, expect, it } from 'vitest';
import { fakeNative } from '@/tests/support/fake-native';
import { tokenStorage } from '@/utils/token-storage.util';

describe('tokenStorage', () => {
  beforeEach(async () => {
    await tokenStorage.clear();
  });

  it('starts empty', async () => {
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it('stores and returns both tokens', async () => {
    await tokenStorage.setTokens('access-1', 'refresh-1');

    expect(tokenStorage.getAccessToken()).toBe('access-1');
    expect(await tokenStorage.getRefreshToken()).toBe('refresh-1');
  });

  it('persists only the refresh token, and only to the native keychain', async () => {
    await tokenStorage.setTokens('access-1', 'refresh-1');

    const stored = [...fakeNative.storedSecrets().values()];
    expect(stored).toEqual(['refresh-1']);
  });

  it('clear removes everything, including the keychain entry', async () => {
    await tokenStorage.setTokens('access-1', 'refresh-1');
    await tokenStorage.clear();

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
    expect(fakeNative.storedSecrets().size).toBe(0);
  });

  it('keeps the refresh token in memory when the keychain is unavailable', async () => {
    fakeNative.control.secretsUnavailable = true;

    await tokenStorage.setTokens('access-1', 'refresh-1');

    expect(await tokenStorage.getRefreshToken()).toBe('refresh-1');
    await tokenStorage.clear();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });
});
