<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { nativeApi } from '@/api/native.api';
import { useSettingsStore } from '@/stores/settings.store';
import { useUpdatesStore } from '@/stores/updates.store';
import type { AppInfo, Theme } from '@/types/native.types';
import { toNativeError } from '@/utils/native-error.util';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const settingsStore = useSettingsStore();
const updates = useUpdatesStore();
const appInfo = ref<AppInfo | null>(null);
const linkError = ref<string | null>(null);

onMounted(async () => {
  await settingsStore.load();
  appInfo.value = await nativeApi.app.info();
});

async function openHomepage(): Promise<void> {
  if (!appInfo.value) {
    return;
  }
  try {
    await nativeApi.shell.openExternal(appInfo.value.homepage);
    linkError.value = null;
  } catch (caught) {
    linkError.value = toNativeError(caught).message;
  }
}
</script>

<template>
  <main class="mx-auto mt-16 flex max-w-xl flex-col gap-8 p-8">
    <h1 class="text-2xl font-bold">Settings</h1>

    <section>
      <h2 class="mb-3 font-semibold">Appearance</h2>
      <fieldset class="flex gap-4" aria-label="Theme">
        <label v-for="theme in THEMES" :key="theme.value" class="flex items-center gap-2">
          <input
            type="radio"
            name="theme"
            :value="theme.value"
            :checked="settingsStore.settings.theme === theme.value"
            @change="settingsStore.setTheme(theme.value)"
          />
          {{ theme.label }}
        </label>
      </fieldset>
      <p v-if="settingsStore.error" class="mt-2 text-sm text-red-600">{{ settingsStore.error }}</p>
    </section>

    <section>
      <h2 class="mb-3 font-semibold">Updates</h2>
      <p class="mb-3 text-slate-600 dark:text-slate-400" data-test="update-summary">
        {{ updates.summary }}
      </p>
      <div class="flex gap-3">
        <button
          type="button"
          class="rounded-md border border-slate-300 px-4 py-2 font-semibold dark:border-slate-700"
          :disabled="updates.state.status === 'checking' || updates.state.status === 'installing'"
          @click="updates.check()"
        >
          Check for updates
        </button>
        <button
          v-if="updates.state.status === 'available'"
          type="button"
          class="rounded-md bg-accent px-4 py-2 font-semibold text-white"
          @click="updates.install()"
        >
          Restart to install
        </button>
      </div>
    </section>

    <section v-if="appInfo">
      <h2 class="mb-3 font-semibold">About</h2>
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm" data-test="app-info">
        <dt class="text-slate-500">Name</dt>
        <dd>{{ appInfo.name }}</dd>
        <dt class="text-slate-500">Version</dt>
        <dd>{{ appInfo.version }}</dd>
        <dt class="text-slate-500">Platform</dt>
        <dd>{{ appInfo.platform }} ({{ appInfo.arch }})</dd>
      </dl>
      <button type="button" class="mt-3 font-semibold text-accent underline" @click="openHomepage">
        Project homepage
      </button>
      <p v-if="linkError" class="mt-2 text-sm text-red-600">{{ linkError }}</p>
    </section>

    <RouterLink to="/" class="font-semibold text-accent underline">Back home</RouterLink>
  </main>
</template>
