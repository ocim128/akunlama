import { describe, it, expect } from 'vitest'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import Inbox from '@/components/mail/inbox.vue'
import NavBar from '@/components/NavBar.vue'

const localVue = createLocalVue()

describe('inbox.vue', () => {
    it('renders nav-bar and router-view', () => {
        const wrapper = shallowMount(Inbox, {
            localVue,
            stubs: ['router-view']
        })

        expect(wrapper.findComponent(NavBar).exists()).toBe(true)
        expect(wrapper.find('router-view-stub').exists()).toBe(true)
        expect(wrapper.find('.wrapper').exists()).toBe(true)
        expect(wrapper.find('.inbox').exists()).toBe(true)
    })
})
