import { describe, it, expect } from 'vitest'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import App from '@/App.vue'
import VueRouter from 'vue-router'

const localVue = createLocalVue()
localVue.use(VueRouter)

describe('App.vue', () => {
    it('renders correctly', () => {
        const wrapper = shallowMount(App, {
            localVue,
            stubs: ['router-view']
        })

        // Check if the main container exists
        expect(wrapper.find('#app').exists()).toBe(true)

        // Check if router-view is present
        expect(wrapper.find('.app-router-view').exists()).toBe(true)

        // Check github corner
        expect(wrapper.find('.github-corner').exists()).toBe(true)
    })

    it('contains correct data from config', () => {
        const wrapper = shallowMount(App, {
            localVue,
            stubs: ['router-view']
        })

        expect(wrapper.vm.githubLink).toBeDefined()
        expect(wrapper.vm.githubAriaLabel).toBeDefined()
    })
})
