// The one UI file that differs from template-desktop-electron: this is where
// the shell-agnostic NativeApi meets Tauri's IPC. Every call is one of the
// app's own Rust commands (src-tauri/src/commands/), each granted individually
// in src-tauri/capabilities/default.json — the webview holds no plugin
// permissions of its own.
import { type InvokeArgs, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AppInfo, MenuAction, NativeApi, Settings, UpdateCheck } from '@/types/native.types';
import { toNativeError } from '@/utils/native-error.util';

/** Rust commands reject with their AppError serialised as `{ kind, message }`. */
async function call<T>(command: string, args?: InvokeArgs): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (caught) {
    throw toNativeError(caught);
  }
}

/** Event name emitted by src-tauri/src/menu.rs. */
export const MENU_ACTION_EVENT = 'menu-action';

export const nativeApi: NativeApi = {
  app: {
    info: () => call<AppInfo>('app_info'),
  },
  secrets: {
    get: (key) => call<string | null>('secret_get', { key }),
    set: (key, value) => call<void>('secret_set', { key, value }),
    delete: (key) => call<void>('secret_delete', { key }),
  },
  settings: {
    get: () => call<Settings>('settings_get'),
    set: (patch) => call<Settings>('settings_set', { patch }),
  },
  updates: {
    check: () => call<UpdateCheck>('update_check'),
    install: () => call<void>('update_install'),
  },
  shell: {
    openExternal: (url) => call<void>('open_external', { url }),
  },
  onMenuAction: (listener) => {
    // listen() is async; hand back a synchronous unsubscribe that works either way.
    const stop = listen<MenuAction>(MENU_ACTION_EVENT, (event) => listener(event.payload));
    return () => {
      void stop.then((unlisten) => unlisten());
    };
  },
};
