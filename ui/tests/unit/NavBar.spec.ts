/**
 * Unit Tests for NavBar.vue (Vue 3)
 * Tests the navigation bar functionality including email display,
 * copy functionality, and responsive behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import mitt from 'mitt'
import NavBar from '@/components/NavBar.vue'

// Create event hub mock
const emitter = mitt()

// Mock clipboard
vi.mock('clipboard', () => ({
    default: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        destroy: vi.fn()
    }))
}))

// Mock navigator.clipboard
vi.stubGlobal('navigator', {
    clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
    },
    userAgent: 'vitest'
})

// Mock the config module
vi.mock('@/../config/apiconfig', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api/v1/mail'
    }
}))

describe('NavBar.vue', () => {
    let wrapper: VueWrapper<any>
    let router: Router

    beforeEach(async () => {
        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/', name: 'Kitten Land', component: { template: '<div/>' } },
                { path: '/inbox/:email', name: 'List', component: { template: '<div/>' } },
                { path: '/list/:email', name: 'ListAlias', component: { template: '<div/>' } }
            ]
        })

        await router.push('/inbox/test-user')
        await router.isReady()

        wrapper = shallowMount(NavBar, {
            global: {
                plugins: [router],
                provide: {
                    eventHub: emitter
                },
                stubs: {
                    'font-awesome-icon': true,
                    'ThemeToggle': true
                }
            }
        })
    })

    afterEach(() => {
        wrapper.unmount()
    })

    describe('Component Rendering', () => {
        it('should render correctly', () => {
            expect(wrapper.exists()).toBe(true)
        })

        it('should display the domain suffix', () => {
            expect(wrapper.find('.domain-suffix').text()).toContain('@test-domain.com')
        })

        it('should have email input field', () => {
            expect(wrapper.find('.email-input').exists()).toBe(true)
        })

        it('should have go and refresh buttons', () => {
            expect(wrapper.find('.go-btn').exists()).toBe(true)
            expect(wrapper.find('.refresh-btn').exists()).toBe(true)
        })
    })

    describe('Navigation', () => {
        it('should navigate to home when logo is clicked', async () => {
            const pushSpy = vi.spyOn(router, 'push')

            await wrapper.find('.nav-logo').trigger('click')

            expect(pushSpy).toHaveBeenCalledWith({ name: 'Kitten Land' })
        })

        it('should navigate back when back button is clicked', async () => {
            const pushSpy = vi.spyOn(router, 'push')

            await wrapper.find('.nav-back-btn').trigger('click')

            expect(pushSpy).toHaveBeenCalled()
        })
    })

    describe('Computed Properties', () => {
        it('should compute the domain correctly', () => {
            expect(wrapper.vm.domain).toBe('test-domain.com')
        })

        it('should compute fullEmail correctly', async () => {
            const input = wrapper.find('.email-input')
            await input.setValue('test-user')
            expect(wrapper.vm.fullEmail).toBe('test-user@test-domain.com')
        })

        it('should not duplicate domain if email already contains it', async () => {
            const input = wrapper.find('.email-input')
            await input.setValue('test-user@test-domain.com')
            expect(wrapper.vm.fullEmail).toBe('test-user@test-domain.com')
        })
    })

    describe('Email Input', () => {
        it('should update email data on input', async () => {
            const input = wrapper.find('.email-input')
            await input.setValue('new-email')
            expect(wrapper.vm.email).toBe('new-email')
        })

        it('should set email from route params on mount', () => {
            expect(wrapper.vm.email).toBe('test-user') // from beforeEach router.push
        })
    })

    describe('Refresh Functionality', () => {
        it('should emit refresh event when refresh button is clicked', async () => {
            const emitSpy = vi.spyOn(emitter, 'emit')

            await wrapper.find('.refresh-btn').trigger('click')

            expect(emitSpy).toHaveBeenCalledWith('refresh', '')
        })

        it('should set isRefreshing to true when refresh is clicked', async () => {
            expect(wrapper.vm.isRefreshing).toBe(false)

            await wrapper.find('.refresh-btn').trigger('click')

            // Note: because no promise/timeout is awaited inside the spec for the 3s timeout, 
            // isRefreshing should be true immediately.
            expect(wrapper.vm.isRefreshing).toBe(true)
        })

        it('should disable refresh button when isRefreshing is true', async () => {
            // Since we can't easily setData on ref in script setup from wrapper directly without helper or expose,
            // we trigger it via button which sets it to true.
            await wrapper.find('.refresh-btn').trigger('click')

            await wrapper.vm.$nextTick()
            expect(wrapper.find('.refresh-btn').attributes('disabled')).toBeDefined()
        })
    })

    describe('Form Submission', () => {
        it('should navigate to new inbox on form submit', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            const input = wrapper.find('.email-input')
            await input.setValue('new-inbox')

            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'List',
                params: { email: 'new-inbox' }
            })
        })

        it('should not navigate if email is empty', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            vi.clearAllMocks()
            const input = wrapper.find('.email-input')
            await input.setValue('')

            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).not.toHaveBeenCalled()
        })
    })
})
