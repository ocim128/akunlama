// index.ts - Main worker entry point
// This is a slim entry file that exports the worker handlers

import { handleEmail } from './handlers/email.ts';
import { handleFetch } from './handlers/api.ts';
import { handleScheduled } from './handlers/scheduled.ts';
import type { Env, IncomingEmail } from './types/index.d.ts';

/** Scheduled event from Cloudflare */
interface ScheduledEvent {
    cron: string;
    scheduledTime: number;
}

/** Execution context with waitUntil */
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
}

/** Extended environment for worker */
interface WorkerEnv extends Env {
    EMAIL_DOMAIN?: string;
    ADMIN_ACCESS_KEY?: string;
}

/** Cloudflare Worker export format */
export interface ExportedHandler {
    email: (message: IncomingEmail, env: WorkerEnv, ctx: ExecutionContext) => Promise<void>;
    fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => Promise<Response>;
    scheduled: (event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext) => Promise<void>;
}

const handler: ExportedHandler = {
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

export default handler;
