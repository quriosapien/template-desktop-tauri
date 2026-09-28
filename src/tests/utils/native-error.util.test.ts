import { describe, expect, it } from 'vitest';
import { isNativeErrorPayload, NativeError, toNativeError } from '@/utils/native-error.util';

describe('isNativeErrorPayload', () => {
  it('accepts a known kind with a message', () => {
    expect(isNativeErrorPayload({ kind: 'io', message: 'disk full' })).toBe(true);
  });

  it('rejects unknown kinds and non-objects', () => {
    expect(isNativeErrorPayload({ kind: 'nope', message: 'x' })).toBe(false);
    expect(isNativeErrorPayload({ kind: 'io' })).toBe(false);
    expect(isNativeErrorPayload('io')).toBe(false);
    expect(isNativeErrorPayload(null)).toBe(false);
  });
});

describe('toNativeError', () => {
  it('returns NativeError instances unchanged', () => {
    const error = new NativeError('forbidden', 'no');
    expect(toNativeError(error)).toBe(error);
  });

  it('converts a serialised payload, keeping its kind', () => {
    const error = toNativeError({ kind: 'unsupported', message: 'no keychain' });

    expect(error).toBeInstanceOf(NativeError);
    expect(error.kind).toBe('unsupported');
    expect(error.message).toBe('no keychain');
  });

  it('wraps anything else as an internal error', () => {
    expect(toNativeError(new Error('boom'))).toMatchObject({ kind: 'internal', message: 'boom' });
    expect(toNativeError('plain string')).toMatchObject({
      kind: 'internal',
      message: 'plain string',
    });
  });
});
