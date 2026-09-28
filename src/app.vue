<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import { nativeApi } from '@/api/native.api';
import UpdateBanner from '@/components/update-banner.component.vue';
import { useUpdatesStore } from '@/stores/updates.store';
import type { MenuAction } from '@/types/native.types';

const router = useRouter();
const updates = useUpdatesStore();

// The native menu lives in the shell; it only tells the UI *what* to do.
const menuActions: Record<MenuAction, () => void> = {
  'open-settings': () => void router.push({ name: 'settings' }),
  'check-updates': () => void updates.check(),
};

const unsubscribe = nativeApi.onMenuAction((action) => menuActions[action]());
onBeforeUnmount(unsubscribe);
</script>

<template>
  <UpdateBanner />
  <RouterView />
</template>
