/**
 * Font Awesome Plugin - Tree-shaken icon loading
 * Only imports the icons actually used in the application
 * Reduces bundle size from ~100KB+ to ~5KB
 */
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

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
library.add(
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
)

// Export the component for global registration
export { FontAwesomeIcon }

// Plugin installer (Vue 3)
export default {
    install(app) {
        app.component('font-awesome-icon', FontAwesomeIcon)
    }
}
