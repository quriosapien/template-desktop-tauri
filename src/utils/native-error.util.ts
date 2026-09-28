import type { NativeErrorKind, NativeErrorPayload } from '@/types/native.types';

const KINDS: readonly NativeErrorKind[] = [
  'unsupported',
  'invalid-input',
  'forbidden',
  'io',
  'internal',
];

/** A failure reported by the desktop shell — the native twin of `HttpError`. */
export class NativeError extends Error {
  constructor(
    readonly kind: NativeErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'NativeError';
  }
}

export function isNativeErrorPayload(value: unknown): value is NativeErrorPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { kind, message } = value as Record<string, unknown>;
  return KINDS.includes(kind as NativeErrorKind) && typeof message === 'string';
}

/** Normalises whatever a shell rejected with into a NativeError. */
export function toNativeError(caught: unknown): NativeError {
  if (caught instanceof NativeError) {
    return caught;
  }
  if (isNativeErrorPayload(caught)) {
    return new NativeError(caught.kind, caught.message);
  }
  const message = caught instanceof Error ? caught.message : String(caught);
  return new NativeError('internal', message);
}
