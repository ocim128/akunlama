/**
 * Unit Tests for MessageList.vue (Vue 3)
 * Tests the email inbox functionality including message fetching,
 * time formatting, and user interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
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

        wrapper = shallowMount(MessageList, {
            global: {
                plugins: [router],
                provide: {
                    eventHub: emitter
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

        // Note: Testing "start with empty list" is hard with auto-fetch on mount in setup.
        // We can skip that one or test it by delaying mock response.

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
            // We need to remount to change mock behavior for initial fetch
            // OR we can test the refresh method failure

            // @ts-ignore
            axios.get.mockRejectedValueOnce(new Error('Network error'))

            // Trigger refresh manually to test error handling
            await wrapper.vm.refreshList()

            expect(wrapper.vm.refreshing).toBe(false)
        })
    })

    describe('Time Formatting', () => {
        it('should display "Just now" for messages less than 1 minute old', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 30 }
            // @ts-ignore
            expect(wrapper.vm.calculateTime(msg)).toBe('Just now')
        })

        it('should display minutes ago for recent messages', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 300 } // 5 mins
            // @ts-ignore
            expect(wrapper.vm.calculateTime(msg)).toMatch(/\d+m ago/)
        })

        it('should display hours ago for messages within a day', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 7200 } // 2 hours
            // @ts-ignore
            expect(wrapper.vm.calculateTime(msg)).toMatch(/\d+h ago/)
        })

        it('should display "Yesterday" for messages from yesterday', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 86400 }
            // @ts-ignore
            expect(wrapper.vm.calculateTime(msg)).toBe('Yesterday')
        })
    })

    describe('Email Extraction', () => {
        it('should extract email from simple format', () => {
            expect(wrapper.vm.extractEmail('user@example.com')).toBe('user@example.com')
        })

        it('should extract email from "Name <email>" format', () => {
            expect(wrapper.vm.extractEmail('John Doe <john@example.com>')).toBe('john@example.com')
        })

        it('should return original string if no email found', () => {
            expect(wrapper.vm.extractEmail('No Email Here')).toBe('No Email Here')
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

            expect(emitSpy).toHaveBeenCalledWith('refreshStart')
            expect(wrapper.vm.refreshing).toBe(false) // it awaits completion
        })
    })

    describe('UI States', () => {
        // These tests rely on DOM updates which might be sensitive to async
        // and stubs.
        it('should show empty state when no messages', async () => {
            // Mock empty response
            // @ts-ignore
            axios.get.mockResolvedValueOnce({ data: [] })
            await wrapper.vm.getMessageList()
            await flushPromises()

            // Check valid empty state class
            // We need to force update or ensure state is synced
            expect(wrapper.find('.empty-state').exists()).toBe(true)
        })
    })

    describe('Cleanup', () => {
        it('should clear interval on component destroy', async () => {
            wrapper.unmount()

            expect(window.clearInterval).toHaveBeenCalled()
        })
    })
})
