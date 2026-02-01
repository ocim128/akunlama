// Vue 3 Application Entry Point
import { createApp, type App as VueApp } from 'vue'
import App from "./App.vue"
import router from './router'
import { createPinia } from 'pinia'
import mitt, { type Emitter } from 'mitt'

// Font Awesome - tree-shaken icon library
import { FontAwesomeIcon } from './plugins/fontawesome'

// Event types for the event bus
type Events = {
    [key: string]: unknown;
};

// Create Vue 3 app instance
const app: VueApp = createApp(App)

// Event bus using mitt (replaces Vue 2 EventHub pattern)
const emitter: Emitter<Events> = mitt<Events>()
app.config.globalProperties.$eventHub = emitter
app.provide('eventHub', emitter)

// Register global components
app.component('font-awesome-icon', FontAwesomeIcon)

// Use plugins
app.use(createPinia())
app.use(router)

// Mount the app
app.mount('#app')
