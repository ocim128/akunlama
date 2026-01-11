/**
 * This is configured for use within Firebase Cloud Functions (or GCP Cloud Functions)
 * See: https://firebase.google.com/docs/functions/http-events
 */

const functions = require('firebase-functions');
const app = require('./app');

// Expose the HTTP on request
exports.firebase_api_v1 = functions.https.onRequest(app);
