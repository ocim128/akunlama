/**
 * Unit Tests for inbox.vue (Vue 3)
 */
import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import Inbox from '@/components/mail/Inbox.vue'
import NavBar from '@/components/NavBar.vue'

describe('inbox.vue', () => {
    it('renders nav-bar and router-view', () => {
        const wrapper = shallowMount(Inbox, {
            global: {
                stubs: ['router-view', 'nav-bar', 'mobile-nav'],
                mocks: {
                    $route: {
                        name: 'Message',
                        params: { email: 'test@example.com' }
                    }
                }
            }
        })

        expect(wrapper.findComponent(NavBar).exists()).toBe(true)
        expect(wrapper.find('router-view-stub').exists()).toBe(true)
        expect(wrapper.find('.inbox-wrapper').exists()).toBe(true)
        expect(wrapper.find('.inbox-content').exists()).toBe(true)
    })
})
