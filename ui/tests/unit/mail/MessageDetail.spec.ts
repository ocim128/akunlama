/**
 * Unit Tests for MessageDetail.vue (Vue 3)
 * Comprehensive tests for email viewing functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
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

        wrapper = mount(MessageDetail, {
            global: {
                plugins: [router],
                provide: {
                    eventHub: emitter
                },
                mocks: {
                    $eventHub: emitter
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

        it('redirects to home if no key in params', async () => {
            const emptyRouter = createRouter({
                history: createMemoryHistory(),
                routes: [
                    { path: '/inbox/:email', name: 'Message', component: { template: '<div/>' } },
                    { path: '/', name: 'Kitten Land', component: { template: '<div/>' } }
                ]
            })
            await emptyRouter.push('/inbox/test-user')
            await emptyRouter.isReady()

            const pushSpy = vi.spyOn(emptyRouter, 'push')

            const emptyWrapper = mount(MessageDetail, {
                global: {
                    plugins: [emptyRouter],
                    provide: {
                        eventHub: emitter
                    },
                    mocks: {
                        $eventHub: emitter
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
    })

    describe('Date Formatting', () => {
        // Date formatting is now handled in MessageHeader child component
        it('renders MessageHeader with email content', async () => {
            await flushPromises()

            const messageHeader = wrapper.findComponent({ name: 'MessageHeader' })
            expect(messageHeader.exists()).toBe(true)
            expect(messageHeader.props('emailContent')).toEqual(mockEmailContent)
        })

        it('MessageHeader computes formatted date', async () => {
            await flushPromises()

            const messageHeader = wrapper.findComponent({ name: 'MessageHeader' })
            // The formattedDate computed property should exist and return a formatted string
            expect(messageHeader.vm.formattedDate).toBeDefined()
            expect(typeof messageHeader.vm.formattedDate).toBe('string')
        })
    })

    describe('Avatar Color Generation', () => {
        // Avatar color is now handled in MessageHeader child component
        it('generates consistent color for same email in MessageHeader', async () => {
            await flushPromises()

            const messageHeader = wrapper.findComponent({ name: 'MessageHeader' })
            const color = messageHeader.vm.avatarColor
            expect(color).toBeDefined()
            expect(typeof color).toBe('string')
            expect(color.startsWith('#')).toBe(true)
        })
    })

    describe('Initials Generation', () => {
        // Initials generation is now handled in MessageHeader child component
        it('extracts initials from full name in MessageHeader', async () => {
            await flushPromises()

            const messageHeader = wrapper.findComponent({ name: 'MessageHeader' })
            expect(messageHeader.vm.initials).toBe('JD') // John Doe
        })
    })

    describe('Name Extraction', () => {
        // Default name is now computed in MessageHeader
        it('computes defaultName from email in MessageHeader', async () => {
            await flushPromises()

            const messageHeader = wrapper.findComponent({ name: 'MessageHeader' })
            expect(messageHeader.vm.defaultName).toBeDefined()
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

        it('forces email iframe links to open in a new tab', () => {
            const doc = document.implementation.createHTMLDocument('Email')
            doc.head.innerHTML = '<base target="_self">'
            doc.body.innerHTML = '<a href="https://example.com" target="_self">Open</a>'

            const getElementSpy = vi.spyOn(document, 'getElementById').mockReturnValue({
                contentDocument: doc
            } as unknown as HTMLElement)

            wrapper.vm.onIframeLoad()

            const link = doc.querySelector('a')
            const base = doc.querySelector('base')

            expect(link?.getAttribute('target')).toBe('_blank')
            expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
            expect(base?.getAttribute('target')).toBe('_blank')

            getElementSpy.mockRestore()
        })

        it('opens button-styled email links in a new tab instead of the iframe', () => {
            const doc = document.implementation.createHTMLDocument('Email')
            doc.body.innerHTML = '<a href="https://example.com/learn" target="_self"><span>Learn more</span></a>'

            const getElementSpy = vi.spyOn(document, 'getElementById').mockReturnValue({
                contentDocument: doc
            } as unknown as HTMLElement)
            const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)

            wrapper.vm.onIframeLoad()

            const event = new MouseEvent('click', { bubbles: true, cancelable: true })
            doc.querySelector('span')?.dispatchEvent(event)

            expect(event.defaultPrevented).toBe(true)
            expect(openSpy).toHaveBeenCalledWith('https://example.com/learn', '_blank', 'noopener,noreferrer')

            openSpy.mockRestore()
            getElementSpy.mockRestore()
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
