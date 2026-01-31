import { defineStore } from 'pinia'
import config from '@/../config/apiconfig.js'

export const useEmailStore = defineStore('email', {
    state: () => ({
        apiUrl: config.apiUrl,
        domain: config.domain,
        autoRefreshInterval: config.autoRefreshInterval || 30000,
        requestTimeout: config.requestTimeout || 10000,
        maxEmailsDisplay: config.maxEmailsDisplay || 50,
        retentionPeriod: config.retentionPeriod || '3 days'
    }),
    getters: {
        // Add any necessary getters here
    },
    actions: {
        // Add any necessary actions here
    }
})
