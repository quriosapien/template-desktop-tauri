/**
 * The contract between the UI and the desktop shell. The UI only ever talks to
 * the shell through `nativeApi` (src/api/native.api.ts), which implements this
 * interface — so views, stores and tests never know which shell they run in.
 */

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  theme: Theme;
}

export interface AppInfo {
  name: string;
  version: string;
  /** Node-style platform id: 'darwin' | 'win32' | 'linux'. */
  platform: string;
  arch: string;
  homepage: string;
}

export type UpdateCheck =
  | { status: 'up-to-date' }
  | { status: 'available'; version: string; notes?: string }
  /** Dev builds, unpackaged runs, or platforms where the updater can't work. */
  | { status: 'unsupported'; reason: string };

/** Actions the native menu can trigger in the UI. */
export type MenuAction = 'open-settings' | 'check-updates';

export type NativeErrorKind = 'unsupported' | 'invalid-input' | 'forbidden' | 'io' | 'internal';

/** Serialisable error shape both shells return across the IPC boundary. */
export interface NativeErrorPayload {
  kind: NativeErrorKind;
  message: string;
}

export interface NativeApi {
  app: {
    info(): Promise<AppInfo>;
  };
  /** OS keychain-backed storage for small secrets (the refresh token). */
  secrets: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  settings: {
    get(): Promise<Settings>;
    /** Merges the patch, persists it, applies it natively, and returns the result. */
    set(patch: Partial<Settings>): Promise<Settings>;
  };
  updates: {
    check(): Promise<UpdateCheck>;
    /** Downloads and installs the update found by the last check, then restarts. */
    install(): Promise<void>;
  };
  shell: {
    /** Opens an https URL in the system browser; anything else is rejected natively. */
    openExternal(url: string): Promise<void>;
  };
  /** Subscribes to native menu actions; returns an unsubscribe function. */
  onMenuAction(listener: (action: MenuAction) => void): () => void;
}
