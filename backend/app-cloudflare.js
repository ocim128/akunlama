// =====================================
// CLOUDFLARE EMAIL API - app.js
// =====================================
// This is the Cloudflare version that replaces Mailgun
// To use this, rename app.js to app-mailgun.js and rename this file to app.js

const express = require('express');
const compression = require('compression');
const cacheControl = require("./config/cacheControl");
const app = express();

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
    req.realIP = req.ip ||
        req.connection.remoteAddress ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        'unknown';

    if (bannedIPs.has(req.realIP)) {
        console.log(`[BANNED IP] Blocked request from: ${req.realIP}`);

        if (req.path.startsWith('/api/')) {
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.status(200).json([]);
        }
    }

    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('X-XSS-Protection', '1; mode=block');
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

app.set('json spaces', 0);
app.set('json replacer', null);

// =====================================
// CLOUDFLARE API ROUTES
// =====================================
const mailList = require("./src/api/mailListCloudflare");
const mailGetInfo = require("./src/api/mailGetInfoCloudflare");
const mailGetHtml = require("./src/api/mailGetHtmlCloudflare");

app.get("/api/v1/mail/list", (req, res) => {
    console.log(`[${req.realIP}] Received /api/v1/mail/list with parameters:`, req.query);

    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45, stale-if-error=120');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');

    mailList(req, res);
});

app.get("/api/v1/mail/getInfo", (req, res) => {
    console.log(`[${req.realIP}] Received /api/v1/mail/getInfo with parameters:`, req.query);

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120, stale-if-error=300');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');

    mailGetInfo(req, res);
});

app.get("/api/v1/mail/getHtml", (req, res) => {
    console.log(`[${req.realIP}] Received /api/v1/mail/getHtml with parameters:`, req.query);

    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800, stale-if-error=3600');
    res.set('Vary', 'Accept-Encoding');

    mailGetHtml(req, res);
});

// Static file handling
const staticRegex = /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i;
const immutableRegex = /\.(css|js)$/i;

app.use(express.static("public", {
    etag: true,
    lastModified: true,
    maxAge: 0,
    setHeaders: function (res, path, stat) {
        const ext = path.toLowerCase();

        if (immutableRegex.test(ext)) {
            res.set('Cache-Control', cacheControl.immutable);
        } else if (staticRegex.test(ext)) {
            res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
        } else {
            res.set('Cache-Control', cacheControl.static);
        }

        if (ext.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        } else if (ext.endsWith('.woff2')) {
            res.set('Content-Type', 'font/woff2');
        } else if (ext.endsWith('.woff')) {
            res.set('Content-Type', 'font/woff');
        }
    }
}));

// 404 handling
app.use(function (req, res) {
    res.set('Cache-Control', cacheControl.static);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(__dirname + '/public/index.html');
});

// Start server
var server = app.listen(8000, function () {
    console.log("===========================================");
    console.log("🚀 CLOUDFLARE EMAIL API - Running on port", server.address().port);
    console.log("===========================================");
    console.log("Backend: Cloudflare Email Workers + D1");
    console.log("Mailgun: DISABLED (using Cloudflare instead)");
    console.log("Bandwidth optimization: ENABLED");
    console.log("Security features: ENABLED");
    console.log("===========================================");

    // Memory monitoring
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        if (heapUsedMB > 150) {
            const memMB = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: heapUsedMB,
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            };
            console.log(`[MEMORY WARNING] High memory usage: RSS=${memMB.rss}MB, Heap=${memMB.heapUsed}/${memMB.heapTotal}MB`);
        }
    }, 300000);
});

server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;
