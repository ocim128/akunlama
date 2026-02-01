/**
 * API Configuration for Akunlama
 * Centralized configuration - modify values here instead of hardcoding in components
 */

/**
 * Get the current domain from the browser's location.
 * Falls back to environment variable or default for SSR/testing scenarios.
 */
function getCurrentDomain(): string {
    // In browser environment, use the actual hostname
    if (typeof window !== 'undefined' && window.location?.hostname) {
        const hostname = window.location.hostname
        // For localhost development, use env variable or default
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return import.meta.env.VITE_WEBSITE_DOMAIN || 'akunlama.com'
        }
        return hostname
    }
    // Fallback for SSR or testing
    return import.meta.env.VITE_WEBSITE_DOMAIN || 'akunlama.com'
}

/**
 * Get the API URL based on the current domain.
 * Uses the same domain as the current page with /api path.
 */
function getApiUrl(): string {
    // If explicitly set, use the environment variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL
    }

    // In browser, construct API URL from current location
    if (typeof window !== 'undefined' && window.location?.hostname) {
        const hostname = window.location.hostname
        // For localhost, default to akunlama.com API
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'https://akunlama.com/api'
        }
        // Use the same protocol and domain with /api path
        return `${window.location.protocol}//${hostname}/api`
    }

    // Fallback
    return 'https://akunlama.com/api'
}

interface ApiConfig {
    apiUrl: string
    domain: string
    autoRefreshInterval: number
    requestTimeout: number
    copyFeedbackDuration: number
    maxEmailsDisplay: number
    retentionPeriod: string
    enablePullToRefresh: boolean
    enableStreaming: boolean
}

const config: ApiConfig = {
    // ===== API Settings =====
    // Auto-detected from current domain, or falls back to env/default
    apiUrl: getApiUrl(),

    // Email domain - auto-detected from current hostname
    domain: getCurrentDomain(),

    // ===== Timeouts & Intervals =====
    // Auto-refresh interval for inbox (milliseconds)
    autoRefreshInterval: 30000, // 30 seconds

    // API request timeout (milliseconds)
    requestTimeout: 10000, // 10 seconds

    // Copy feedback display duration (milliseconds)
    copyFeedbackDuration: 2000, // 2 seconds

    // ===== UI Settings =====
    // Maximum emails to display in list
    maxEmailsDisplay: 50,

    // Email retention period display text
    retentionPeriod: '3 days',

    // ===== Feature Flags =====
    // Enable pull-to-refresh on mobile
    enablePullToRefresh: true,

    // Enable SSE streaming for real-time updates
    enableStreaming: true
}

export default config
