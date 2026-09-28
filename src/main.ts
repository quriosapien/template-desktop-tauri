import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from '@/app.vue';
import { createAppRouter } from '@/router';
import { useUpdatesStore } from '@/stores/updates.store';
import '@/styles/index.css';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia); // before the router: the auth guard reads the store
app.use(createAppRouter());
app.mount('#app');

// Production builds look for an update once per launch; the banner offers the
// restart. Dev builds skip it — the shell would only answer "unsupported".
if (import.meta.env.PROD) {
  void useUpdatesStore(pinia).check();
}
