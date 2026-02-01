import { defineStore } from 'pinia'
import config from '@/../config/apiconfig'

/** Email configuration from apiconfig */
interface EmailConfig {
    apiUrl: string;
    domain: string;
    autoRefreshInterval?: number;
    requestTimeout?: number;
    maxEmailsDisplay?: number;
    retentionPeriod?: string;
}

/** Store state type */
interface EmailState {
    apiUrl: string;
    domain: string;
    autoRefreshInterval: number;
    requestTimeout: number;
    maxEmailsDisplay: number;
    retentionPeriod: string;
}

const typedConfig = config as EmailConfig;

export const useEmailStore = defineStore('email', {
    state: (): EmailState => ({
        apiUrl: typedConfig.apiUrl,
        domain: typedConfig.domain,
        autoRefreshInterval: typedConfig.autoRefreshInterval || 30000,
        requestTimeout: typedConfig.requestTimeout || 10000,
        maxEmailsDisplay: typedConfig.maxEmailsDisplay || 50,
        retentionPeriod: typedConfig.retentionPeriod || '3 days'
    }),
    getters: {
        // Add any necessary getters here
    },
    actions: {
        // Add any necessary actions here
    }
})
