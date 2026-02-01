/**
 * Vitest Setup File
 * Configures the test environment for Vue 3 components
 */

import { vi, afterEach } from 'vitest'
import { config } from '@vue/test-utils'
import mitt from 'mitt'

// Mock event hub for Vue 3 using mitt
const emitter = mitt()
config.global.mocks = {
    $eventHub: emitter
}
config.global.provide = {
    eventHub: emitter
}

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
    },
})

// Mock scrollTo
window.scrollTo = vi.fn() as any

// Mock setInterval/clearInterval for component timing tests
vi.spyOn(window, 'setInterval')
vi.spyOn(window, 'clearInterval')

// Cleanup after each test
afterEach(() => {
    vi.clearAllMocks()
})

