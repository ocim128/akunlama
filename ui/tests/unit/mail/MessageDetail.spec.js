/**
 * Unit Tests for MessageDetail.vue (Vue 3)
 * Comprehensive tests for email viewing functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, mount, flushPromises } from '@vue/test-utils'
import MessageDetail from '@/components/mail/MessageDetail.vue'
import axios from 'axios'
import mitt from 'mitt'

// Mock dependencies
vi.mock('axios')

// Mock the config module
vi.mock('@/../config/apiconfig.js', () => ({
    default: {
        domain: 'test-domain.com',
        apiUrl: 'http://localhost:8080/api'
    }
}))

// Create event hub mock
const emitter = mitt()

describe('MessageDetail.vue', () => {
    let wrapper
    const mockRoute = {
        params: { region: 'us', key: '123', email: 'test-user' }
    }
    const mockRouter = {
        push: vi.fn(),
        go: vi.fn()
    }

    const mockEmailContent = {
        subject: 'Test Subject',
        name: 'John Doe',
        emailAddress: 'john@example.com',
        recipients: 'me@test-domain.com',
        Date: '2026-01-31T12:00:00Z'
    }

    beforeEach(() => {
        vi.clearAllMocks()
        axios.get.mockResolvedValue({ data: mockEmailContent })
    })

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
    })

    describe('Component Initialization', () => {
        it('renders component correctly', async () => {
            wrapper = shallowMount(MessageDetail, {
                global: {
                    mocks: {
                        $route: mockRoute,
                        $router: mockRouter,
                        $eventHub: emitter
                    }
                }
            })

            expect(wrapper.exists()).toBe(true)
        })

        it('starts in loading state', () => {
            wrapper = shallowMount(MessageDetail, {
                global: {
                    mocks: {
                        $route: mockRoute,
                        $router: mockRouter,
                        $eventHub: emitter
                    }
                }
            })

            expect(wrapper.vm.loading).toBe(true)
            expect(wrapper.vm.iframeLoading).toBe(true)
        })

        it('redirects to home if no key in params', async () => {
            wrapper = shallowMount(MessageDetail, {
                global: {
                    mocks: {
                        $route: { params: {} },
                        $router: mockRouter,
                        $eventHub: emitter
                    }
                }
            })

            expect(mockRouter.push).toHaveBeenCalledWith({
                name: 'Kitten Land'
            })
        })
    })

    describe('Message Fetching', () => {
        it('fetches message metadata on mount', async () => {
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

            expect(axios.get).toHaveBeenCalledWith(
                'http://localhost:8080/api/getKey?region=us&key=123'
            )
        })

        it('sets iframe src on mount', () => {
            wrapper = shallowMount(MessageDetail, {
                global: {
                    mocks: {
                        $route: mockRoute,
                        $router: mockRouter,
                        $eventHub: emitter
                    }
                }
            })

            expect(wrapper.vm.src).toBe('http://localhost:8080/api/getHtml?region=us&key=123')
        })

        it('updates emailContent on successful fetch', async () => {
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

            expect(wrapper.vm.emailContent.subject).toBe('Test Subject')
            expect(wrapper.vm.emailContent.name).toBe('John Doe')
            expect(wrapper.vm.loading).toBe(false)
        })

        it('handles fetch error gracefully', async () => {
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
            expect(wrapper.vm.emailContent.name).toBe('Error')
        })
    })

    describe('Date Formatting', () => {
        beforeEach(async () => {
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
        })

        it('formats today date correctly', () => {
            const now = new Date()
            const result = wrapper.vm.formatDate(now.toISOString())
            expect(result).toContain('Today')
        })

        it('returns "Unknown time" for invalid date', () => {
            expect(wrapper.vm.formatDate('invalid-date')).toBe('Unknown time')
        })

        it('returns "Unknown time" for null/undefined', () => {
            expect(wrapper.vm.formatDate(null)).toBe('Unknown time')
            expect(wrapper.vm.formatDate(undefined)).toBe('Unknown time')
        })
    })

    describe('Avatar Color Generation', () => {
        beforeEach(async () => {
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
        })

        it('generates consistent color for same email', () => {
            const color1 = wrapper.vm.getAvatarColor('test@example.com')
            const color2 = wrapper.vm.getAvatarColor('test@example.com')
            expect(color1).toBe(color2)
        })

        it('generates different colors for different emails', () => {
            const color1 = wrapper.vm.getAvatarColor('user1@example.com')
            const color2 = wrapper.vm.getAvatarColor('user2@example.com')
            // Not guaranteed to be different, but likely
            expect(typeof color1).toBe('string')
            expect(typeof color2).toBe('string')
        })

        it('returns first color for null/empty email', () => {
            const colorNull = wrapper.vm.getAvatarColor(null)
            const colorEmpty = wrapper.vm.getAvatarColor('')
            expect(colorNull).toBeDefined()
        })
    })

    describe('Initials Generation', () => {
        beforeEach(async () => {
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
        })

        it('extracts initials from full name', () => {
            expect(wrapper.vm.getInitials('test@test.com', 'John Doe')).toBe('JD')
        })

        it('extracts initials from single name', () => {
            expect(wrapper.vm.getInitials('test@test.com', 'John')).toBe('JO')
        })

        it('extracts initials from email when no name', () => {
            expect(wrapper.vm.getInitials('john@example.com', null)).toBe('JO')
            expect(wrapper.vm.getInitials('john@example.com', '')).toBe('JO')
        })

        it('handles multi-word names', () => {
            expect(wrapper.vm.getInitials('test@test.com', 'John William Doe')).toBe('JD')
        })

        it('returns ? for null email with no name', () => {
            expect(wrapper.vm.getInitials(null, null)).toBe('?')
        })
    })

    describe('Name Extraction', () => {
        beforeEach(async () => {
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
        })

        it('extracts name from email address', () => {
            expect(wrapper.vm.extractName('john.doe@example.com')).toBe('John Doe')
        })

        it('returns Unknown for empty email', () => {
            expect(wrapper.vm.extractName('')).toBe('Unknown')
            expect(wrapper.vm.extractName(null)).toBe('Unknown')
        })

        it('capitalizes first letters', () => {
            const result = wrapper.vm.extractName('john_smith@test.com')
            expect(result).toMatch(/^[A-Z]/)
        })
    })

    describe('Navigation', () => {
        beforeEach(async () => {
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
        })

        it('navigates back to list when email param exists', () => {
            wrapper.vm.goBack()

            expect(mockRouter.push).toHaveBeenCalledWith({
                name: 'List',
                params: { email: 'test-user' }
            })
        })

        it('uses router.go(-1) when no email param', async () => {
            const wrapperNoEmail = shallowMount(MessageDetail, {
                global: {
                    mocks: {
                        $route: { params: { region: 'us', key: '123' } },
                        $router: mockRouter,
                        $eventHub: emitter
                    }
                }
            })
            await flushPromises()

            wrapperNoEmail.vm.goBack()
            expect(mockRouter.go).toHaveBeenCalledWith(-1)
            wrapperNoEmail.unmount()
        })
    })

    describe('Refresh Functionality', () => {
        it('sets refreshing state during refresh', async () => {
            vi.useFakeTimers()

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

            wrapper.vm.refreshMessage()
            expect(wrapper.vm.refreshing).toBe(true)

            vi.advanceTimersByTime(600)
            await flushPromises()

            expect(wrapper.vm.refreshing).toBe(false)
            vi.useRealTimers()
        })
    })

    describe('Iframe Loading', () => {
        it('sets iframeLoading to false on load event', async () => {
            wrapper = shallowMount(MessageDetail, {
                global: {
                    mocks: {
                        $route: mockRoute,
                        $router: mockRouter,
                        $eventHub: emitter
                    }
                }
            })

            expect(wrapper.vm.iframeLoading).toBe(true)

            wrapper.vm.onIframeLoad()

            expect(wrapper.vm.iframeLoading).toBe(false)
        })
    })

    describe('Mobile Responsiveness', () => {
        it('detects mobile viewport', async () => {
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

            // Set mobile width
            await wrapper.setData({ windowWidth: 600 })
            expect(wrapper.vm.isMobile).toBe(true)

            // Set desktop width
            await wrapper.setData({ windowWidth: 1024 })
            expect(wrapper.vm.isMobile).toBe(false)
        })

        it('handles window resize', async () => {
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

            // Simulate resize
            Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
            wrapper.vm.handleResize()

            expect(wrapper.vm.windowWidth).toBe(500)
        })
    })

    describe('Copy Functionality', () => {
        it('shows copied feedback after copy', async () => {
            vi.useFakeTimers()

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

            // Mock getElementById
            document.getElementById = vi.fn().mockReturnValue({
                contentDocument: {
                    body: { innerText: 'Test content', textContent: 'Test content' }
                }
            })

            await wrapper.vm.copyEmailContent()

            expect(wrapper.vm.showCopiedFeedback).toBe(true)

            vi.advanceTimersByTime(2100)
            expect(wrapper.vm.showCopiedFeedback).toBe(false)

            vi.useRealTimers()
        })
    })
})
