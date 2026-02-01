// scheduled.ts - Scheduled cron handler

import { runCleanup } from '../services/cleanup.ts';
import type { Env } from '../types/index.d.ts';

/** Scheduled event from Cloudflare */
interface ScheduledEvent {
    cron: string;
    scheduledTime: number;
}

/** Execution context with waitUntil */
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
}

/**
 * Scheduled cron handler - runs to clean up old emails
 * Configure in wrangler.toml:
 * [triggers]
 * crons = ["0 0,12 * * *"]  # Runs every 12 hours
 */
export async function handleScheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
): Promise<void> {
    ctx.waitUntil(runCleanup(env));
}
