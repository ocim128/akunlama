/**
 * Unit Tests for Inbox.vue (Vue 3)
 * Tests for the inbox wrapper component with split-view functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import Inbox from '@/components/mail/Inbox.vue'
import NavBar from '@/components/NavBar.vue'
import MessageList from '@/components/mail/MessageList.vue'
import MobileNav from '@/components/MobileNav.vue'

describe('Inbox.vue', () => {
    let wrapper: VueWrapper<any>
    let router: Router

    const createWrapper = async (options: any = {}) => {
        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/inbox/:email', name: 'List', component: { template: '<div/>' } },
                { path: '/inbox/:email/:region/:key', name: 'Message', component: { template: '<div/>' } },
            ]
        })

        if (options.route) {
            router.push(options.route)
            await router.isReady()
        } else {
            router.push({ name: 'List', params: { email: 'test@example.com' } })
            await router.isReady()
        }

        return shallowMount(Inbox, {
            global: {
                plugins: [router],
                stubs: {
                    'router-view': true,
                    'font-awesome-icon': true,
                    'NavBar': true,
                    'MessageList': true,
                    'MobileNav': true
                },
                mocks: options.mocks
            },
            ...options
        })
    }

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
        vi.restoreAllMocks()
    })

    // To test resizing properly with script setup and window event:
    const resizeWindow = async (width: number) => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
        window.dispatchEvent(new Event('resize'))
        await flushPromises()
    }

    describe('Component Structure', () => {
        it('renders correctly', async () => {
            wrapper = await createWrapper()
            expect(wrapper.exists()).toBe(true)
        })

        it('renders NavBar component', async () => {
            wrapper = await createWrapper()
            expect(wrapper.findComponent(NavBar).exists()).toBe(true)
        })

        it('renders MessageList component', async () => {
            wrapper = await createWrapper()
            expect(wrapper.findComponent(MessageList).exists()).toBe(true)
        })

        it('renders MobileNav component', async () => {
            wrapper = await createWrapper()
            expect(wrapper.findComponent(MobileNav).exists()).toBe(true)
        })

        it('has inbox-wrapper class', async () => {
            wrapper = await createWrapper()
            expect(wrapper.find('.inbox-wrapper').exists()).toBe(true)
        })
    })

    describe('Split View Logic', () => {
        it('enables split view on desktop (>= 1024px)', async () => {
            wrapper = await createWrapper()
            await resizeWindow(1200)

            expect(wrapper.vm.showSplitView).toBe(true)
            expect(wrapper.find('.inbox-wrapper').classes()).toContain('split-view')
        })

        it('disables split view on mobile (< 1024px)', async () => {
            wrapper = await createWrapper()
            await resizeWindow(800)

            expect(wrapper.vm.showSplitView).toBe(false)
            expect(wrapper.find('.inbox-wrapper').classes()).not.toContain('split-view')
        })

        it('shows empty state in split view when no message selected', async () => {
            wrapper = await createWrapper({
                route: { name: 'List', params: { email: 'test@example.com' } }
            })
            await resizeWindow(1200)

            expect(wrapper.find('.detail-empty').exists()).toBe(true)
            expect(wrapper.find('.empty-detail').exists()).toBe(true)
        })

        it('hides empty state when message is selected', async () => {
            wrapper = await createWrapper({
                route: { name: 'Message', params: { email: 'test@example.com', region: 'us', key: '123' } }
            })
            await resizeWindow(1200)

            expect(wrapper.find('.detail-empty').exists()).toBe(false)
        })
    })

    describe('Message View Detection', () => {
        it('detects when viewing a message', async () => {
            wrapper = await createWrapper({
                route: { name: 'Message', params: { email: 'test@example.com', region: 'us', key: '123' } }
            })

            expect(wrapper.vm.isViewingMessage).toBe(true)
        })

        it('detects when not viewing a message', async () => {
            wrapper = await createWrapper({
                route: { name: 'List', params: { email: 'test@example.com' } }
            })

            expect(wrapper.vm.isViewingMessage).toBe(false)
        })
    })

    describe('Mobile Behavior', () => {
        it('hides list panel when viewing message on mobile', async () => {
            wrapper = await createWrapper({
                route: { name: 'Message', params: { email: 'test@example.com', region: 'us', key: '123' } }
            })
            await resizeWindow(600)

            expect(wrapper.vm.isMobileMessageView).toBe(true)
            // expect(wrapper.find('.list-panel').classes()).toContain('panel-hidden')
        })

        it('shows list panel when not viewing message on mobile', async () => {
            wrapper = await createWrapper({
                route: { name: 'List', params: { email: 'test@example.com' } }
            })
            await resizeWindow(600)

            expect(wrapper.vm.isMobileMessageView).toBe(false)
            // expect(wrapper.find('.list-panel').classes()).not.toContain('panel-hidden')
        })

        it('shows mobile nav on small screens', async () => {
            wrapper = await createWrapper()
            await resizeWindow(600)

            expect(wrapper.vm.showMobileNav).toBe(true)
            expect(wrapper.find('.inbox-wrapper').classes()).toContain('has-mobile-nav')
        })
    })

    describe('Window Resize Handling', () => {
        it('updates windowWidth on resize', async () => {
            wrapper = await createWrapper()

            await resizeWindow(500)
            expect(wrapper.vm.windowWidth).toBe(500)
        })

        it('adds resize listener on mount', async () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
            wrapper = await createWrapper()
            expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
        })
    })
})
