<script setup lang="ts">
import { useUpdatesStore } from '@/stores/updates.store';

const updates = useUpdatesStore();
</script>

<template>
  <div
    v-if="updates.state.status === 'available' || updates.state.status === 'installing'"
    role="status"
    class="flex items-center justify-center gap-4 bg-accent px-4 py-2 text-sm text-white"
  >
    <span>{{ updates.summary }}</span>
    <button
      v-if="updates.state.status === 'available'"
      type="button"
      class="rounded bg-white/20 px-3 py-1 font-semibold"
      @click="updates.install()"
    >
      Restart to install
    </button>
  </div>
</template>
