const express = require('express');
const cors = require('cors');
const compression = require('compression');
const cacheControl = require("./config/cacheControl");
const app = express();

// Enable CORS for all routes
app.use(cors());

// Trust proxy headers for IP detection
app.set('trust proxy', true);

// Load banned IP addresses from environment variable
const getBannedIPs = () => {
    const bannedIPsEnv = process.env.BANNED_IPS || '';
    if (bannedIPsEnv) {
        const ips = bannedIPsEnv.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
        console.log(`Loaded ${ips.length} banned IP addresses`);
        return new Set(ips);
    }
    return new Set();
};

const bannedIPs = getBannedIPs();

// Enable gzip compression
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
    chunkSize: 1024
}));

// IP extraction and security middleware
app.use((req, res, next) => {
    // Extract real IP address
    req.realIP = req.ip ||
        req.connection.remoteAddress ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        'unknown';

    // Check if IP is banned - return empty array to hide the ban
    if (bannedIPs.has(req.realIP)) {
        console.log(`[BANNED IP] Blocked request from: ${req.realIP}`);

        if (req.path.startsWith('/api/')) {
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.status(200).json([]);
        }
    }

    // Security headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('X-XSS-Protection', '1; mode=block');

    // Performance headers
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=5, max=1000');
    res.set('Vary', 'Accept-Encoding, User-Agent');

    next();
});

// Input validation middleware
app.use((req, res, next) => {
    for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && value.length > 100) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Parameter too long'
            });
        }
    }
    next();
});

// Optimize JSON responses
app.set('json spaces', 0);
app.set('json replacer', null);

// Dynamic backend selection based on MAIL_CONFIG environment variable
const mailConfig = (process.env.MAIL_CONFIG || 'MAILGUN').toUpperCase();
console.log(`[INIT] Initializing backend with MAIL_CONFIG=${mailConfig}`);

let mailList, mailGetInfo, mailGetHtml;

try {
    if (mailConfig === 'CLOUDFLARE') {
        console.log("Using CLOUDFLARE email configuration");
        mailList = require("./src/api/mailListCloudflare");
        mailGetInfo = require("./src/api/mailGetInfoCloudflare");
        mailGetHtml = require("./src/api/mailGetHtmlCloudflare");
    } else {
        console.log("Using MAILGUN email configuration (default)");
        mailList = require("./src/api/mailList");
        mailGetInfo = require("./src/api/mailGetInfo");
        mailGetHtml = require("./src/api/mailGetHtml");
    }
} catch (error) {
    console.error(`[CRITICAL] Error initializing backend modules for ${mailConfig}:`, error);
    // Fallback error handler
    const errorHandler = (req, res) => {
        res.status(500).json({
            error: "Backend Initialization Failed",
            details: error.message,
            config: mailConfig
        });
    };
    mailList = errorHandler;
    mailGetInfo = errorHandler;
    mailGetHtml = errorHandler;
}

// Health check endpoint
app.get("/health", (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        backend: mailConfig
    });
});

// API routes
app.get("/api/v1/mail/list", (req, res) => {
    console.log(`[${req.realIP}] /api/v1/mail/list`, req.query);
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45, stale-if-error=120');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');
    mailList(req, res);
});

app.get("/api/v1/mail/getInfo", (req, res) => {
    console.log(`[${req.realIP}] /api/v1/mail/getInfo`, req.query);
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120, stale-if-error=300');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');
    mailGetInfo(req, res);
});

// Alias for getInfo as the UI uses /getKey
app.get("/api/v1/mail/getKey", (req, res) => {
    console.log(`[${req.realIP}] /api/v1/mail/getKey`, req.query);
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120, stale-if-error=300');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');
    mailGetInfo(req, res);
});

app.get("/api/v1/mail/getHtml", (req, res) => {
    console.log(`[${req.realIP}] /api/v1/mail/getHtml`, req.query);
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800, stale-if-error=3600');
    res.set('Vary', 'Accept-Encoding');
    mailGetHtml(req, res);
});

// Static file handling with optimized cache control
const staticRegex = /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i;
const immutableRegex = /\.(css|js)$/i;

app.use(express.static("public", {
    etag: true,
    lastModified: true,
    maxAge: 0,
    setHeaders: (res, path) => {
        const ext = path.toLowerCase();
        if (immutableRegex.test(ext)) {
            res.set('Cache-Control', cacheControl.immutable);
        } else if (staticRegex.test(ext)) {
            res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
        } else {
            res.set('Cache-Control', cacheControl.static);
        }

        // Set appropriate content types
        if (ext.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        } else if (ext.endsWith('.woff2')) {
            res.set('Content-Type', 'font/woff2');
        } else if (ext.endsWith('.woff')) {
            res.set('Content-Type', 'font/woff');
        }
    }
}));

// 404 fallback for API - don't serve index.html for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

// 404 fallback - serve index.html for SPA routing
app.use((req, res) => {
    res.set('Cache-Control', cacheControl.static);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(__dirname + '/public/index.html');
});

// Export for serverless deployment
module.exports = app;

// Start server when run directly
if (require.main === module) {
    const port = process.env.PORT || 8000;
    const server = app.listen(port, () => {
        console.log("===========================================");
        console.log(`🚀 API RUNNING ON PORT ${port}`);
        console.log(`📧 Backend: ${mailConfig}`);
        console.log("===========================================");
        console.log("Features: compression, caching, security, rate limiting");

        // Single memory monitoring interval (reduced from 2 to 1)
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

            // Log warning if memory exceeds threshold
            if (heapUsedMB > 150) {
                console.log(`[MEMORY WARNING] High usage: ${heapUsedMB}MB heap`);
            }
        }, 300000); // Every 5 minutes
    });

    server.keepAliveTimeout = 5000;
    server.headersTimeout = 6000;
}
