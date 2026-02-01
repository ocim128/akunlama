import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import ThemeToggle from '@/components/ThemeToggle.vue'

describe('ThemeToggle.vue', () => {
    beforeEach(() => {
        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            clear: vi.fn(),
            key: vi.fn(),
            length: 0,
            removeItem: vi.fn()
        } as Storage
        Object.defineProperty(window, 'localStorage', { value: localStorageMock })

        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(), // Deprecated
                removeListener: vi.fn(), // Deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        })

        // Mock documentElement
        document.documentElement.setAttribute = vi.fn()
    })

    it('toggles theme when clicked', async () => {
        const wrapper = mount(ThemeToggle)
        const button = wrapper.find('.theme-toggle')

        expect(wrapper.vm.isDark).toBe(false)

        await button.trigger('click')
        expect(wrapper.vm.isDark).toBe(true)
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')

        await button.trigger('click')
        expect(wrapper.vm.isDark).toBe(false)
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light')
    })
})
