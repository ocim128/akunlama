/**
 * Shared axios client with connection pooling
 * Used by both Mailgun and Cloudflare readers
 */

const axios = require('axios');
const http = require('http');
const https = require('https');

// Create a reusable axios instance with connection pooling
const axiosClient = axios.create({
    timeout: 10000, // 10 second timeout
    maxRedirects: 5,
    httpAgent: new http.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 50,
        maxFreeSockets: 10
    }),
    httpsAgent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 50,
        maxFreeSockets: 10
    })
});

/**
 * Perform a GET request with connection pooling
 * @param {string} url 
 * @param {Object} options 
 * @returns {Promise<any>} Response data
 */
const get = async (url, options = {}) => {
    const response = await axiosClient.get(url, options);
    return response.data;
};

module.exports = {
    axiosClient,
    get
};
