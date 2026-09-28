import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/config/env';

describe('parseEnv', () => {
  it('applies defaults when optional vars are missing', () => {
    const config = parseEnv({});
    expect(config.VITE_APP_NAME).toBe('template-desktop-tauri');
    expect(config.VITE_API_BASE_URL).toBe('/api');
  });

  it('accepts an absolute API base for packaged builds', () => {
    const config = parseEnv({ VITE_API_BASE_URL: 'https://api.example.com' });
    expect(config.VITE_API_BASE_URL).toBe('https://api.example.com');
  });

  it('rejects invalid values with a readable error', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: '' })).toThrow(/VITE_API_BASE_URL/);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(parseEnv({}))).toBe(true);
  });
});
