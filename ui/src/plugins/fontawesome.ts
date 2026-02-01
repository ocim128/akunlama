/**
 * Font Awesome Plugin - Tree-shaken icon loading
 * Only imports the icons actually used in the application
 * Reduces bundle size from ~100KB+ to ~5KB
 */
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { App } from 'vue'

// Import only the icons used in the application
import {
    faPaperPlane,
    faDice,
    faArrowLeft,
    faSyncAlt,
    faUserCircle,
    faChevronRight,
    faInbox,
    faCat,
    faServer,
    faSun,
    faMoon,
    faCopy,
    faPrint,
    faDownload,
    faCheck,
    faArrowUp,
    faArrowDown,
    faEnvelopeOpenText,
    faHome,
    faChevronDown
} from '@fortawesome/free-solid-svg-icons'

// Add icons to the library
// Using type assertion to bypass version mismatch in Font Awesome types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const icons = [
    faPaperPlane,
    faDice,
    faArrowLeft,
    faSyncAlt,
    faUserCircle,
    faChevronRight,
    faInbox,
    faCat,
    faServer,
    faSun,
    faMoon,
    faCopy,
    faPrint,
    faDownload,
    faCheck,
    faArrowUp,
    faArrowDown,
    faEnvelopeOpenText,
    faHome,
    faChevronDown
] as const

// Add each icon individually to the library
icons.forEach(icon => library.add(icon as any))

// Export the component for global registration
export { FontAwesomeIcon }

// Plugin installer (Vue 3)
export default {
    install(app: App): void {
        app.component('font-awesome-icon', FontAwesomeIcon)
    }
}
