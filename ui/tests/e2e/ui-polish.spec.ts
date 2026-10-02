import { test, expect, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

const sender = `${'long-sender-'.repeat(8)}@example.com`
const messages = [{
    timestamp: Math.floor(Date.now() / 1000),
    read_at: null,
    preview: 'Your temporary inbox is ready.',
    message: { headers: { from: sender, subject: 'Welcome to your inbox' } },
    storage: { region: 'default', key: 'welcome' }
}]

async function mockMail(page: Page) {
    // Keep API requests on the test origin so WebKit does not depend on
    // cross-origin preflight behavior when intercepting mocked responses.
    await page.route('**/config/apiconfig.ts', route => route.fulfill({
        contentType: 'application/javascript',
        body: `export default ${JSON.stringify({
            apiUrl: '/api',
            domain: 'akunlama.com',
            autoRefreshInterval: 30000,
            requestTimeout: 10000
        })}`
    }))
    await page.route('**/api/list**', route => route.fulfill({ json: messages }))
    await page.route('**/api/getKey**', route => route.fulfill({
        json: {
            name: 'Example sender',
            emailAddress: sender,
            recipients: 'test-user@akunlama.com',
            subject: 'Welcome to your inbox',
            Date: new Date().toISOString()
        }
    }))
    await page.route('**/api/getHtml**', route => route.fulfill({
        contentType: 'text/html',
        body: '<html><body><p>Your temporary inbox is ready.</p></body></html>'
    }))
}

async function expectWithinViewport(page: Page, selector: string) {
    const bounds = await page.locator(selector).first().boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
}

test('keeps the address and primary controls in reach on narrow and wide screens in both themes', async ({ page }) => {
    await mockMail(page)
    for (const theme of ['light', 'dark']) {
        await page.addInitScript(value => localStorage.setItem('theme', value), theme)
        for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 812 })
            await page.goto('/')
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
            await expect(page.getByLabel('Email name', { exact: true })).toBeVisible()
            await expectWithinViewport(page, '.email-form-container')
            await expectWithinViewport(page, '.domain-display')
            await expectWithinViewport(page, '.btn-get-mail')
            await expectWithinViewport(page, '.use-cases-grid')

            await page.goto('/inbox/test-user')
            await expect(page.locator('.email-item')).toBeVisible()
            await expectWithinViewport(page, '.email-input-group')
            await expectWithinViewport(page, '.go-btn')
            const listOverflow = await page.locator('.list-panel').evaluate(el => el.scrollWidth > el.clientWidth)
            expect(listOverflow).toBe(false)

            await page.locator('.email-item').focus()
            await page.keyboard.press('Enter')
            await expect(page.locator('.message-subject')).toContainText('Welcome to your inbox')
            await expect(page.frameLocator('#message-content').getByText('Your temporary inbox is ready.')).toBeVisible()
            await expect(page.getByRole('button', { name: 'Copy email content', exact: true })).toBeVisible()
            await expectWithinViewport(page, '.message-meta')
            await expectWithinViewport(page, '.message-actions')
            await expectWithinViewport(page, '#message-content')
        }
    }
})

test('lets keyboard users select messages and identify the message open in the reading pane', async ({ page }) => {
    await mockMail(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/inbox/test-user')
    const row = page.getByRole('button', { name: /Unread: Welcome to your inbox/ })
    await row.focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/message\/default\/welcome/)
    await expect(row).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('.message-subject')).toContainText('Welcome to your inbox')
})

test('lets mobile users change their inbox without relying on the software keyboard submit key', async ({ page }) => {
    await mockMail(page)
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/inbox/test-user')
    await page.getByLabel('Email name', { exact: true }).fill('another-inbox')
    await page.getByRole('button', { name: 'Open inbox', exact: true }).click()
    await expect(page).toHaveURL(/inbox\/another-inbox\/list/)
    const toggle = page.locator('.theme-toggle')
    const previousTheme = await page.locator('html').getAttribute('data-theme')
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', previousTheme === 'dark' ? 'light' : 'dark')
})

test('shows a useful error instead of copied feedback when clipboard access fails', async ({ page }) => {
    await mockMail(page)
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: async () => { throw new Error('Clipboard denied') } }
        })
    })
    await page.goto('/')
    await page.getByLabel('Email name', { exact: true }).fill('test-user')
    await page.getByRole('button', { name: 'Copy email address', exact: true }).click()
    await expect(page.locator('.copy-status')).toBeVisible()
    await expect(page.locator('.copy-status')).toContainText('Unable to copy')
    await expect(page.locator('.domain-display')).not.toHaveClass(/copied/)

    await page.goto('/inbox/test-user')
    await page.getByRole('navigation', { name: 'Inbox navigation' }).getByRole('button', { name: 'Copy email address', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Unable to copy')
    await expect(page.locator('.domain-suffix')).not.toHaveClass(/copied/)
})
