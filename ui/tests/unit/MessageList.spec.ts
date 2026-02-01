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
        apiUrl: 'http://localhost:8080/api/v1/mail'
    }
}))

describe('MessageList.vue', () => {
    let wrapper: VueWrapper<any>
    let router: Router

    const mockMessages = [
        {
            url: 'http://api.mailgun.net/storage/1',
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
            url: 'http://api.mailgun.net/storage/2',
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
        // @ts-ignore
        axios.get.mockResolvedValue({ data: mockMessages })

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
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('list?recipient=test-user')
            )
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
            // @ts-ignore
            axios.get.mockRejectedValueOnce(new Error('Network error'))

            // Trigger refresh manually to test error handling
            await wrapper.vm.refreshList()
            await flushPromises()

            expect(wrapper.vm.refreshing).toBe(false)
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
        it('should show empty state when no messages', async () => {
            // Mock empty response
            // @ts-ignore
            axios.get.mockResolvedValueOnce({ data: [] })
            await wrapper.vm.getMessageList()
            await flushPromises()

            // Check EmptyInbox component is rendered
            const emptyInbox = wrapper.findComponent({ name: 'EmptyInbox' })
            expect(emptyInbox.exists()).toBe(true)
        })
    })

    describe('Cleanup', () => {
        it('should clear interval on component destroy', async () => {
            wrapper.unmount()

            expect(window.clearInterval).toHaveBeenCalled()
        })
    })
})
