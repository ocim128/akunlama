/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test'

const configuredPort = Number(process.env.PLAYWRIGHT_PORT)
const e2ePort = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 5173
const baseURL = `http://127.0.0.1:${e2ePort}`

export default defineConfig({
    testDir: './tests/e2e',

    // Test timeout
    timeout: 60 * 1000,
    expect: {
        timeout: 10000
    },

    // Run tests in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI
    workers: process.env.CI ? 1 : undefined,

    // Reporter
    reporter: [
        ['html', { outputFolder: 'tests/e2e-results' }],
        ['list']
    ],

    // Shared settings for all projects
    use: {
        // Base URL for the app
        baseURL,

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'on-first-retry',

        // Browser viewport
        viewport: { width: 1280, height: 720 },
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        // Mobile viewports
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],

    // Run local dev server before starting the tests
    webServer: {
        command: `npx vite --host 127.0.0.1 --port ${e2ePort} --strictPort`,
        url: baseURL,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
        timeout: 120 * 1000,
    },
})
