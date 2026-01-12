import { describe, it, expect, vi } from 'vitest'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import MessageDetail from '@/components/mail/message_detail.vue'
import axios from 'axios'

const localVue = createLocalVue()

// Mock dependencies
vi.mock('axios')

describe('message_detail.vue', () => {
    let wrapper
    const $route = {
        params: { region: 'us', key: '123' }
    }
    const $router = {
        push: vi.fn(),
        go: vi.fn()
    }
    const $eventHub = {
        $on: vi.fn(),
        $off: vi.fn()
    }

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
            localVue,
            mocks: {
                $route,
                $router,
                $eventHub
            }
        })

        // Initial loading state
        expect(wrapper.vm.loading).toBe(true)

        // Wait for promise resolution (microtask)
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(axios.get).toHaveBeenCalled()
        expect(wrapper.vm.loading).toBe(false)
        expect(wrapper.find('.message-subject h1').text()).toBe('Test Subject')
    })

    it('handles error when fetching message', async () => {
        axios.get.mockRejectedValue(new Error('Network Error'))

        wrapper = shallowMount(MessageDetail, {
            localVue,
            mocks: {
                $route,
                $router,
                $eventHub
            }
        })

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.loading).toBe(false)
        expect(wrapper.vm.emailContent.subject).toBe('Message could not be loaded')
    })
})
