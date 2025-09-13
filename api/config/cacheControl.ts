/**
 * Configure the various level of cache controls
 */
export interface CacheControl {
    // Frequent changing dynamic content (email lists)
    // Short cache but allow stale serving for performance
    dynamic: string;
    
    // Static UI content (HTML, small assets)
    // Moderate caching with background refresh
    static: string;

    // Immutable content (CSS/JS with versioning)
    // Very aggressive caching for bandwidth savings
    immutable: string;
}

const cacheControl: CacheControl = {
    dynamic: "public, max-age=2, stale-while-revalidate=15, stale-if-error=150",
    static: "public, max-age=300, stale-while-revalidate=1800, stale-if-error=3600",
    immutable: "public, max-age=31536000, immutable, stale-if-error=604800"
};

export default cacheControl;