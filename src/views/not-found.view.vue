<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <main class="mx-auto mt-16 max-w-xl p-8 text-center">
    <h1 class="mb-2 text-3xl font-bold">404</h1>
    <p class="mb-6 text-slate-600 dark:text-slate-400">This page does not exist.</p>
    <RouterLink to="/" class="font-semibold text-accent underline">Back home</RouterLink>
  </main>
</template>
