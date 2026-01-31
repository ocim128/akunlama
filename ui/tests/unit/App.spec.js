/**
 * Unit Tests for App.vue (Vue 3)
 * Tests the main application wrapper component
 */
import { describe, it, expect } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
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
                stubs: ['ToastNotification', 'InstallPrompt']
            }
        })

        // Check if the main container exists
        expect(wrapper.find('#app').exists()).toBe(true)

        // Check if router-view is present
        expect(wrapper.find('.app-router-view').exists()).toBe(true)
    })

    it('has correct component structure', async () => {
        router.push('/')
        await router.isReady()

        const wrapper = shallowMount(App, {
            global: {
                plugins: [router],
                stubs: ['ToastNotification', 'InstallPrompt']
            }
        })

        // Check component name
        expect(wrapper.vm.$options.name).toBe('App')

        // Check that ToastNotification stub is present
        expect(wrapper.findComponent({ name: 'ToastNotification' }).exists()).toBe(true)

        // Check that InstallPrompt stub is present
        expect(wrapper.findComponent({ name: 'InstallPrompt' }).exists()).toBe(true)
    })

    it('renders router-view with transition', async () => {
        router.push('/')
        await router.isReady()

        const wrapper = mount(App, {
            global: {
                plugins: [router],
                stubs: ['ToastNotification', 'InstallPrompt']
            }
        })

        // Transition wrapper should exist
        expect(wrapper.find('transition-stub, .app-router-view').exists()).toBe(true)
    })

    it('mounts without errors', async () => {
        router.push('/')
        await router.isReady()

        expect(() => {
            mount(App, {
                global: {
                    plugins: [router],
                    stubs: ['ToastNotification', 'InstallPrompt']
                }
            })
        }).not.toThrow()
    })
})
