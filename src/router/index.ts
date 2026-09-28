import { createRouter, createWebHashHistory, type Router, type RouterHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
  }
}

/**
 * Factory instead of a singleton so tests can inject a memory history.
 *
 * The app (main.ts) uses hash history: packaged builds load from a custom
 * scheme (app:// or tauri://) that has no server to rewrite deep links back to
 * index.html, so `/#/dashboard` survives a reload where `/dashboard` would 404.
 */
export function createAppRouter(history: RouterHistory = createWebHashHistory()): Router {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: () => import('@/views/home.view.vue') },
      { path: '/login', name: 'login', component: () => import('@/views/login.view.vue') },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard.view.vue'),
        meta: { requiresAuth: true },
      },
      { path: '/settings', name: 'settings', component: () => import('@/views/settings.view.vue') },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/not-found.view.vue'),
      },
    ],
  });

  router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth) {
      return true;
    }

    const auth = useAuthStore();
    // Lazy session bootstrap: first guarded navigation after a restart tries
    // to restore the session from the keychain-persisted refresh token.
    if (auth.status === 'idle') {
      await auth.bootstrap();
    }

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    return true;
  });

  return router;
}
