// scheduled.js - Scheduled cron handler

import { runCleanup } from '../services/cleanup.js';

/**
 * Scheduled cron handler - runs to clean up old emails
 * Configure in wrangler.toml:
 * [triggers]
 * crons = ["0 0,12 * * *"]  # Runs every 12 hours
 */
export async function handleScheduled(event, env, ctx) {
    ctx.waitUntil(runCleanup(env));
}
