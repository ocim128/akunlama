/**
 * E2E Tests: Landing Page
 * Tests the main landing page user flows
 */

import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test('should display the landing page correctly', async ({ page }) => {
        // Check main elements are visible
        await expect(page.locator('.hero-section')).toBeVisible()
        await expect(page.locator('.email-form')).toBeVisible()
        await expect(page.locator('.fun-facts')).toBeVisible()

        // Check heading
        await expect(page.locator('h1')).toContainText('Disposable Email')
    })

    test('should have an empty email input by default', async ({ page }) => {
        const input = page.locator('.main-email-input')
        await expect(input).toHaveValue('')
    })

    test('should disable submit button when input is empty', async ({ page }) => {
        const submitBtn = page.locator('.btn-get-mail')
        await expect(submitBtn).toBeDisabled()
    })

    test('should enable submit button when username is entered', async ({ page }) => {
        const input = page.locator('.main-email-input')
        const submitBtn = page.locator('.btn-get-mail')

        await input.fill('mytest')
        await expect(submitBtn).toBeEnabled()
    })

    test('should generate random name when shuffle button is clicked', async ({ page }) => {
        const input = page.locator('.main-email-input')
        const shuffleBtn = page.locator('.btn-shuffle')

        // Ensure input is initially empty
        await expect(input).toHaveValue('')

        // Click shuffle button
        await shuffleBtn.click()

        // Input should now have a value
        const value = await input.inputValue()
        expect(value).not.toBe('')
        expect(value).toMatch(/^[a-z]+-[a-z]+-\d+$/)
    })

    test('should generate different names on multiple shuffle clicks', async ({ page }) => {
        const input = page.locator('.main-email-input')
        const shuffleBtn = page.locator('.btn-shuffle')

        const names = new Set()

        for (let i = 0; i < 5; i++) {
            await shuffleBtn.click()
            const value = await input.inputValue()
            names.add(value)
        }

        // Should have generated at least 3 unique names
        expect(names.size).toBeGreaterThanOrEqual(3)
    })

    test('should copy email when clicking domain', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])

        const input = page.locator('.main-email-input')
        await input.fill('mytest')

        const domainDisplay = page.locator('.domain-display')
        await domainDisplay.click()

        // Check for visual feedback
        await expect(domainDisplay).toContainText('Copied')

        // Wait for text to reset
        await expect(domainDisplay).toContainText('@', { timeout: 3000 })
    })

    test('should navigate to inbox on form submit', async ({ page }) => {
        const input = page.locator('.main-email-input')
        const form = page.locator('.email-form')

        await input.fill('testuser')
        await form.evaluate(el => el.submit())

        // Should navigate to inbox
        await expect(page).toHaveURL(/\/inbox\/testuser/)
    })

    test('should navigate to inbox when clicking Get Mail button', async ({ page }) => {
        const input = page.locator('.main-email-input')
        const submitBtn = page.locator('.btn-get-mail')

        await input.fill('testuser2')
        await submitBtn.click()

        await expect(page).toHaveURL(/\/inbox\/testuser2/)
    })

    test('should display all feature cards', async ({ page }) => {
        const factCards = page.locator('.fact-card')
        await expect(factCards).toHaveCount(3)
    })

    test('should display use cases section', async ({ page }) => {
        const useCases = page.locator('.use-case')
        await expect(useCases).toHaveCount(6)
    })

    test('should display FAQ section', async ({ page }) => {
        const faqItems = page.locator('.faq-item')
        await expect(faqItems).toHaveCount(3)
    })

    test('should display footer', async ({ page }) => {
        const footer = page.locator('.footer-section')
        await expect(footer).toBeVisible()
        await expect(footer).toContainText('Made with')
    })
})

test.describe('Landing Page - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should be responsive on mobile', async ({ page }) => {
        await page.goto('/')

        // Check main elements are still visible
        await expect(page.locator('.hero-section')).toBeVisible()
        await expect(page.locator('.email-form')).toBeVisible()

        // Form should be usable
        const input = page.locator('.main-email-input')
        await input.fill('mobiletest')

        const submitBtn = page.locator('.btn-get-mail')
        await expect(submitBtn).toBeEnabled()
    })

    test('should stack buttons vertically on mobile', async ({ page }) => {
        await page.goto('/')

        const actionButtons = page.locator('.action-buttons')
        const style = await actionButtons.evaluate(el => getComputedStyle(el).flexDirection)
        expect(style).toBe('column')
    })
})

test.describe('Landing Page - Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
        await page.goto('/')

        // Check h1 exists
        const h1 = page.locator('h1')
        await expect(h1).toHaveCount(1)

        // Check h2 exists
        const h2Elements = page.locator('h2')
        const h2Count = await h2Elements.count()
        expect(h2Count).toBeGreaterThan(0)
    })

    test('should have accessible form inputs', async ({ page }) => {
        await page.goto('/')

        const input = page.locator('.main-email-input')
        await expect(input).toHaveAttribute('placeholder')
        await expect(input).toHaveAttribute('type', 'text')
    })

    test('should be navigable with keyboard', async ({ page }) => {
        await page.goto('/')

        // Tab to input
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')

        const input = page.locator('.main-email-input')

        // Type in input
        await input.fill('keyboardtest')

        // Tab to submit button and press Enter
        await page.keyboard.press('Tab')
        await page.keyboard.press('Enter')

        // Should navigate
        await expect(page).toHaveURL(/\/inbox/, { timeout: 5000 })
    })
})
