/**
 * Unit Tests for MessageList.vue (Vue 3)
 * Tests the email inbox functionality including message fetching,
 * time formatting, and user interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import axios from 'axios'
import mitt from 'mitt'
import MessageList from '@/components/mail/MessageList.vue'

// Mock axios
vi.mock('axios')

// Create event hub mock
const emitter = mitt()

// Mock the config module
vi.mock('@/../config/apiconfig', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api/v1/mail',
        autoRefreshInterval: 30000,
        requestTimeout: 10000
    }
}))

const mockedAxiosGet = vi.mocked(axios.get)

describe('MessageList.vue', () => {
    let wrapper: VueWrapper<any>
    let router: Router

    const mockMessages = [
        {
            url: '/api/list?recipient=test-user@test-domain.com',
            read_at: null,
            timestamp: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
            message: {
                headers: {
                    from: 'sender@example.com',
                    subject: 'Test Email Subject'
                },
                preview: 'This is a preview of the email content...'
            },
            storage: {
                region: 'us',
                key: 'message-key-1',
                url: 'http://storage.mailgun.net/v1/...'
            }
        },
        {
            url: '/api/list?recipient=test-user@test-domain.com',
            read_at: null,
            timestamp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
            message: {
                headers: {
                    from: 'Test Sender <another@example.com>',
                    subject: 'Another Test Email'
                }
            },
            storage: {
                region: 'eu',
                key: 'message-key-2',
                url: 'http://storage.mailgun.net/v2/...'
            }
        }
    ]

    beforeEach(async () => {
        // Mock setInterval to prevent auto-refresh issues
        vi.spyOn(window, 'setInterval').mockImplementation(() => 123 as any)
        vi.spyOn(window, 'clearInterval').mockImplementation(() => { })

        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/inbox/:email', name: 'Inbox', component: { template: '<div/>' } },
                { path: '/inbox/:email/:region/:key', name: 'Message', component: { template: '<div/>' } },
                { path: '/', name: 'Kitten Land', component: { template: '<div/>' } },
                { path: '/inbox/:email/list', name: 'List', component: { template: '<div/>' } }
            ]
        })

        // Mock the API response
        mockedAxiosGet.mockResolvedValue({ data: mockMessages })

        await router.push('/inbox/test-user')
        await router.isReady()

        wrapper = mount(MessageList, {
            global: {
                plugins: [router],
                provide: {
                    eventHub: emitter
                },
                mocks: {
                    $eventHub: emitter
                },
                stubs: {
                    'nav-bar': true,
                    'font-awesome-icon': true
                }
            }
        })
        await flushPromises()
    })

    afterEach(() => {
        wrapper.unmount()
        vi.restoreAllMocks()
        vi.clearAllMocks()
    })

    describe('Component Initialization', () => {
        it('should mount correctly', () => {
            expect(wrapper.exists()).toBe(true)
        })

        it('should set up auto-refresh interval on mount', () => {
            expect(window.setInterval).toHaveBeenCalledTimes(1)
        })
    })

    describe('Message Fetching', () => {
        it('should call API to fetch messages on mount', () => {
            expect(mockedAxiosGet).toHaveBeenCalledWith(
                expect.stringContaining('list?recipient=test-user'),
                { timeout: 10000, signal: expect.any(AbortSignal) }
            )
        })

        it('should fetch a bare recipient once because the API handles recipient variants', async () => {
            vi.clearAllMocks()
            mockedAxiosGet.mockResolvedValueOnce({ data: [] })

            await wrapper.vm.getMessageList()
            await flushPromises()

            expect(mockedAxiosGet).toHaveBeenCalledTimes(1)
            expect(mockedAxiosGet).toHaveBeenCalledWith(
                expect.stringContaining('list?recipient=test-user'),
                { timeout: 10000, signal: expect.any(AbortSignal) }
            )
            expect(wrapper.vm.listOfMessages).toEqual([])
        })

        it('should not append the domain when fetching messages', async () => {
            vi.clearAllMocks()
            mockedAxiosGet.mockResolvedValueOnce({ data: mockMessages })

            await wrapper.vm.getMessageList()
            await flushPromises()

            expect(mockedAxiosGet).toHaveBeenCalledTimes(1)
            expect(mockedAxiosGet).toHaveBeenCalledWith(
                expect.stringContaining('list?recipient=test-user'),
                { timeout: 10000, signal: expect.any(AbortSignal) }
            )
        })

        it('should keep an already-qualified recipient as a single candidate', () => {
            expect(wrapper.vm.getInboxRecipient('test-user@test-domain.com')).toBe('test-user@test-domain.com')
        })

        it('should update listOfMessages when API returns data', async () => {
            // Wait for the promise to resolve
            await flushPromises()

            expect(wrapper.vm.listOfMessages).toEqual(mockMessages)
        })

        it('should set refreshing to false after fetch completes', async () => {
            await flushPromises()

            expect(wrapper.vm.refreshing).toBe(false)
        })

        it('should handle API errors gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            mockedAxiosGet.mockRejectedValueOnce(new Error('Network error'))

            // Trigger refresh manually to test error handling
            await wrapper.vm.refreshList()
            await flushPromises()

            expect(wrapper.vm.refreshing).toBe(false)
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch messages:', expect.any(Error))
        })
    })

    describe('Time Formatting', () => {
        // Time formatting is now handled in EmailListItem component
        // These tests verify the child component functionality
        it('should render email list items with correct data', async () => {
            await flushPromises()

            // Should render EmailListItem components
            const emailItems = wrapper.findAllComponents({ name: 'EmailListItem' })
            expect(emailItems.length).toBe(2)
        })
    })

    describe('Email Extraction', () => {
        // Email extraction is now handled in EmailListItem child component
        it('should pass message data to EmailListItem', async () => {
            await flushPromises()

            const emailItems = wrapper.findAllComponents({ name: 'EmailListItem' })
            expect(emailItems[0].props('message')).toEqual(mockMessages[0])
        })
    })

    describe('Message Navigation', () => {
        it('should navigate to message detail when getMessage is called', async () => {
            const pushSpy = vi.spyOn(router, 'push')

            wrapper.vm.getMessage(mockMessages[0])

            expect(pushSpy).toHaveBeenCalledWith({
                name: 'Message',
                params: {
                    region: 'us',
                    key: 'message-key-1'
                }
            })
        })
    })

    describe('Refresh Functionality', () => {
        it('should emit refreshStart event when refreshing', async () => {
            const emitSpy = vi.spyOn(emitter, 'emit')

            await wrapper.vm.refreshList()
            await flushPromises()

            expect(emitSpy).toHaveBeenCalledWith('refreshStart')
        })
    })

    describe('UI States', () => {
        it('keeps rows mounted while refreshing and preserves their identity when reordered', async () => {
            const rows = wrapper.findAllComponents({ name: 'EmailListItem' })
            let resolveRequest!: (value: unknown) => void
            mockedAxiosGet.mockReturnValueOnce(new Promise(resolve => { resolveRequest = resolve }) as any)

            const refresh = wrapper.vm.refreshList()
            await wrapper.vm.$nextTick()
            expect(wrapper.findAllComponents({ name: 'EmailListItem' })[0].vm).toBe(rows[0].vm)
            expect(wrapper.findComponent({ name: 'SkeletonLoader' }).exists()).toBe(false)

            resolveRequest({ data: [...mockMessages].reverse() })
            await refresh
            await flushPromises()
            const reordered = wrapper.findAllComponents({ name: 'EmailListItem' })
            expect(reordered[0].vm).toBe(rows[1].vm)
            expect(reordered[1].vm).toBe(rows[0].vm)
        })

        it('fetches the new inbox immediately and ignores the previous inbox response', async () => {
            let resolveOld!: (value: unknown) => void
            mockedAxiosGet.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }) as any)
            const oldRequest = wrapper.vm.refreshList()
            const oldSignal = mockedAxiosGet.mock.calls.at(-1)?.[1]?.signal
            mockedAxiosGet.mockResolvedValueOnce({ data: [] })

            await router.push('/inbox/second-user')
            await flushPromises()
            expect(oldSignal?.aborted).toBe(true)
            expect(mockedAxiosGet).toHaveBeenLastCalledWith(
                expect.stringContaining('recipient=second-user'),
                { timeout: 10000, signal: expect.any(AbortSignal) }
            )
            resolveOld({ data: mockMessages })
            await oldRequest
            expect(wrapper.vm.listOfMessages).toEqual([])
            expect(wrapper.vm.refreshing).toBe(false)
        })

        it('should show empty state when no messages', async () => {
            // Mock empty response
            mockedAxiosGet.mockResolvedValueOnce({ data: [] })
            await wrapper.vm.getMessageList()
            await flushPromises()

            // Check EmptyInbox component is rendered
            const emptyInbox = wrapper.findComponent({ name: 'EmptyInbox' })
            expect(emptyInbox.exists()).toBe(true)
        })
    })

    describe('Cleanup', () => {
        it('pauses polling while hidden and refreshes once when visible again', async () => {
            vi.clearAllMocks()
            const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
            document.dispatchEvent(new Event('visibilitychange'))
            expect(window.clearInterval).toHaveBeenCalled()
            expect(mockedAxiosGet).not.toHaveBeenCalled()

            hidden.mockReturnValue(false)
            document.dispatchEvent(new Event('visibilitychange'))
            await flushPromises()
            expect(mockedAxiosGet).toHaveBeenCalledTimes(1)
            expect(window.setInterval).toHaveBeenCalledTimes(1)
        })

        it('cancels pending requests and removes the visibility listener on unmount', () => {
            mockedAxiosGet.mockReturnValueOnce(new Promise(() => {}) as any)
            wrapper.vm.refreshList()
            const signal = mockedAxiosGet.mock.calls.at(-1)?.[1]?.signal
            const removeListener = vi.spyOn(document, 'removeEventListener')
            wrapper.unmount()
            expect(signal?.aborted).toBe(true)
            expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
        })

        it('should clear interval on component destroy', async () => {
            wrapper.unmount()

            expect(window.clearInterval).toHaveBeenCalled()
        })
    })
})
