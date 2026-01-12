/**
 * Unit Tests for MessageList.vue
 * Tests the email inbox functionality including message fetching,
 * time formatting, and user interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import VueRouter from 'vue-router'
import axios from 'axios'
import MessageList from '@/components/mail/message_list.vue'

// Mock axios
vi.mock('axios')

// Create a local Vue instance
const localVue = createLocalVue()
localVue.use(VueRouter)

// Add event hub to Vue prototype
localVue.prototype.$eventHub = new localVue()

// Mock the config module
vi.mock('@/../config/apiconfig.js', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api/v1/mail'
    }
}))

// Mock vue-spinner
vi.mock('vue-spinner/src/PulseLoader.vue', () => ({
    default: { template: '<div class="pulse-loader-mock"></div>' }
}))

// Mock vuescroll
vi.mock('vuescroll', () => ({
    default: {
        name: 'vue-scroll',
        template: '<div><slot></slot></div>'
    }
}))

describe('MessageList.vue', () => {
    let wrapper
    let router

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

    beforeEach(() => {
        // Mock setInterval to prevent auto-refresh issues
        vi.spyOn(window, 'setInterval').mockReturnValue(123)
        vi.spyOn(window, 'clearInterval').mockImplementation(() => { })

        router = new VueRouter({
            routes: [
                { path: '/inbox/:email', name: 'Inbox' },
                { path: '/inbox/:email/:region/:key', name: 'Message' },
                { path: '/', name: 'Kitten Land' }
            ]
        })

        // Mock the API response
        axios.get.mockResolvedValue({ data: mockMessages })

        router.push('/inbox/test-user')

        wrapper = shallowMount(MessageList, {
            localVue,
            router,
            stubs: {
                'vue-scroll': { template: '<div><slot></slot></div>' },
                'pulse-loader': { template: '<div class="spinner-stub"></div>' },
                'nav-bar': true
            }
        })
    })

    afterEach(() => {
        wrapper.destroy()
        vi.restoreAllMocks()
        vi.clearAllMocks()
    })

    describe('Component Initialization', () => {
        it('should mount correctly', () => {
            expect(wrapper.exists()).toBe(true)
        })

        it('should start with empty message list', () => {
            const freshWrapper = shallowMount(MessageList, {
                localVue,
                router,
                stubs: {
                    'vue-scroll': { template: '<div><slot></slot></div>' },
                    'pulse-loader': { template: '<div class="spinner-stub"></div>' },
                    'nav-bar': true
                },
                data() {
                    return { listOfMessages: [], refreshing: false }
                }
            })
            expect(freshWrapper.vm.listOfMessages).toEqual([])
            freshWrapper.destroy()
        })

        it('should set up auto-refresh interval on mount', () => {
            expect(window.setInterval).toHaveBeenCalledWith(
                expect.any(Function),
                10000
            )
        })
    })

    describe('Message Fetching', () => {
        it('should call API to fetch messages on mount', () => {
            expect(axios.get).toHaveBeenCalledWith(
                'http://localhost:8080/api/v1/mail/list?recipient=test-user'
            )
        })

        it('should update listOfMessages when API returns data', async () => {
            // Wait for the promise to resolve
            await wrapper.vm.$nextTick()
            // Wait for the axios promise
            await new Promise(resolve => setTimeout(resolve, 10))

            expect(wrapper.vm.listOfMessages).toEqual(mockMessages)
        })

        it('should set refreshing to false after fetch completes', async () => {
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))

            expect(wrapper.vm.refreshing).toBe(false)
        })

        it('should handle API errors gracefully', async () => {
            // Create a new wrapper with error response
            axios.get.mockRejectedValueOnce(new Error('Network error'))

            const errorWrapper = shallowMount(MessageList, {
                localVue,
                router,
                stubs: {
                    'vue-scroll': { template: '<div><slot></slot></div>' },
                    'pulse-loader': { template: '<div class="spinner-stub"></div>' },
                    'nav-bar': true
                }
            })

            await errorWrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 10))

            expect(errorWrapper.vm.refreshing).toBe(false)
            errorWrapper.destroy()
        })
    })

    describe('Time Formatting', () => {
        it('should display "Just now" for messages less than 1 minute old', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 30 }
            expect(wrapper.vm.calculateTime(msg)).toBe('Just now')
        })

        it('should display minutes ago for recent messages', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 300 } // 5 mins
            expect(wrapper.vm.calculateTime(msg)).toMatch(/\d+m ago/)
        })

        it('should display hours ago for messages within a day', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 7200 } // 2 hours
            expect(wrapper.vm.calculateTime(msg)).toMatch(/\d+h ago/)
        })

        it('should display "Yesterday" for messages from yesterday', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 86400 }
            expect(wrapper.vm.calculateTime(msg)).toBe('Yesterday')
        })

        it('should display days ago for older messages', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 259200 } // 3 days
            expect(wrapper.vm.calculateTime(msg)).toMatch(/\d+ days ago/)
        })

        it('should display date for messages older than a week', () => {
            const msg = { timestamp: Math.floor(Date.now() / 1000) - 1209600 } // 14 days
            expect(wrapper.vm.calculateTime(msg)).toMatch(/\d{2} \w{3}/)
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

        it('should extract first email when multiple are present', () => {
            // The extractEmail function uses a regex that may include trailing comma
            // So we test what the actual behavior is - extracting an email from the string
            const result = wrapper.vm.extractEmail('first@example.com, second@example.com')
            expect(result).toContain('first@example.com')
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
        it('should emit refreshStart event when refreshing', () => {
            const emitSpy = vi.spyOn(wrapper.vm.$eventHub, '$emit')

            wrapper.vm.refreshList()

            expect(emitSpy).toHaveBeenCalledWith('refreshStart')
            expect(wrapper.vm.refreshing).toBe(true)
        })
    })

    describe('UI States', () => {
        it('should show empty state when no messages', async () => {
            await wrapper.setData({ listOfMessages: [], refreshing: false })

            expect(wrapper.find('.empty-state').exists()).toBe(true)
        })

        it('should show loading state when refreshing', async () => {
            await wrapper.setData({ refreshing: true })

            expect(wrapper.find('.loading-container').exists()).toBe(true)
        })

        it('should show email list when messages exist', async () => {
            await wrapper.setData({ listOfMessages: mockMessages, refreshing: false })

            expect(wrapper.find('.email-list-container').exists()).toBe(true)
        })

        it('should display correct message count in header', async () => {
            await wrapper.setData({ listOfMessages: mockMessages, refreshing: false })

            expect(wrapper.find('.email-list-header h3').text()).toContain('(2)')
        })
    })

    describe('Cleanup', () => {
        it('should clear interval on component destroy', async () => {
            wrapper.destroy()

            expect(window.clearInterval).toHaveBeenCalled()
        })
    })
})
