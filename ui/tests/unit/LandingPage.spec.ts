/**
 * Unit Tests for LandingPage.vue (Vue 3)
 * Tests the main landing page functionality including email generation,
 * form validation, and navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import LandingPage from '@/LandingPage.vue'

// Mock the config module
vi.mock('@/../config/apiconfig', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api/v1/mail'
    }
}))

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

describe('LandingPage.vue', () => {
    let wrapper: VueWrapper<any>
    let router: Router

    beforeEach(() => {
        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/', name: 'Kitten Land', component: { template: '<div/>' } },
                { path: '/inbox/:email', name: 'Inbox', component: { template: '<div/>' } },
                { path: '/list/:email', name: 'List', component: { template: '<div/>' } }
            ]
        })

        wrapper = mount(LandingPage, {
            global: {
                plugins: [router],
                stubs: {
                    'font-awesome-icon': true
                }
            }
        })
    })

    afterEach(() => {
        wrapper.unmount()
        vi.clearAllMocks()
    })

    describe('Component Rendering', () => {
        it('should render the landing page correctly', () => {
            expect(wrapper.find('.landing-page').exists()).toBe(true)
            expect(wrapper.find('.hero-section').exists()).toBe(true)
        })

        it('should display the email form', () => {
            expect(wrapper.find('.email-form').exists()).toBe(true)
            expect(wrapper.find('.main-email-input').exists()).toBe(true)
        })

        it('should show the domain in the form', () => {
            expect(wrapper.find('.domain-display').text()).toContain('@test-domain.com')
        })

        it('should display fun facts section', () => {
            expect(wrapper.find('.fun-facts').exists()).toBe(true)
            expect(wrapper.findAll('.fact-card').length).toBe(3)
        })

        it('should display use cases section', () => {
            expect(wrapper.find('.use-cases-section').exists()).toBe(true)
        })

        it('should display FAQ section', () => {
            expect(wrapper.find('.faq-section').exists()).toBe(true)
        })
    })

    describe('Email Generation', () => {
        it('should start with empty randomName in EmailForm', () => {
            const emailForm = wrapper.findComponent({ name: 'EmailForm' })
            expect(emailForm.vm.randomName).toBe('')
        })

        it('should generate a random name when generateNewName is called', () => {
            const emailForm = wrapper.findComponent({ name: 'EmailForm' })
            emailForm.vm.generateNewName()
            expect(emailForm.vm.randomName).not.toBe('')
            expect(emailForm.vm.randomName).toMatch(/^[a-z]+-[a-z]+-\d+$/)
        })

        it('should generate names with adjective-noun-number format', () => {
            const emailForm = wrapper.findComponent({ name: 'EmailForm' })
            for (let i = 0; i < 10; i++) {
                emailForm.vm.generateNewName()
                const name = emailForm.vm.randomName
                expect(name).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/)
            }
        })
    })

    describe('Full Email Address', () => {
        it('should compute correct full email address', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user')
            const emailForm = wrapper.findComponent({ name: 'EmailForm' })
            expect(emailForm.vm.fullEmailAddress).toBe('test-user@test-domain.com')
        })

        it('should handle email that already contains domain', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user@test-domain.com')
            const emailForm = wrapper.findComponent({ name: 'EmailForm' })
            expect(emailForm.vm.fullEmailAddress).toBe('test-user@test-domain.com')
        })

        it('should handle empty randomName', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('')
            const emailForm = wrapper.findComponent({ name: 'EmailForm' })
            expect(emailForm.vm.fullEmailAddress).toBe('@test-domain.com')
        })
    })

    describe('Form Validation', () => {
        it('should disable submit button when randomName is empty', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('')
            const submitBtn = wrapper.find('.btn-get-mail')
            expect(submitBtn.attributes('disabled')).toBeDefined()
        })

        it('should enable submit button when randomName has value', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user')
            const submitBtn = wrapper.find('.btn-get-mail')
            expect(submitBtn.attributes('disabled')).toBeUndefined()
        })
    })

    describe('Navigation', () => {
        it('should navigate to inbox when form is submitted', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user')

            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'Inbox',
                params: { email: 'test-user' }
            })
        })

        it('should not navigate when randomName is empty', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            vi.clearAllMocks()
            const input = wrapper.find('.main-email-input')
            await input.setValue('')

            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).not.toHaveBeenCalled()
        })
    })

    describe('Button Interactions', () => {
        it('should generate new name when shuffle button is clicked', async () => {
            const shuffleBtn = wrapper.find('.btn-shuffle')
            const emailForm = wrapper.findComponent({ name: 'EmailForm' })

            // Initially empty
            expect(emailForm.vm.randomName).toBe('')

            await shuffleBtn.trigger('click')

            expect(emailForm.vm.randomName).not.toBe('')
        })
    })

    describe('Copy Functionality', () => {
        it('should copy email to clipboard when domain display is clicked', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user')

            // Trigger copy by clicking domain display
            await wrapper.find('.domain-display').trigger('click')

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-user@test-domain.com')
        })
    })
})
