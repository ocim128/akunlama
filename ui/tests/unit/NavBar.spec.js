/**
 * Unit Tests for NavBar.vue
 * Tests the navigation bar functionality including email display,
 * copy functionality, and responsive behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import VueRouter from 'vue-router'
import NavBar from '@/components/NavBar.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)
localVue.prototype.$eventHub = new localVue()

// Mock clipboard
vi.mock('clipboard', () => ({
    default: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        destroy: vi.fn()
    }))
}))

// Mock jquery
vi.mock('jquery', () => ({
    default: vi.fn().mockImplementation(() => ({
        addClass: vi.fn().mockReturnThis(),
        removeClass: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        fadeOut: vi.fn().mockImplementation((cb) => { if (cb) cb() })
    }))
}))

// Mock the config module
vi.mock('@/../config/apiconfig.js', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api/v1/mail'
    }
}))

describe('NavBar.vue', () => {
    let wrapper
    let router

    beforeEach(() => {
        router = new VueRouter({
            routes: [
                { path: '/', name: 'Kitten Land' },
                { path: '/inbox/:email', name: 'List' }
            ]
        })

        router.push('/inbox/test-user')

        wrapper = shallowMount(NavBar, {
            localVue,
            router
        })
    })

    afterEach(() => {
        wrapper.destroy()
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
            await wrapper.setData({ email: 'test-user' })
            expect(wrapper.vm.fullEmail).toBe('test-user@test-domain.com')
        })

        it('should not duplicate domain if email already contains it', async () => {
            await wrapper.setData({ email: 'test-user@test-domain.com' })
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
            expect(wrapper.vm.email).toBe('test-user')
        })
    })

    describe('Refresh Functionality', () => {
        it('should emit refresh event when refresh button is clicked', async () => {
            const emitSpy = vi.spyOn(wrapper.vm.$eventHub, '$emit')

            await wrapper.find('.refresh-btn').trigger('click')

            expect(emitSpy).toHaveBeenCalledWith('refresh', '')
        })

        it('should set isRefreshing to true when refresh is clicked', async () => {
            expect(wrapper.vm.isRefreshing).toBe(false)

            await wrapper.find('.refresh-btn').trigger('click')

            expect(wrapper.vm.isRefreshing).toBe(true)
        })

        it('should disable refresh button when isRefreshing is true', async () => {
            await wrapper.setData({ isRefreshing: true })

            expect(wrapper.find('.refresh-btn').attributes('disabled')).toBeDefined()
        })
    })

    describe('Form Submission', () => {
        it('should navigate to new inbox on form submit', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            await wrapper.setData({ email: 'new-inbox' })

            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'List',
                params: { email: 'new-inbox' }
            })
        })

        it('should not navigate if email is empty', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            vi.clearAllMocks()
            await wrapper.setData({ email: '' })

            wrapper.vm.changeInbox()

            expect(pushSpy).not.toHaveBeenCalled()
        })
    })
})
