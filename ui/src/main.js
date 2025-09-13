import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Create event hub for Vue 3
const eventHub = createApp({ name: 'EventHub' });
app.config.globalProperties.$eventHub = eventHub;
window.$eventHub = eventHub; // For components that need access

app.mount('#app');
//# sourceMappingURL=main.js.map