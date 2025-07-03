// Compatibility wrapper for mailGetKey - delegates to mailGetInfo
// This ensures the firebase.js setup doesn't break
module.exports = require("./mailGetInfo"); 