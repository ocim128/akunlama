/**
 * Unit Tests for Email Store (Pinia - Vue 3)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEmailStore } from '@/stores/email'

describe('Email Store (Pinia)', () => {
    beforeEach(() => {
        // Create a fresh pinia and make it active for each test
        setActivePinia(createPinia())
    })

    it('has correct initial state', () => {
        const store = useEmailStore()

        expect(store.domain).toBeDefined()
        expect(store.apiUrl).toBeDefined()
    })

    it('exports required pinia properties', () => {
        const store = useEmailStore()

        expect(store.$id).toBe('email')
        expect(typeof store.domain).toBe('string')
        expect(typeof store.apiUrl).toBe('string')
    })
})
