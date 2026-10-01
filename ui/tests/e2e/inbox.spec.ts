/**
 * E2E Tests: Inbox
 * Tests the email inbox user flows and message interactions
 */

import { test, expect, Page } from '@playwright/test'

/**
 * Wait for the inbox page to be loaded by checking for key elements
 */
async function waitForInboxLoad(page: Page, timeout = 30000) {
    // Wait for the advisory banner to appear (page structure loaded)
    await page.waitForSelector('.advisory-banner', { timeout })

    // Wait for loading to complete (skeleton disappears, content appears)
    // Either we see the email list, empty state, OR skeleton is gone
    await page.waitForFunction(
        () => {
            const skeleton = document.querySelector('.skeleton-container, .loading-container') as HTMLElement | null
            const emptyState = document.querySelector('.empty-state')
            const emailList = document.querySelector('.email-list-container')
            // Return true when loading is done (skeleton gone AND content visible)
            return (!skeleton || !skeleton.offsetParent) && (emptyState || emailList)
        },
        undefined,
        { timeout }
    )
}

async function mockInboxList(page: Page, messages = []) {
    await page.route('**/api/list**', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(messages)
        })
    })

    await page.route('**/api/v1/mail/list**', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(messages)
        })
    })
}

test.beforeEach(async ({ page }) => {
    await mockInboxList(page)
})

test.describe('Inbox Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to a test inbox
        await page.goto('/inbox/test-user')
        await waitForInboxLoad(page)
    })

    test('should display inbox page correctly', async ({ page }) => {
        await expect(page.locator('.empty-state')).toBeVisible()
        await expect(page.locator('.email-list-container')).toHaveCount(0)
    })

    test('should show advisory banner', async ({ page }) => {
        const advisory = page.locator('.advisory-banner')
        await expect(advisory).toBeVisible()
        await expect(advisory).toContainText('low-risk emails')
    })

    test('should show refresh button', async ({ page }) => {
        // Find any visible refresh button (inline, in nav or in empty state)
        const refreshBtn = page.locator('button:visible:has-text("Refresh"), button:visible:has-text("Check for messages")')
        await expect(refreshBtn.first()).toBeVisible()
    })

    test('should refresh inbox when refresh button is clicked', async ({ page }) => {
        const refreshBtn = page.locator('button:visible:has-text("Refresh"), button:visible:has-text("Check for messages")').first()

        const refreshed = page.waitForResponse(response => response.url().includes('/api/list'))
        await refreshBtn.click()
        expect((await refreshed).status()).toBe(200)
        await expect(refreshBtn).toBeEnabled({ timeout: 10000 })
    })

    test('should display correct email in navigation', async ({ page }) => {
        // The navigation should show the email address
        await expect(page.locator('.email-input')).toHaveValue('test-user')
    })
})

test.describe('Inbox - Empty State', () => {
    test('should show empty state message when no emails', async ({ page }) => {
        // Use a unique inbox that likely has no emails
        const uniqueInbox = `test-${Date.now()}`
        await page.goto(`/inbox/${uniqueInbox}`)

        await waitForInboxLoad(page)

        const emptyState = page.locator('.empty-state')

        await expect(emptyState).toBeVisible()
        await expect(emptyState).toContainText('No messages')
        await expect(emptyState.locator('button')).toBeVisible()
    })

    test('should show cat icon in empty state', async ({ page }) => {
        const uniqueInbox = `test-${Date.now()}`
        await page.goto(`/inbox/${uniqueInbox}`)

        await waitForInboxLoad(page)

        const emptyState = page.locator('.empty-state')

        await expect(emptyState).toBeVisible()
        const catIcon = emptyState.locator('.fa-cat, [data-icon="cat"]')
        await expect(catIcon.first()).toBeVisible()
    })
})

test.describe('Inbox - Navigation', () => {
    test('should navigate back to landing page when clicking logo', async ({ page }) => {
        await page.goto('/inbox/test-user')
        await waitForInboxLoad(page)

        // Click on logo or home link
        const logo = page.locator('img[class*="logo"]').first()

        await expect(logo).toBeVisible()
        await logo.click()
        await expect(page).toHaveURL('/')
    })

    test('should handle direct URL navigation to inbox', async ({ page }) => {
        await page.goto('/inbox/direct-url-test')

        // Should load the inbox page
        await expect(page.locator('.advisory-banner')).toBeVisible({ timeout: 30000 })
    })
})

test.describe('Inbox - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should be responsive on mobile', async ({ page }) => {
        await page.goto('/inbox/mobile-test')
        // Wait for the page content to load by looking for the advisory banner
        await expect(page.locator('.advisory-banner')).toBeVisible({ timeout: 30000 })

        // Content should be readable
        await expect(page.locator('.advisory-content')).toBeVisible()
    })
})

test.describe('Inbox - Auto Refresh', () => {
    test('should set up auto-refresh interval', async ({ page }) => {
        await page.clock.install()
        let requestCount = 0

        page.on('request', request => {
            if (request.url().includes('/api/list') || request.url().includes('/api/v1/mail/list')) {
                requestCount++
            }
        })

        await page.goto('/inbox/auto-refresh-test')
        await waitForInboxLoad(page)

        expect(requestCount).toBe(1)
        await page.clock.runFor(31000)
        await expect.poll(() => requestCount).toBe(2)
        await expect(page.locator('.empty-state')).toBeVisible()
    })
})
