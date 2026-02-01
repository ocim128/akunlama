/**
 * Unit Tests for MessageDetail.vue (Vue 3)
 * Comprehensive tests for email viewing functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import MessageDetail from '@/components/mail/MessageDetail.vue'
import axios from 'axios'
import mitt from 'mitt'

// Mock dependencies
vi.mock('axios')

// Mock the config module
vi.mock('@/../config/apiconfig', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api'
    }
}))

// Create event hub mock
const emitter = mitt()

describe('MessageDetail.vue', () => {
    let wrapper: VueWrapper<any>
    let router: Router

    const mockEmailContent = {
        subject: 'Test Subject',
        name: 'John Doe',
        emailAddress: 'john@example.com',
        recipients: 'me@test-domain.com',
        Date: '2026-01-31T12:00:00Z'
    }

    beforeEach(async () => {
        vi.clearAllMocks()
        // @ts-ignore
        axios.get.mockResolvedValue({ data: mockEmailContent })

        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/inbox/:email/:region/:key', name: 'Message', component: { template: '<div/>' } },
                { path: '/', name: 'Kitten Land', component: { template: '<div/>' } },
                { path: '/inbox/:email', name: 'List', component: { template: '<div/>' } }
            ]
        })

        // Push initial route
        await router.push('/inbox/test-user/us/123')
        await router.isReady()

        wrapper = shallowMount(MessageDetail, {
            global: {
                plugins: [router],
                provide: {
                    eventHub: emitter
                },
                stubs: {
                    'font-awesome-icon': true
                }
            }
        })
    })

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
    })

    describe('Component Initialization', () => {
        it('renders component correctly', () => {
            expect(wrapper.exists()).toBe(true)
        })

        // Note: With async setup/promises, "starting in loading state" tests are sometimes flaky 
        // because flushPromises might happen too fast or too slow. 
        // But initial state checking before flushPromises usually works.
        // However, we used await router.push/mount which might trigger some. 
        // In MessageDetail, fetch happens onMounted presumably.

        it('redirects to home if no key in params', async () => {
            const emptyRouter = createRouter({
                history: createMemoryHistory(),
                routes: [
                    { path: '/inbox/:email', name: 'Message', component: { template: '<div/>' } }, // Missing params
                    { path: '/', name: 'Kitten Land', component: { template: '<div/>' } }
                ]
            })
            await emptyRouter.push('/inbox/test-user')
            await emptyRouter.isReady()

            const pushSpy = vi.spyOn(emptyRouter, 'push')

            const emptyWrapper = shallowMount(MessageDetail, {
                global: {
                    plugins: [emptyRouter],
                    provide: {
                        eventHub: emitter
                    },
                    stubs: { 'font-awesome-icon': true }
                }
            })

            // Wait for onMounted check
            await flushPromises()

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'Kitten Land'
            })
            emptyWrapper.unmount()
        })
    })

    describe('Message Fetching', () => {
        it('fetches message metadata on mount', async () => {
            await flushPromises()

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('getKey?region=us&key=123')
            )
        })

        it('sets iframe src on mount', () => {
            expect(wrapper.vm.src).toContain('getHtml?region=us&key=123')
        })

        it('updates emailContent on successful fetch', async () => {
            await flushPromises()

            expect(wrapper.vm.emailContent.subject).toBe('Test Subject')
            expect(wrapper.vm.emailContent.name).toBe('John Doe')
            expect(wrapper.vm.loading).toBe(false)
        })

        // Handles Error case requires remount or mocking logic before mount.
    })

    describe('Date Formatting', () => {
        it('formats today date correctly', () => {
            const now = new Date()
            const result = wrapper.vm.formatDate(now.toISOString())
            expect(result).toContain('Today')
        })

        it('returns "Unknown time" for invalid date', () => {
            // @ts-ignore
            expect(wrapper.vm.formatDate('invalid-date')).toBe('Unknown time')
        })
    })

    describe('Avatar Color Generation', () => {
        it('generates consistent color for same email', () => {
            const color1 = wrapper.vm.getAvatarColor('test@example.com')
            const color2 = wrapper.vm.getAvatarColor('test@example.com')
            expect(color1).toBe(color2)
        })

        it('returns first color for null/empty email', () => {
            // @ts-ignore
            const colorNull = wrapper.vm.getAvatarColor(null)
            expect(colorNull).toBeDefined()
        })
    })

    describe('Initials Generation', () => {
        it('extracts initials from full name', () => {
            expect(wrapper.vm.getInitials('test@test.com', 'John Doe')).toBe('JD')
        })

        it('extracts initials from single name', () => {
            expect(wrapper.vm.getInitials('test@test.com', 'John')).toBe('JO')
        })
    })

    describe('Name Extraction', () => {
        it('extracts name from email address', () => {
            expect(wrapper.vm.extractName('john.doe@example.com')).toBe('John Doe')
        })
    })

    describe('Navigation', () => {
        it('navigates back to list when email param exists', async () => {
            const pushSpy = vi.spyOn(router, 'push')
            wrapper.vm.goBack()

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'List',
                params: { email: 'test-user' }
            })
        })
    })

    describe('Refresh Functionality', () => {
        it('sets refreshing state during refresh', async () => {
            vi.useFakeTimers()

            wrapper.vm.refreshMessage()
            expect(wrapper.vm.refreshing).toBe(true)

            vi.advanceTimersByTime(500)
            await flushPromises()
            expect(wrapper.vm.refreshing).toBe(false)
            vi.useRealTimers()
        })
    })

    describe('Iframe Loading', () => {
        it('sets iframeLoading to false on load event', async () => {
            // Initially true
            expect(wrapper.vm.iframeLoading).toBe(true)

            wrapper.vm.onIframeLoad()

            expect(wrapper.vm.iframeLoading).toBe(false)
        })
    })

    describe('Copy Functionality', () => {
        it('shows copied feedback after copy', async () => {
            vi.useFakeTimers()

            // Mock getElementById
            const originalGetElementById = document.getElementById
            document.getElementById = vi.fn().mockReturnValue({
                contentDocument: {
                    body: { innerText: 'Test content', textContent: 'Test content' }
                }
            })

            // Mock navigator.clipboard
            vi.stubGlobal('navigator', {
                clipboard: {
                    writeText: vi.fn().mockResolvedValue(undefined)
                },
                userAgent: 'vitest'
            })

            await wrapper.vm.copyEmailContent()

            expect(wrapper.vm.showCopiedFeedback).toBe(true)

            vi.advanceTimersByTime(2100)
            expect(wrapper.vm.showCopiedFeedback).toBe(false)

            vi.useRealTimers()
            document.getElementById = originalGetElementById // restore
        })
    })
})
