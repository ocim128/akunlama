import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'

test('shows a failed inbox check and recovers through retry instead of claiming the inbox is empty', async ({ page }) => {
    let requestCount = 0
    const api = createServer((_request, response) => {
        requestCount++
        response.writeHead(requestCount === 1 ? 503 : 200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
        })
        response.end(requestCount === 1 ? JSON.stringify({ error: 'Database query failed' }) : '[]')
    })
    await new Promise<void>(resolve => api.listen(0, '127.0.0.1', resolve))
    const { port } = api.address() as { port: number }

    try {
        // Use a local API so failure and retry exercise real requests in every browser.
        await page.route('**/config/apiconfig.ts', route => route.fulfill({
            contentType: 'application/javascript',
            body: `export default ${JSON.stringify({
                apiUrl: `http://127.0.0.1:${port}/api`,
                domain: 'akunlama.com',
                autoRefreshInterval: 30000,
                requestTimeout: 10000
            })}`
        }))

        await page.goto('/inbox/unavailable-user')
        await expect(page.getByRole('alert')).toContainText('Unable to check this inbox')
        await expect(page.locator('.empty-state')).toHaveCount(0)

        await page.getByRole('button', { name: 'Try again' }).click()
        await expect(page.getByRole('alert')).toHaveCount(0)
        await expect(page.locator('.empty-state')).toBeVisible()
        expect(requestCount).toBe(2)
    } finally {
        await new Promise<void>((resolve, reject) => api.close(error => error ? reject(error) : resolve()))
    }
})
