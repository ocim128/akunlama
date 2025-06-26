/**
 * Configure the various level of cache controls
 */
module.exports = {
    // Frequent changing dynamic content (email lists)
    // Short cache but allow stale serving for performance
    "dynamic"  : "public, max-age=5, stale-while-revalidate=30, stale-if-error=300",
    
    // Static UI content (HTML, small assets)
    // Moderate caching with background refresh
    "static"   : "public, max-age=300, stale-while-revalidate=1800, stale-if-error=3600",

    // Immutable content (CSS/JS with versioning)
    // Very aggressive caching for bandwidth savings
    "immutable": "public, max-age=31536000, immutable, stale-if-error=604800"
}