/**
 * API Configuration for Akunlama
 * Centralized configuration - modify values here instead of hardcoding in components
 */

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
    // Cloudflare Worker API URL
    apiUrl: import.meta.env.VITE_API_URL || 'https://akunlama.com/api',

    // Email domain for the disposable email service
    domain: import.meta.env.VITE_WEBSITE_DOMAIN || 'akunlama.com',

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
