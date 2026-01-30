/**
 * Email Store - Pinia (Vue 3)
 * Migrated from Vuex store
 */
import { defineStore } from 'pinia'
import config from '@/../config/apiconfig.js'

export const useEmailStore = defineStore('email', {
    state: () => ({
        domain: config.domain,
        apiUrl: config.apiUrl
    }),
    getters: {},
    actions: {}
})
