/**
 * Unit Tests for LandingPage.vue
 * Tests the main landing page functionality including email generation,
 * form validation, and navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import VueRouter from 'vue-router'
import LandingPage from '@/landingpage.vue'

// Create a local Vue instance with router
const localVue = createLocalVue()
localVue.use(VueRouter)

// Mock the config module
vi.mock('@/../config/apiconfig.js', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api/v1/mail'
    }
}))

describe('LandingPage.vue', () => {
    let wrapper
    let router

    beforeEach(() => {
        router = new VueRouter({
            routes: [
                { path: '/', name: 'Kitten Land' },
                { path: '/inbox/:email', name: 'Inbox' }
            ]
        })

        wrapper = shallowMount(LandingPage, {
            localVue,
            router,
            stubs: {
                'router-view': true
            }
        })
    })

    afterEach(() => {
        wrapper.destroy()
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
            for (let i = 0; i < 10; i++) {
                const name = wrapper.vm.generateRandomName()
                expect(name).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/)
            }
        })

        it('should generate different names on subsequent calls', () => {
            const names = new Set()
            for (let i = 0; i < 10; i++) {
                names.add(wrapper.vm.generateRandomName())
            }
            // With high probability, at least 5 unique names should be generated
            expect(names.size).toBeGreaterThanOrEqual(5)
        })
    })

    describe('Full Email Address', () => {
        it('should compute correct full email address', () => {
            wrapper.setData({ randomName: 'test-user' })
            expect(wrapper.vm.fullEmailAddress).toBe('test-user@test-domain.com')
        })

        it('should handle email that already contains domain', () => {
            wrapper.setData({ randomName: 'test-user@test-domain.com' })
            expect(wrapper.vm.fullEmailAddress).toBe('test-user@test-domain.com')
        })

        it('should handle empty randomName', () => {
            wrapper.setData({ randomName: '' })
            expect(wrapper.vm.fullEmailAddress).toBe('@test-domain.com')
        })
    })

    describe('Form Validation', () => {
        it('should disable submit button when randomName is empty', () => {
            wrapper.setData({ randomName: '' })
            const submitBtn = wrapper.find('.btn-get-mail')
            expect(submitBtn.attributes('disabled')).toBeDefined()
        })

        it('should enable submit button when randomName has value', async () => {
            await wrapper.setData({ randomName: 'test-user' })
            const submitBtn = wrapper.find('.btn-get-mail')
            expect(submitBtn.attributes('disabled')).toBeUndefined()
        })

        it('should disable button for whitespace-only input', async () => {
            await wrapper.setData({ randomName: '   ' })
            const submitBtn = wrapper.find('.btn-get-mail')
            expect(submitBtn.attributes('disabled')).toBeDefined()
        })
    })

    describe('Navigation', () => {
        it('should navigate to inbox when form is submitted', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            await wrapper.setData({ randomName: 'test-user' })

            await wrapper.find('.email-form').trigger('submit.prevent')

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'Inbox',
                params: { email: 'test-user' }
            })
        })

        it('should not navigate when randomName is empty', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            await wrapper.setData({ randomName: '' })

            wrapper.vm.goToInbox()

            expect(pushSpy).not.toHaveBeenCalled()
        })

        it('should not navigate when randomName is only whitespace', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            await wrapper.setData({ randomName: '   ' })

            wrapper.vm.goToInbox()

            expect(pushSpy).not.toHaveBeenCalled()
        })
    })

    describe('Button Interactions', () => {
        it('should generate new name when shuffle button is clicked', async () => {
            const shuffleBtn = wrapper.find('.btn-shuffle')
            expect(wrapper.vm.randomName).toBe('')

            await shuffleBtn.trigger('click')

            expect(wrapper.vm.randomName).not.toBe('')
        })
    })

    describe('Copy Functionality', () => {
        it('should copy email to clipboard when copyEmail is called', async () => {
            await wrapper.setData({ randomName: 'test-user' })

            await wrapper.vm.copyEmail()

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-user@test-domain.com')
        })
    })
})
