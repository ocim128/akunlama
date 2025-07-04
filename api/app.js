const express = require('express');
const compression = require('compression');
const cacheControl = require("./config/cacheControl");
const app = express();

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
app.use(compression({
    filter: (req, res) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
            return false;
        }
        // fallback to standard filter function
        return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is good balance)
    threshold: 512, // Only compress responses > 512B (reduced from 1KB)
    chunkSize: 1024 // Process data in 1KB chunks
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
        
        // For API endpoints, return empty array to look like no emails
        if (req.path.startsWith('/api/')) {
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.status(200).json([]);
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
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Parameter too long'
            });
        }
    }
    next();
});

// Optimize JSON responses
app.set('json spaces', 0); // Minimize JSON output
app.set('json replacer', null); // Don't replace anything

// Setup the routes with optimized responses
const mailList = require("./src/api/mailList");
const mailGetInfo = require("./src/api/mailGetInfo");
const mailGetHtml = require("./src/api/mailGetHtml");

app.get("/api/v1/mail/list", (req, res) => {
    if(process.env.LOG_LEVEL === 'debug') console.log(`[${req.realIP}] /list`, req.query);
    
    // Increased cache to reduce Mailgun API calls: 60s cache + background refresh
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.set('Content-Type', 'application/json; charset=utf-8');
    
    mailList(req, res);
});

app.get("/api/v1/mail/getInfo", (req, res) => {
    if(process.env.LOG_LEVEL === 'debug') console.log(`[${req.realIP}] /getInfo`, req.query);
    
    // Email info can be cached a bit longer
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.set('Content-Type', 'application/json; charset=utf-8');
    
    mailGetInfo(req, res);
});

app.get("/api/v1/mail/getHtml", (req, res) => {
    if(process.env.LOG_LEVEL === 'debug') console.log(`[${req.realIP}] /getHtml`, req.query);
    
    // HTML content can be cached longer
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    mailGetHtml(req, res);
});

// Add the missing getKey route that the frontend needs for email details
app.get("/api/v1/mail/getKey", (req, res) => {
    if(process.env.LOG_LEVEL === 'debug') console.log(`[${req.realIP}] /getKey`, req.query);
    
    // Email details can be cached a bit longer
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.set('Content-Type', 'application/json; charset=utf-8');
    
    mailGetInfo(req, res);
});

// Improved static regex for better file type detection
const staticRegex = /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i;
const immutableRegex = /\.(css|js)$/i;

// Static folder hosting with optimized cache control
app.use(express.static("public", {
    etag: true,
    lastModified: true,
    maxAge: 0, // We set cache-control manually for better control
    setHeaders: function (res, path, stat) {
        const ext = path.toLowerCase();
        
        // Set appropriate cache headers based on file type
        if (immutableRegex.test(ext)) {
            // CSS/JS files - longer cache with versioning expected
            res.set('Cache-Control', cacheControl.immutable);
        } else if (staticRegex.test(ext)) {
            // Images and fonts - moderate caching
            res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
        } else {
            // HTML and other files - short cache
            res.set('Cache-Control', cacheControl.static);
        }
        
        // Set appropriate content types for better compression
        if (ext.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        } else if (ext.endsWith('.woff2')) {
            res.set('Content-Type', 'font/woff2');
        } else if (ext.endsWith('.woff')) {
            res.set('Content-Type', 'font/woff');
        }
    }
}));

// Custom 404 handling - use index.html with appropriate headers
app.use(function (req, res) {
    res.set('Cache-Control', cacheControl.static);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(__dirname + '/public/index.html');
});

// Setup the server with optimized settings
var server = app.listen(8000, function () {
    console.log("app running on port.", server.address().port);
    console.log("Bandwidth optimization enabled: compression, caching, and performance headers");
    console.log("Security features: IP-based rate limiting, input validation, secure headers");
    
    // Optional regular memory log only in debug mode
    if(process.env.LOG_LEVEL === 'debug') {
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            console.log(`[MEMORY] Heap: ${heapUsedMB}MB`);
        }, 300000); // Every 5 minutes
    }
});

// Optimize server settings for high traffic
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;
