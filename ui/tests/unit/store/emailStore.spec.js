import { describe, it, expect } from 'vitest'
import emailStore from '@/store/emailStore'
import config from '../../../config/apiconfig'

describe('emailStore', () => {
    it('has correct initial state', () => {
        expect(emailStore.state.domain).toBe(config.domain)
        expect(emailStore.state.apiUrl).toBe(config.apiUrl)
    })

    it('exports required vuex properties', () => {
        expect(emailStore).toHaveProperty('state')
        expect(emailStore).toHaveProperty('mutations')
        expect(emailStore).toHaveProperty('getters')
        expect(emailStore).toHaveProperty('actions')
    })
})
