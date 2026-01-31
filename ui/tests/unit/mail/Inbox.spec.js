/**
 * Unit Tests for Inbox.vue (Vue 3)
 * Tests for the inbox wrapper component with split-view functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import Inbox from '@/components/mail/Inbox.vue'
import NavBar from '@/components/NavBar.vue'
import MessageList from '@/components/mail/MessageList.vue'
import MobileNav from '@/components/MobileNav.vue'

describe('Inbox.vue', () => {
    let wrapper

    const createWrapper = (options = {}) => {
        const defaultMocks = {
            $route: {
                name: 'List',
                params: { email: 'test@example.com' }
            }
        }

        return shallowMount(Inbox, {
            global: {
                stubs: ['router-view', 'font-awesome-icon'],
                mocks: { ...defaultMocks, ...options.mocks }
            },
            ...options
        })
    }

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
    })

    describe('Component Structure', () => {
        it('renders correctly', () => {
            wrapper = createWrapper()
            expect(wrapper.exists()).toBe(true)
        })

        it('renders NavBar component', () => {
            wrapper = createWrapper()
            expect(wrapper.findComponent(NavBar).exists()).toBe(true)
        })

        it('renders MessageList component', () => {
            wrapper = createWrapper()
            expect(wrapper.findComponent(MessageList).exists()).toBe(true)
        })

        it('renders MobileNav component', () => {
            wrapper = createWrapper()
            expect(wrapper.findComponent(MobileNav).exists()).toBe(true)
        })

        it('renders router-view stub', () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'Message', params: { email: 'test@example.com' } }
                }
            })
            expect(wrapper.find('router-view-stub').exists()).toBe(true)
        })

        it('has inbox-wrapper class', () => {
            wrapper = createWrapper()
            expect(wrapper.find('.inbox-wrapper').exists()).toBe(true)
        })

        it('has inbox-content class', () => {
            wrapper = createWrapper()
            expect(wrapper.find('.inbox-content').exists()).toBe(true)
        })
    })

    describe('Split View Logic', () => {
        it('enables split view on desktop (>= 1024px)', async () => {
            wrapper = createWrapper()
            await wrapper.setData({ windowWidth: 1200 })

            expect(wrapper.vm.showSplitView).toBe(true)
            expect(wrapper.find('.inbox-wrapper').classes()).toContain('split-view')
        })

        it('disables split view on mobile (< 1024px)', async () => {
            wrapper = createWrapper()
            await wrapper.setData({ windowWidth: 800 })

            expect(wrapper.vm.showSplitView).toBe(false)
            expect(wrapper.find('.inbox-wrapper').classes()).not.toContain('split-view')
        })

        it('shows empty state in split view when no message selected', async () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'List', params: { email: 'test@example.com' } }
                }
            })
            await wrapper.setData({ windowWidth: 1200 })

            expect(wrapper.find('.detail-empty').exists()).toBe(true)
            expect(wrapper.find('.empty-detail').exists()).toBe(true)
        })

        it('hides empty state when message is selected', async () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'Message', params: { email: 'test@example.com' } }
                }
            })
            await wrapper.setData({ windowWidth: 1200 })

            expect(wrapper.find('.detail-empty').exists()).toBe(false)
        })
    })

    describe('Message View Detection', () => {
        it('detects when viewing a message', () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'Message', params: { email: 'test@example.com' } }
                }
            })

            expect(wrapper.vm.isViewingMessage).toBe(true)
        })

        it('detects when not viewing a message', () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'List', params: { email: 'test@example.com' } }
                }
            })

            expect(wrapper.vm.isViewingMessage).toBe(false)
        })

        it('shows detail panel when viewing message', () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'Message', params: { email: 'test@example.com' } }
                }
            })

            expect(wrapper.vm.showDetailPanel).toBe(true)
        })

        it('hides detail panel when not viewing message (non-split)', async () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'List', params: { email: 'test@example.com' } }
                }
            })
            await wrapper.setData({ windowWidth: 800 })

            expect(wrapper.vm.showDetailPanel).toBe(false)
        })
    })

    describe('Mobile Behavior', () => {
        it('hides list panel when viewing message on mobile', async () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'Message', params: { email: 'test@example.com' } }
                }
            })
            await wrapper.setData({ windowWidth: 600 })

            expect(wrapper.vm.isMobileMessageView).toBe(true)
            expect(wrapper.find('.list-panel').classes()).toContain('panel-hidden')
        })

        it('shows list panel when not viewing message on mobile', async () => {
            wrapper = createWrapper({
                mocks: {
                    $route: { name: 'List', params: { email: 'test@example.com' } }
                }
            })
            await wrapper.setData({ windowWidth: 600 })

            expect(wrapper.vm.isMobileMessageView).toBe(false)
            expect(wrapper.find('.list-panel').classes()).not.toContain('panel-hidden')
        })

        it('shows mobile nav on small screens', async () => {
            wrapper = createWrapper()
            await wrapper.setData({ windowWidth: 600 })

            expect(wrapper.vm.showMobileNav).toBe(true)
            expect(wrapper.find('.inbox-wrapper').classes()).toContain('has-mobile-nav')
        })

        it('hides mobile nav on larger screens', async () => {
            wrapper = createWrapper()
            await wrapper.setData({ windowWidth: 900 })

            expect(wrapper.vm.showMobileNav).toBe(false)
            expect(wrapper.find('.inbox-wrapper').classes()).not.toContain('has-mobile-nav')
        })
    })

    describe('Window Resize Handling', () => {
        it('updates windowWidth on resize', async () => {
            wrapper = createWrapper()

            // Initial width
            expect(wrapper.vm.windowWidth).toBeDefined()

            // Simulate resize
            Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
            wrapper.vm.handleResize()

            expect(wrapper.vm.windowWidth).toBe(500)
        })

        it('adds resize listener on mount', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

            wrapper = createWrapper()

            expect(addEventListenerSpy).toHaveBeenCalledWith('resize', wrapper.vm.handleResize)
        })

        it('removes resize listener on unmount', () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

            wrapper = createWrapper()
            const handleResize = wrapper.vm.handleResize
            wrapper.unmount()

            expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', handleResize)
        })
    })

    describe('Message Selection Handler', () => {
        it('has handleMessageSelected method', () => {
            wrapper = createWrapper()

            expect(typeof wrapper.vm.handleMessageSelected).toBe('function')
        })

        it('handleMessageSelected accepts a message parameter', () => {
            wrapper = createWrapper()

            // Should not throw
            expect(() => {
                wrapper.vm.handleMessageSelected({ id: 1, subject: 'Test' })
            }).not.toThrow()
        })
    })

    describe('Computed Properties', () => {
        it('showSplitView is reactive to windowWidth', async () => {
            wrapper = createWrapper()

            await wrapper.setData({ windowWidth: 1200 })
            expect(wrapper.vm.showSplitView).toBe(true)

            await wrapper.setData({ windowWidth: 800 })
            expect(wrapper.vm.showSplitView).toBe(false)
        })

        it('showMobileNav threshold is 768px', async () => {
            wrapper = createWrapper()

            await wrapper.setData({ windowWidth: 767 })
            expect(wrapper.vm.showMobileNav).toBe(true)

            await wrapper.setData({ windowWidth: 768 })
            expect(wrapper.vm.showMobileNav).toBe(false)
        })
    })
})
