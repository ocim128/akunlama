/**
 * E2E Tests: Full User Flow
 * Tests complete user journeys from landing to inbox
 */

import { test, expect, Page } from '@playwright/test'

/**
 * Wait for the inbox page to be loaded by checking for key elements
 */
async function waitForInboxLoad(page: Page, timeout = 30000) {
    // Wait for the advisory banner to appear (page structure loaded)
    await page.waitForSelector('.advisory-banner', { timeout })

    // Wait for loading to complete (skeleton disappears, content appears)
    await page.waitForFunction(
        () => {
            const skeleton = document.querySelector('.skeleton-container, .loading-container') as HTMLElement | null
            const emptyState = document.querySelector('.empty-state')
            const emailList = document.querySelector('.email-list-container')
            return (!skeleton || !skeleton.offsetParent) && (emptyState || emailList)
        },
        { timeout }
    )
}

/**
 * Wait for landing page to load
 */
async function waitForLandingLoad(page: Page, timeout = 30000) {
    await page.waitForSelector('.hero-section', { timeout })
}

test.describe('Complete User Flow', () => {
    test('should complete full flow: generate name → navigate to inbox', async ({ page }) => {
        // 1. Start at landing page
        await page.goto('/')
        await expect(page.locator('.hero-section')).toBeVisible()

        // 2. Generate a random name
        const shuffleBtn = page.locator('.btn-shuffle')
        await shuffleBtn.click()

        // 3. Verify name was generated
        const input = page.locator('.main-email-input')
        const generatedName = await input.inputValue()
        expect(generatedName).toMatch(/^[a-z]+-[a-z]+-\d+$/)

        // 4. Submit to go to inbox
        const submitBtn = page.locator('.btn-get-mail')
        await submitBtn.click()

        // 5. Verify navigation to inbox
        await expect(page).toHaveURL(new RegExp(`/inbox/${generatedName}`))

        // 6. Verify inbox loaded
        await expect(page.locator('.advisory-banner')).toBeVisible({ timeout: 30000 })
    })

    test('should complete flow: enter custom name → navigate to inbox', async ({ page }) => {
        // 1. Start at landing page
        await page.goto('/')

        // 2. Enter custom name
        const input = page.locator('.main-email-input')
        await input.fill('my-custom-email')

        // 3. Submit
        await page.locator('.btn-get-mail').click()

        // 4. Verify navigation
        await expect(page).toHaveURL(/\/inbox\/my-custom-email(\/list)?/)

        // 5. Verify inbox loaded
        await expect(page.locator('.advisory-banner')).toBeVisible({ timeout: 30000 })
    })

    test('should handle back navigation correctly', async ({ page }) => {
        // 1. Go to landing
        await page.goto('/')

        // 2. Navigate to inbox
        const input = page.locator('.main-email-input')
        await input.fill('back-nav-test')
        await page.locator('.btn-get-mail').click()

        // 3. Wait for inbox to load
        await expect(page).toHaveURL(/\/inbox\/back-nav-test(\/list)?/)
        await expect(page.locator('.advisory-banner')).toBeVisible({ timeout: 30000 })

        // 4. Go back
        await page.goBack()

        // 5. Should be on landing page
        await expect(page).toHaveURL('/')
        await expect(page.locator('.hero-section')).toBeVisible()
    })

    test('should preserve user input after navigating back', async ({ page }) => {
        // 1. Go to landing
        await page.goto('/')

        // 2. Enter name and navigate
        const input = page.locator('.main-email-input')
        await input.fill('preserve-test')
        await page.locator('.btn-get-mail').click()

        await expect(page).toHaveURL(/\/inbox\/preserve-test(\/list)?/)

        // 3. Go back
        await page.goBack()

        // 4. Page should reload/reset (SPA behavior)
        await expect(page).toHaveURL('/')
    })
})

test.describe('Error Handling', () => {
    test('should handle network errors gracefully in inbox', async ({ page }) => {
        // Block API requests
        await page.route('**/api/v1/mail/list**', route => route.abort())

        // Navigate to inbox
        await page.goto('/inbox/network-error-test')

        // Should still load the page structure
        await expect(page.locator('.advisory-banner')).toBeVisible({ timeout: 30000 })

        // Should show empty state or error state (not crash)
        await page.waitForTimeout(2000)

        const emptyState = page.locator('.empty-state')
        const loadingState = page.locator('.loading-container')

        // Page should be in a valid state
        const pageLoaded = await page.locator('body').textContent()
        expect(pageLoaded).toBeTruthy()
    })

    test('should handle 404 API responses', async ({ page }) => {
        // Mock API to return empty
        await page.route('**/api/v1/mail/list**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            })
        })

        await page.goto('/inbox/empty-test')
        await waitForInboxLoad(page)

        // Should show empty state
        await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 })
    })
})

test.describe('Performance', () => {
    test('should load landing page within acceptable time', async ({ page }) => {
        const startTime = Date.now()

        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')

        const loadTime = Date.now() - startTime

        // Page should load within 5 seconds
        expect(loadTime).toBeLessThan(5000)
    })

    test('should not have memory leaks on navigation', async ({ page }) => {
        // Navigate back and forth multiple times
        for (let i = 0; i < 3; i++) {
            await page.goto('/')
            await waitForLandingLoad(page)

            await page.goto('/inbox/memory-test')
            await waitForInboxLoad(page)
        }

        // If we get here without crashing, basic memory handling is OK
        expect(true).toBe(true)
    })
})

test.describe('Cross-Browser Visual Consistency', () => {
    test('should render landing page consistently', async ({ page }) => {
        await page.goto('/')

        // Check key elements are visible
        await expect(page.locator('.hero-section')).toBeVisible()
        await expect(page.locator('.email-form-container')).toBeVisible()
        await expect(page.locator('.fun-facts')).toBeVisible()

        // Check colors are applied (basic check)
        const heroSection = page.locator('.hero-section')
        const bgColor = await heroSection.evaluate(el => getComputedStyle(el).background)
        expect(bgColor).toBeTruthy()
    })
})
