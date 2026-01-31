// index.js - Main worker entry point
// This is a slim entry file that exports the worker handlers

import { handleEmail } from './handlers/email.js';
import { handleFetch } from './handlers/api.js';
import { handleScheduled } from './handlers/scheduled.js';

export default {
    /**
     * Email handler - processes inbound emails from Cloudflare Email Routing
     */
    email: handleEmail,

    /**
     * HTTP fetch handler - API endpoints for frontend
     */
    fetch: handleFetch,

    /**
     * Scheduled cron handler - runs to clean up old emails
     * Configure in wrangler.toml:
     * [triggers]
     * crons = ["0 0,12 * * *"]
     */
    scheduled: handleScheduled
};
