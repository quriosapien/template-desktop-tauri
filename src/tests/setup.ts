import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from '@/mocks/server';
import { fakeNative } from '@/tests/support/fake-native';
import { tokenStorage } from '@/utils/token-storage.util';

// Every test talks to the in-memory fake shell. native.api.test.ts opts back
// into the real implementation with vi.importActual.
vi.mock('@/api/native.api', async () => ({
  nativeApi: (await import('@/tests/support/fake-native')).fakeNative,
}));

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(async () => {
  server.resetHandlers();
  await tokenStorage.clear();
  fakeNative.reset();
});

afterAll(() => server.close());
