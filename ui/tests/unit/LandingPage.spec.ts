/**
 * Unit Tests for LandingPage.vue (Vue 3)
 * Tests the main landing page functionality including email generation,
 * form validation, and navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, type VueWrapper } from '@vue/test-utils'
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

        wrapper = shallowMount(LandingPage, {
            global: {
                plugins: [router],
                stubs: {
                    'router-view': true,
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
        it('should start with empty randomName', () => {
            expect(wrapper.vm.randomName).toBe('')
        })

        it('should generate a random name when generateNewName is called', () => {
            wrapper.vm.generateNewName()
            expect(wrapper.vm.randomName).not.toBe('')
            expect(wrapper.vm.randomName).toMatch(/^[a-z]+-[a-z]+-\d+$/)
        })

        it('should generate names with adjective-noun-number format', () => {
            // Access internal method via vm (might need to expose it or test via button click)
            // Since it's <script setup>, functions are not exposed by NOT using defineExpose.
            // But we can trigger the button click.

            // However, for unit testing internal methods in script setup, we often test effects.
            // generateRandomName is internal, but we can call generateNewName which is used by UI.

            // Wait, if functions are not exposed, wrapper.vm.generateRandomName won't work unless defineExpose used.
            // But vue-test-utils usually captures them if we use shallowMount. 
            // Let's rely on button click or check vm property if available.

            // Actually, `generateRandomName` is not exposed in the template, only `generateNewName` is likely used in template?
            // Checking LandingPage.vue: `generateNewName` IS used in template: `@click="generateNewName"`.
            // But `generateRandomName` is only called by `generateNewName`.

            // So we test `generateNewName`.

            for (let i = 0; i < 10; i++) {
                wrapper.vm.generateNewName()
                const name = wrapper.vm.randomName
                expect(name).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/)
            }
        })
    })

    describe('Full Email Address', () => {
        it('should compute correct full email address', async () => {
            // Using setValue on input is safer for script setup than setData
            // if v-model is bound.
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user')
            expect(wrapper.vm.fullEmailAddress).toBe('test-user@test-domain.com')
        })

        it('should handle email that already contains domain', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user@test-domain.com')
            expect(wrapper.vm.fullEmailAddress).toBe('test-user@test-domain.com')
        })

        it('should handle empty randomName', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('')
            expect(wrapper.vm.fullEmailAddress).toBe('@test-domain.com')
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
        it('should navigate to list when form is submitted', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user')

            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'List', // Updated from Inbox to List as per code
                params: { email: 'test-user' }
            })
        })

        it('should not navigate when randomName is empty', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            vi.clearAllMocks()
            const input = wrapper.find('.main-email-input')
            await input.setValue('')

            // We can't easily call wrapper.vm.goToInbox if not exposed, but we can trigger submit
            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).not.toHaveBeenCalled()
        })
    })

    describe('Button Interactions', () => {
        it('should generate new name when shuffle button is clicked', async () => {
            const shuffleBtn = wrapper.find('.btn-shuffle')
            // Initially empty
            expect(wrapper.vm.randomName).toBe('')

            await shuffleBtn.trigger('click')

            expect(wrapper.vm.randomName).not.toBe('')
        })
    })

    describe('Copy Functionality', () => {
        it('should copy email to clipboard when copyEmail is called', async () => {
            const input = wrapper.find('.main-email-input')
            await input.setValue('test-user')

            // Trigger copy by clicking domain display (as per template)
            await wrapper.find('.domain-display').trigger('click')

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-user@test-domain.com')
        })
    })
})
