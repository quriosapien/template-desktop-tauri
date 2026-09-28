<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const router = useRouter();

async function onLogout(): Promise<void> {
  await auth.logout();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <main class="mx-auto mt-16 max-w-xl p-8">
    <h1 class="mb-4 text-2xl font-bold">Dashboard</h1>
    <p class="mb-6 text-slate-600 dark:text-slate-400">
      Signed in as <strong>{{ auth.user?.name }}</strong> ({{ auth.user?.email }})
    </p>
    <div class="flex items-center gap-6">
      <button
        type="button"
        class="rounded-md bg-slate-800 px-4 py-2 font-semibold text-white dark:bg-slate-700"
        @click="onLogout"
      >
        Sign out
      </button>
      <RouterLink to="/settings" class="font-semibold text-accent underline">Settings</RouterLink>
    </div>
  </main>
</template>
