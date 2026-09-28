import { z } from 'zod';

/**
 * Single source of truth for every environment variable the UI consumes.
 * Vite loads `.env` / `.env.<mode>` natively (no dotenv) and exposes VITE_*
 * vars on import.meta.env; this module is the ONLY place that reads them.
 */
const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('template-desktop-tauri'),
  /**
   * Relative (`/api`) works in dev, where the Vite server answers it (mock API
   * or proxy). Packaged builds have no server behind their custom scheme, so
   * production needs an absolute URL — see .env.example.
   */
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
});

/** Exported for unit tests; app code uses the `config` singleton below. */
export function parseEnv(raw: Record<string, unknown>) {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    // Fail fast with a readable report instead of crashing deep inside the app.
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return Object.freeze(parsed.data);
}

/** Validated, typed, immutable configuration. The only place env is read. */
export const config = parseEnv(import.meta.env);

export type Config = typeof config;
