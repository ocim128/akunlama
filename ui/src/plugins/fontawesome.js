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
    faServer
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
    faServer
)

// Export the component for global registration
export { FontAwesomeIcon }

// Plugin installer
export default {
    install(Vue) {
        Vue.component('font-awesome-icon', FontAwesomeIcon)
    }
}
