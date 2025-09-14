"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const cacheControl_1 = __importDefault(require("./config/cacheControl"));
const mailList_1 = __importDefault(require("./src/api/mailList"));
const mailGetInfo_1 = __importDefault(require("./src/api/mailGetInfo"));
const mailGetHtml_1 = __importDefault(require("./src/api/mailGetHtml"));
const app = (0, express_1.default)();
// Trust proxy headers for IP detection (important for production)
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
// Enable gzip compression for all responses
app.use((0, compression_1.default)({
    filter: (req, res) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
            return false;
        }
        // fallback to standard filter function
        return compression_1.default.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is good balance)
    threshold: 1024, // Only compress responses > 1KB
    chunkSize: 1024 // Process data in 1KB chunks
}));
// IP extraction and security middleware
app.use((req, res, next) => {
    // Extract real IP address
    const xForwardedFor = req.headers['x-forwarded-for'];
    req.realIP = req.ip ||
        req.connection?.remoteAddress ||
        (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor)?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        'unknown';
    // Check if IP is banned - return empty array to hide the ban
    if (bannedIPs.has(req.realIP)) {
        console.log(`[BANNED IP] Blocked request from: ${req.realIP}`);
        // For API endpoints, return empty array to look like no emails
        if (req.path?.startsWith('/api/')) {
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.status(200).json([]);
            return;
        }
        // For other requests (like static files), continue normally
        // This way the site appears to work but API returns no data
    }
    // Security headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('X-XSS-Protection', '1; mode=block');
    // Performance headers
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=5, max=1000');
    // CDN and caching friendly headers
    res.set('Vary', 'Accept-Encoding, User-Agent');
    next();
});
// Input validation middleware
app.use((req, res, next) => {
    // Limit query parameter sizes to prevent DoS
    for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && value.length > 100) {
            res.status(400).json({
                error: 'Invalid request',
                message: 'Parameter too long'
            });
            return;
        }
    }
    next();
});
// Optimize JSON responses
app.set('json spaces', 0); // Minimize JSON output
app.set('json replacer', null); // Don't replace anything
// Setup the routes with optimized responses
app.get("/api/v1/mail/list", (req, res) => {
    console.log(`[${req.realIP}] Received /api/v1/mail/list with parameters:`, req.query);
    // Optimized cache headers with longer stale-while-revalidate for better performance
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45, stale-if-error=120');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');
    (0, mailList_1.default)(req, res);
});
app.get("/api/v1/mail/getInfo", (req, res) => {
    console.log(`[${req.realIP}] Received /api/v1/mail/getInfo with parameters:`, req.query);
    // Email info metadata doesn't change often - can be cached longer
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120, stale-if-error=300');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');
    (0, mailGetInfo_1.default)(req, res);
});
app.get("/api/v1/mail/getHtml", (req, res) => {
    console.log(`[${req.realIP}] Received /api/v1/mail/getHtml with parameters:`, req.query);
    // HTML content is static once delivered - can be cached much longer
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800, stale-if-error=3600');
    res.set('Vary', 'Accept-Encoding');
    (0, mailGetHtml_1.default)(req, res);
});
// Improved static regex for better file type detection
const staticRegex = /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i;
const immutableRegex = /\.(css|js)$/i;
// Static folder hosting with optimized cache control
app.use(express_1.default.static(__dirname + "/public", {
    etag: true,
    lastModified: true,
    maxAge: 0, // We set cache-control manually for better control
    setHeaders: function (res, path, stat) {
        const ext = path.toLowerCase();
        // Set appropriate cache headers based on file type
        if (immutableRegex.test(ext)) {
            // CSS/JS files - longer cache with versioning expected
            res.set('Cache-Control', cacheControl_1.default.immutable);
        }
        else if (staticRegex.test(ext)) {
            // Images and fonts - moderate caching
            res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
        }
        else {
            // HTML and other files - short cache
            res.set('Cache-Control', cacheControl_1.default.static);
        }
        // Set appropriate content types for better compression
        if (ext.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        }
        else if (ext.endsWith('.woff2')) {
            res.set('Content-Type', 'font/woff2');
        }
        else if (ext.endsWith('.woff')) {
            res.set('Content-Type', 'font/woff');
        }
    }
}));
// Custom 404 handling - use index.html with appropriate headers
app.use(function (req, res) {
    res.set('Cache-Control', cacheControl_1.default.static);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(__dirname + '/public/index.html');
});
// Setup the server with optimized settings
const server = app.listen(8000, function () {
    const address = server.address();
    console.log("app running on port.", address && typeof address === 'object' ? address.port : address);
    console.log("Bandwidth optimization enabled: compression, caching, and performance headers");
    console.log("Security features: IP-based rate limiting, input validation, secure headers");
    // Optimized memory monitoring with reduced frequency and overhead
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        // Only log if memory exceeds threshold (reduced from 200MB to 150MB for earlier detection)
        if (heapUsedMB > 150) {
            const memMB = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: heapUsedMB,
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            };
            console.log(`[MEMORY WARNING] High memory usage: RSS=${memMB.rss}MB, Heap=${memMB.heapUsed}/${memMB.heapTotal}MB, External=${memMB.external}MB`);
        }
    }, 300000); // Every 5 minutes
    // Reduced frequency memory logging - only every 5 minutes instead of every minute
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        console.log(`[MEMORY] Heap usage: ${heapUsedMB}MB`);
    }, 300000); // Changed from 60000 to 300000
});
// Optimize server settings for high traffic
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;
//# sourceMappingURL=app.js.map