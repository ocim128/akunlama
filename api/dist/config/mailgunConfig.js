"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
const config = {
    apiKey: process.env.MAILGUN_API_KEY || '',
    emailDomain: process.env.MAILGUN_EMAIL_DOMAIN || '',
    adminAccessKey: process.env.ADMIN_ACCESS_KEY || '',
    corsOrigin: process.env.CORS_ORIGIN || '*'
};
// Validate required environment variables
if (!config.apiKey) {
    throw new Error('MAILGUN_API_KEY environment variable is required');
}
if (!config.emailDomain) {
    throw new Error('MAILGUN_EMAIL_DOMAIN environment variable is required');
}
if (!config.adminAccessKey) {
    throw new Error('ADMIN_ACCESS_KEY environment variable is required');
}
exports.default = config;
//# sourceMappingURL=mailgunConfig.js.map