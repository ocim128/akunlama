/**
 * Shared modules index
 * Central export point for all shared utilities
 */

module.exports = {
    // Caching
    ...require('./emailCache'),

    // Rate limiting
    ...require('./rateLimit'),

    // Email filtering and validation
    ...require('./emailFilter'),

    // Error pages
    ...require('./errorPages'),

    // HTTP client
    ...require('./axiosClient'),

    // Email utilities
    ...require('./emailUtils')
};
