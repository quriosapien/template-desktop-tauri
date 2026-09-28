<script setup lang="ts">
import { RouterLink } from 'vue-router';
import logoUrl from '@/assets/logo.svg';
import { config } from '@/config';
</script>

<template>
  <main class="mx-auto mt-16 max-w-xl p-8 text-center">
    <img :src="logoUrl" alt="Logo" class="mx-auto mb-6 h-16 w-16" />
    <h1 class="mb-2 text-3xl font-bold">{{ config.VITE_APP_NAME }}</h1>
    <p class="mb-8 text-slate-600 dark:text-slate-400">
      Desktop template: a Vue 3 + TS + Vite UI with keychain-backed JWT auth, native settings,
      and auto-update.
    </p>
    <nav class="flex justify-center gap-6">
      <RouterLink to="/dashboard" class="font-semibold text-accent underline">
        Go to dashboard (protected)
      </RouterLink>
      <RouterLink to="/settings" class="font-semibold text-accent underline">Settings</RouterLink>
    </nav>
  </main>
</template>
