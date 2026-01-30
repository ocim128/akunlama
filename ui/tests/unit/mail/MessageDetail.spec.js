/**
 * Unit Tests for message_detail.vue (Vue 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import MessageDetail from '@/components/mail/message_detail.vue'
import axios from 'axios'
import mitt from 'mitt'

// Mock dependencies
vi.mock('axios')

// Create event hub mock
const emitter = mitt()

describe('message_detail.vue', () => {
    let wrapper
    const mockRoute = {
        params: { region: 'us', key: '123', email: 'test-user' }
    }
    const mockRouter = {
        push: vi.fn(),
        go: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders and fetches message on mount', async () => {
        // Mock axios response
        axios.get.mockResolvedValue({
            data: {
                subject: 'Test Subject',
                name: 'Test Name',
                emailAddress: 'test@example.com',
                recipients: 'me@example.com',
                Date: '2023-01-01T12:00:00Z'
            }
        })

        wrapper = shallowMount(MessageDetail, {
            global: {
                mocks: {
                    $route: mockRoute,
                    $router: mockRouter,
                    $eventHub: emitter
                }
            }
        })

        // Initial loading state
        expect(wrapper.vm.loading).toBe(true)

        // Wait for promise resolution
        await flushPromises()

        expect(axios.get).toHaveBeenCalled()
        expect(wrapper.vm.loading).toBe(false)
        expect(wrapper.find('.message-subject h1').text()).toBe('Test Subject')
    })

    it('handles error when fetching message', async () => {
        axios.get.mockRejectedValue(new Error('Network Error'))

        wrapper = shallowMount(MessageDetail, {
            global: {
                mocks: {
                    $route: mockRoute,
                    $router: mockRouter,
                    $eventHub: emitter
                }
            }
        })

        await flushPromises()

        expect(wrapper.vm.loading).toBe(false)
        expect(wrapper.vm.emailContent.subject).toBe('Message could not be loaded')
    })
})
