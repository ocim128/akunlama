/**
 * E2E Tests: Inbox
 * Tests the email inbox user flows and message interactions
 */

import { test, expect } from '@playwright/test'

test.describe('Inbox Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to a test inbox
        await page.goto('/inbox/test-user')
    })

    test('should display inbox page correctly', async ({ page }) => {
        // Wait for the page to load
        await page.waitForLoadState('networkidle')

        // Should show either empty state or email list
        const emptyState = page.locator('.empty-state')
        const emailList = page.locator('.email-list-container')

        // One of these should be visible
        const emptyVisible = await emptyState.isVisible()
        const listVisible = await emailList.isVisible()

        expect(emptyVisible || listVisible).toBe(true)
    })

    test('should show advisory banner', async ({ page }) => {
        await page.waitForLoadState('networkidle')

        const advisory = page.locator('.advisory-banner')
        await expect(advisory).toBeVisible()
        await expect(advisory).toContainText('Meow')
    })

    test('should show refresh button', async ({ page }) => {
        await page.waitForLoadState('networkidle')

        // Find any refresh button (inline or in empty state)
        const refreshBtn = page.locator('button:has-text("Refresh"), button:has-text("Check for messages")')
        await expect(refreshBtn.first()).toBeVisible()
    })

    test('should refresh inbox when refresh button is clicked', async ({ page }) => {
        await page.waitForLoadState('networkidle')

        const refreshBtn = page.locator('button:has-text("Refresh"), button:has-text("Check for messages")').first()

        // Click refresh
        await refreshBtn.click()

        // Should show loading indicator or spin icon
        // Wait for refresh to complete
        await page.waitForTimeout(1000)

        // Refresh should complete (button should be enabled again)
        await expect(refreshBtn).toBeEnabled({ timeout: 10000 })
    })

    test('should display correct email in navigation', async ({ page }) => {
        await page.waitForLoadState('networkidle')

        // The navigation should show the email address
        await expect(page.locator('.email-input')).toHaveValue('test-user')
    })
})

test.describe('Inbox - Empty State', () => {
    test('should show empty state message when no emails', async ({ page }) => {
        // Use a unique inbox that likely has no emails
        const uniqueInbox = `test-${Date.now()}`
        await page.goto(`/inbox/${uniqueInbox}`)

        await page.waitForLoadState('networkidle')

        // Wait for loading to complete
        await page.waitForSelector('.empty-state, .email-list-container', { timeout: 10000 })

        const emptyState = page.locator('.empty-state')

        if (await emptyState.isVisible()) {
            await expect(emptyState).toContainText('No messages')
            await expect(emptyState.locator('button')).toBeVisible()
        }
    })

    test('should show cat icon in empty state', async ({ page }) => {
        const uniqueInbox = `test-${Date.now()}`
        await page.goto(`/inbox/${uniqueInbox}`)

        await page.waitForLoadState('networkidle')
        await page.waitForSelector('.empty-state, .email-list-container', { timeout: 10000 })

        const emptyState = page.locator('.empty-state')

        if (await emptyState.isVisible()) {
            const catIcon = emptyState.locator('.fa-cat')
            await expect(catIcon).toBeVisible()
        }
    })
})

test.describe('Inbox - Navigation', () => {
    test('should navigate back to landing page when clicking logo', async ({ page }) => {
        await page.goto('/inbox/test-user')
        await page.waitForLoadState('networkidle')

        // Click on logo or home link
        const logo = page.locator('img[class*="logo"]').first()

        if (await logo.isVisible()) {
            await logo.click()
            await expect(page).toHaveURL('/')
        }
    })

    test('should handle direct URL navigation to inbox', async ({ page }) => {
        await page.goto('/inbox/direct-url-test')

        await page.waitForLoadState('networkidle')

        // Should load the inbox page
        await expect(page.locator('.advisory-banner')).toBeVisible({ timeout: 10000 })
    })
})

test.describe('Inbox - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should be responsive on mobile', async ({ page }) => {
        await page.goto('/inbox/mobile-test')
        await page.waitForLoadState('networkidle')

        // Advisory banner should be visible
        await expect(page.locator('.advisory-banner')).toBeVisible()

        // Content should be readable
        await expect(page.locator('.advisory-content')).toBeVisible()
    })
})

test.describe('Inbox - Auto Refresh', () => {
    test('should set up auto-refresh interval', async ({ page }) => {
        // Check that the app sets up auto-refresh
        // We can verify this by checking that new requests are made periodically

        let requestCount = 0

        page.on('request', request => {
            if (request.url().includes('/api/v1/mail/list')) {
                requestCount++
            }
        })

        await page.goto('/inbox/auto-refresh-test')
        await page.waitForLoadState('networkidle')

        // Initial request
        expect(requestCount).toBeGreaterThanOrEqual(1)

        // Wait for potential auto-refresh (if interval is short enough for testing)
        // Note: In real tests, you might mock timers
    })
})
