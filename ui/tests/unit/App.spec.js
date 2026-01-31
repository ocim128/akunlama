/**
 * Unit Tests for App.vue (Vue 3)
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'

// Create a test router
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', name: 'Kitten Land', component: { template: '<div/>' } }
    ]
})

describe('App.vue', () => {
    it('renders correctly', async () => {
        router.push('/')
        await router.isReady()
        const wrapper = mount(App, {
            global: {
                plugins: [router],
                stubs: ['ThemeToggle', 'ToastNotification', 'InstallPrompt']
            }
        })

        // Check if the main container exists
        expect(wrapper.find('#app').exists()).toBe(true)

        // Check if router-view is present
        expect(wrapper.find('.app-router-view').exists()).toBe(true)

        // Check github corner
        expect(wrapper.find('.github-corner').exists()).toBe(true)
    })

    it('contains correct data from config', () => {
        const wrapper = mount(App, {
            global: {
                plugins: [router],
                stubs: ['ThemeToggle', 'ToastNotification', 'InstallPrompt']
            }
        })

        expect(wrapper.vm.githubLink).toBeDefined()
        expect(wrapper.vm.githubAriaLabel).toBeDefined()
    })
})
