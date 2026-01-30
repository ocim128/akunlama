var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// mime-utils.js
var MAX_BODY_LENGTH = 5e4;
var splitHeadersAndBody = /* @__PURE__ */ __name((raw) => {
  const crlfIndex = raw.indexOf("\r\n\r\n");
  if (crlfIndex !== -1) {
    return [raw.slice(0, crlfIndex), raw.slice(crlfIndex + 4)];
  }
  const lfIndex = raw.indexOf("\n\n");
  if (lfIndex !== -1) {
    return [raw.slice(0, lfIndex), raw.slice(lfIndex + 2)];
  }
  return [raw, ""];
}, "splitHeadersAndBody");
var parseHeaders = /* @__PURE__ */ __name((headerText) => {
  const headers = {};
  if (!headerText) {
    return headers;
  }
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, " ");
  const lines = unfolded.split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!name) continue;
    if (headers[name]) {
      headers[name] = `${headers[name]}, ${value}`;
    } else {
      headers[name] = value;
    }
  }
  return headers;
}, "parseHeaders");
var parseContentType = /* @__PURE__ */ __name((value) => {
  if (!value) return { mime: "text/plain", params: {} };
  const parts = value.split(";");
  const mime = parts.shift().trim().toLowerCase();
  const params = {};
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    let val = part.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    params[key] = val;
  }
  return { mime, params };
}, "parseContentType");
var decodeBytes = /* @__PURE__ */ __name((bytes, charset) => {
  const cs = (charset || "utf-8").toLowerCase();
  try {
    return new TextDecoder(cs).decode(bytes);
  } catch (err) {
    return new TextDecoder("utf-8").decode(bytes);
  }
}, "decodeBytes");
var decodeBase64ToBytes = /* @__PURE__ */ __name((input) => {
  const clean = input.replace(/\s+/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}, "decodeBase64ToBytes");
var decodeQuotedPrintableToBytes = /* @__PURE__ */ __name((input) => {
  const cleaned = input.replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(i + 1, i + 3))) {
      bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(ch.charCodeAt(0));
    }
  }
  return new Uint8Array(bytes);
}, "decodeQuotedPrintableToBytes");
var decodeContent = /* @__PURE__ */ __name((body, encoding, charset) => {
  const enc = (encoding || "").trim().toLowerCase();
  if (enc === "base64") {
    return decodeBytes(decodeBase64ToBytes(body), charset);
  }
  if (enc === "quoted-printable" || enc === "quotedprintable") {
    return decodeBytes(decodeQuotedPrintableToBytes(body), charset);
  }
  return body;
}, "decodeContent");
var decodeMimeWords = /* @__PURE__ */ __name((value) => {
  if (!value || typeof value !== "string") return value;
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (match, charset, encoding, text) => {
    const enc = encoding.toUpperCase();
    if (enc === "B") {
      return decodeBytes(decodeBase64ToBytes(text), charset);
    }
    if (enc === "Q") {
      const qp = text.replace(/_/g, " ");
      return decodeBytes(decodeQuotedPrintableToBytes(qp), charset);
    }
    return match;
  });
}, "decodeMimeWords");
var parseMultipartBody = /* @__PURE__ */ __name((body, boundary) => {
  if (!boundary) return { html: "", text: "" };
  const boundaryText = `--${boundary}`;
  const parts = body.split(boundaryText);
  const htmlParts = [];
  const textParts = [];
  for (let i = 1; i < parts.length; i++) {
    let part = parts[i];
    if (!part) continue;
    if (part.startsWith("--")) break;
    part = part.replace(/^\r?\n/, "");
    const [headerText, partBody] = splitHeadersAndBody(part);
    if (!partBody) continue;
    const headers = parseHeaders(headerText);
    const contentType = parseContentType(headers["content-type"]);
    const encoding = headers["content-transfer-encoding"];
    if (contentType.mime.startsWith("multipart/")) {
      const nestedBoundary = contentType.params.boundary;
      if (nestedBoundary) {
        const nested = parseMultipartBody(partBody, nestedBoundary);
        if (nested.html) htmlParts.push(nested.html);
        if (nested.text) textParts.push(nested.text);
      }
      continue;
    }
    if (contentType.mime === "text/html") {
      htmlParts.push(decodeContent(partBody, encoding, contentType.params.charset));
    } else if (contentType.mime === "text/plain" || !contentType.mime) {
      textParts.push(decodeContent(partBody, encoding, contentType.params.charset));
    }
  }
  return {
    html: htmlParts.join("\n").trim(),
    text: textParts.join("\n").trim()
  };
}, "parseMultipartBody");
var truncate = /* @__PURE__ */ __name((value) => {
  if (!value) return "";
  return value.length > MAX_BODY_LENGTH ? value.slice(0, MAX_BODY_LENGTH) : value;
}, "truncate");

// unified-worker.js
var EMAIL_RETENTION_MS = 7 * 24 * 60 * 60 * 1e3;
var RATE_LIMITS = {
  TOTAL_REQUESTS_PER_MINUTE: 75,
  UNIQUE_USERNAMES_PER_MINUTE: 10,
  SAME_USERNAME_PER_MINUTE: 50,
  WINDOW_MS: 6e4,
  // 1 minute
  MAX_IPS_TRACKED: 500,
  CLEANUP_INTERVAL: 6e4
  // Cleanup every 60 seconds
};
var DEFAULT_BLOCKED_SENDER_PATTERNS = [
  "registration@facebook",
  "registrations@mail.instagram.com",
  "registration@facebookmail.com",
  "groupupdates@facebookmail.com",
  "reminders@facebookmail.com",
  "friendsuggestion@facebookmail.com",
  "pageupdates@facebookmail.com"
];
var DEFAULT_BLOCKED_SUBJECT_PATTERNS = [
  /\d{6}.*adalah kode instagram anda/i,
  /\d{6}.*is your threads code/i,
  /\d{6}.*is your instagram code/i,
  /\d{4,6}.*is your confirmation code/i,
  /fb-\d{4,6}.*is your confirmation code/i
];
var rateLimits = /* @__PURE__ */ new Map();
var lastCleanup = Date.now();
var cleanupRateLimits = /* @__PURE__ */ __name(() => {
  const now = Date.now();
  const ipsToDelete = [];
  rateLimits.forEach((data, ip) => {
    if (now > data.resetTime) {
      ipsToDelete.push(ip);
    }
  });
  ipsToDelete.forEach((ip) => rateLimits.delete(ip));
  if (rateLimits.size > RATE_LIMITS.MAX_IPS_TRACKED) {
    const sortedIPs = Array.from(rateLimits.entries()).sort((a, b) => a[1].resetTime - b[1].resetTime).slice(0, Math.floor(RATE_LIMITS.MAX_IPS_TRACKED * 0.7));
    sortedIPs.forEach(([ip]) => rateLimits.delete(ip));
    console.log(`[MEMORY] Cleaned up ${sortedIPs.length} old IP entries, now tracking ${rateLimits.size} IPs`);
  }
  lastCleanup = now;
}, "cleanupRateLimits");
var checkRateLimit = /* @__PURE__ */ __name((username, clientIP) => {
  const now = Date.now();
  if (!clientIP || clientIP === "unknown") {
    return { allowed: false, error: "Rate limit exceeded: Unable to identify client." };
  }
  if (now - lastCleanup > RATE_LIMITS.CLEANUP_INTERVAL) {
    cleanupRateLimits();
  }
  if (!rateLimits.has(clientIP)) {
    rateLimits.set(clientIP, {
      requestTimestamps: [],
      uniqueUsernames: /* @__PURE__ */ new Set(),
      resetTime: now + RATE_LIMITS.WINDOW_MS
    });
  }
  const ipData = rateLimits.get(clientIP);
  if (now > ipData.resetTime) {
    ipData.requestTimestamps = [];
    ipData.uniqueUsernames.clear();
    ipData.resetTime = now + RATE_LIMITS.WINDOW_MS;
  }
  const windowStart = now - RATE_LIMITS.WINDOW_MS;
  ipData.requestTimestamps = ipData.requestTimestamps.filter((timestamp) => timestamp > windowStart);
  if (ipData.requestTimestamps.length >= RATE_LIMITS.TOTAL_REQUESTS_PER_MINUTE) {
    return { allowed: false, error: "Rate limit exceeded: Too many requests. Please try again later." };
  }
  if (!ipData.uniqueUsernames.has(username)) {
    if (ipData.uniqueUsernames.size >= RATE_LIMITS.UNIQUE_USERNAMES_PER_MINUTE) {
      return { allowed: false, error: "Rate limit exceeded: Too many different emails tried. Please try again later." };
    }
    ipData.uniqueUsernames.add(username);
  }
  const recentUsernameRequests = ipData.requestTimestamps.filter((_, index) => {
    return index >= ipData.requestTimestamps.length - RATE_LIMITS.SAME_USERNAME_PER_MINUTE;
  });
  if (recentUsernameRequests.length >= RATE_LIMITS.SAME_USERNAME_PER_MINUTE) {
    return { allowed: false, error: "Rate limit exceeded: Too many requests for this email. Please try again later." };
  }
  ipData.requestTimestamps.push(now);
  return { allowed: true, error: null };
}, "checkRateLimit");
var getBannedUsernames = /* @__PURE__ */ __name((env) => {
  const bannedUsernamesEnv = env.BANNED_USERNAMES || "";
  if (bannedUsernamesEnv) {
    return new Set(bannedUsernamesEnv.split(",").map((name) => name.trim().toLowerCase()));
  }
  return /* @__PURE__ */ new Set();
}, "getBannedUsernames");
var validateUsername = /* @__PURE__ */ __name((username, env) => {
  if (!username || !username.trim()) {
    return { valid: false, error: "Username is required." };
  }
  const bannedUsernames = getBannedUsernames(env);
  if (bannedUsernames.has(username.toLowerCase())) {
    return { valid: false, error: `Invalid username: '${username}' is not allowed.` };
  }
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  if (!regex.test(username)) {
    return { valid: false, error: `Invalid username: '${username}' contains invalid characters.` };
  }
  return { valid: true, error: null };
}, "validateUsername");
var loadKeywordsFromEnv = /* @__PURE__ */ __name((env, key) => {
  const value = env[key] || "";
  if (!value.trim()) return [];
  return value.split(",").map((keyword) => keyword.trim().toLowerCase()).filter((keyword) => keyword.length > 0);
}, "loadKeywordsFromEnv");
var shouldBlockEmail = /* @__PURE__ */ __name((sender, subject, body, env) => {
  const senderLower = (sender || "").toLowerCase();
  const subjectLower = (subject || "").toLowerCase();
  const bodyLower = (body || "").toLowerCase();
  for (const pattern of DEFAULT_BLOCKED_SENDER_PATTERNS) {
    if (senderLower.includes(pattern.toLowerCase())) {
      return { blocked: true, reason: `sender matches default pattern: ${pattern}` };
    }
  }
  for (const pattern of DEFAULT_BLOCKED_SUBJECT_PATTERNS) {
    if (pattern.test(subject || "")) {
      return { blocked: true, reason: `subject matches default pattern` };
    }
  }
  const blockedSenderKeywords = loadKeywordsFromEnv(env, "BLOCKED_SENDER_KEYWORDS");
  for (const keyword of blockedSenderKeywords) {
    if (senderLower.includes(keyword)) {
      return { blocked: true, reason: `sender contains blocked keyword: ${keyword}` };
    }
  }
  const blockedSubjectKeywords = loadKeywordsFromEnv(env, "BLOCKED_SUBJECT_KEYWORDS");
  for (const keyword of blockedSubjectKeywords) {
    if (subjectLower.includes(keyword)) {
      return { blocked: true, reason: `subject contains blocked keyword: ${keyword}` };
    }
  }
  const blockedBodyKeywords = loadKeywordsFromEnv(env, "BLOCKED_BODY_KEYWORDS");
  for (const keyword of blockedBodyKeywords) {
    if (bodyLower.includes(keyword)) {
      return { blocked: true, reason: `body contains blocked keyword: ${keyword}` };
    }
  }
  return { blocked: false, reason: null };
}, "shouldBlockEmail");
var extractBodiesFromRaw = /* @__PURE__ */ __name((rawEmail) => {
  const [headerText, bodyText] = splitHeadersAndBody(rawEmail);
  const headers = parseHeaders(headerText);
  const contentType = parseContentType(headers["content-type"]);
  const encoding = headers["content-transfer-encoding"];
  if (contentType.mime.startsWith("multipart/") && contentType.params.boundary) {
    return parseMultipartBody(bodyText, contentType.params.boundary);
  }
  const decoded = decodeContent(bodyText, encoding, contentType.params.charset);
  if (contentType.mime === "text/html") {
    return { html: decoded, text: "" };
  }
  return { html: "", text: decoded };
}, "extractBodiesFromRaw");
var normalizeAddress = /* @__PURE__ */ __name((value) => {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map(normalizeAddress).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return value.address || value.email || value.toString();
  }
  return String(value);
}, "normalizeAddress");
var detectBoundary = /* @__PURE__ */ __name((body) => {
  if (!body) return "";
  const direct = body.match(/^\s*--([^\r\n]+)/);
  if (direct) return direct[1].trim();
  const indirect = body.match(/\r?\n--([^\r\n]+)/);
  return indirect ? indirect[1].trim() : "";
}, "detectBoundary");
var extractBodiesFromStoredText = /* @__PURE__ */ __name((bodyText) => {
  if (!bodyText) return { html: "", text: "" };
  const boundary = detectBoundary(bodyText);
  if (!boundary) {
    return { html: "", text: bodyText.trim() };
  }
  return parseMultipartBody(bodyText, boundary);
}, "extractBodiesFromStoredText");
var getClientIP = /* @__PURE__ */ __name((request) => {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Real-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
}, "getClientIP");
var createHeaders = /* @__PURE__ */ __name((additionalHeaders = {}) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Security headers (HTML sanitization)
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  ...additionalHeaders
}), "createHeaders");
var jsonResponse = /* @__PURE__ */ __name((data, status = 200, additionalHeaders = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: createHeaders(additionalHeaders)
  });
}, "jsonResponse");
var unified_worker_default = {
  /**
   * Email handler - processes inbound emails from Cloudflare Email Routing
   */
  async email(message, env, ctx) {
    try {
      const rawEmail = await new Response(message.raw).text();
      const [headerText] = splitHeadersAndBody(rawEmail);
      const headers = parseHeaders(headerText);
      const subjectRaw = headers["subject"] || message.headers?.get?.("subject") || "(No Subject)";
      const subject = decodeMimeWords(subjectRaw) || "(No Subject)";
      const sender = headers["from"] || normalizeAddress(message.from);
      const recipient = headers["to"] || normalizeAddress(message.to);
      const { html, text } = extractBodiesFromRaw(rawEmail);
      const filterResult = shouldBlockEmail(sender, subject, text || html, env);
      if (filterResult.blocked) {
        console.log(`[FILTER] Email blocked for ${recipient}: ${filterResult.reason}`);
        return;
      }
      const emailId = crypto.randomUUID();
      await env.DB.prepare(`
                INSERT INTO emails (id, recipient, sender, subject, body_html, body_text, received_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
        emailId,
        recipient,
        sender,
        subject,
        truncate(html),
        truncate(text),
        Date.now()
      ).run();
      console.log(`Email stored: ${emailId} for ${recipient}`);
    } catch (error) {
      console.error("Error processing email:", error);
    }
  },
  /**
   * HTTP fetch handler - API endpoints for frontend
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: createHeaders() });
    }
    try {
      if (path === "/api/events") {
        const recipient = url.searchParams.get("recipient");
        if (!recipient) {
          return jsonResponse({ error: "Missing recipient parameter" }, 400);
        }
        const trimmedRecipient = recipient.trim();
        if (!trimmedRecipient) {
          return jsonResponse({ error: "Missing recipient parameter" }, 400);
        }
        const isAdminRequest = trimmedRecipient === "*" || trimmedRecipient === "all";
        let lookupRecipient = trimmedRecipient;
        if (!isAdminRequest) {
          const username = lookupRecipient.includes("@") ? lookupRecipient.split("@")[0] : lookupRecipient;
          const validation = validateUsername(username, env);
          if (!validation.valid) {
            return jsonResponse({ error: validation.error }, 400);
          }
          const clientIP = getClientIP(request);
          const rateCheck = checkRateLimit(username, clientIP);
          if (!rateCheck.allowed) {
            console.log(`[RATE LIMIT] ${clientIP} exceeded limit for ${username}`);
            return jsonResponse({ error: rateCheck.error }, 429);
          }
          if (!lookupRecipient.includes("@")) {
            if (env.EMAIL_DOMAIN) {
              lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
            } else {
              return jsonResponse({ error: "EMAIL_DOMAIN is not configured" }, 400);
            }
          }
        }
        let result;
        if (isAdminRequest) {
          const adminKey = url.searchParams.get("admin_key");
          const validAdminKey = env.ADMIN_ACCESS_KEY;
          if (!validAdminKey || !adminKey || adminKey !== validAdminKey) {
            console.log("[SECURITY] Unauthorized admin access attempt");
            return jsonResponse({ error: "Unauthorized" }, 403);
          }
          console.log("[ADMIN] Authorized - Fetching all emails");
          result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at 
                        FROM emails 
                        ORDER BY received_at DESC 
                        LIMIT 100
                    `).all();
        } else {
          result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at 
                        FROM emails 
                        WHERE recipient = ? 
                        ORDER BY received_at DESC 
                        LIMIT 50
                    `).bind(lookupRecipient).all();
        }
        const items = result.results.map((row) => ({
          id: row.id,
          timestamp: row.received_at / 1e3,
          event: "stored",
          message: {
            headers: {
              from: row.sender,
              to: row.recipient,
              subject: decodeMimeWords(row.subject || "")
            }
          },
          storage: {
            key: row.id,
            url: `/api/email/${row.id}`
          }
        }));
        return jsonResponse({ items });
      }
      if (path.startsWith("/api/email/")) {
        const emailId = path.replace("/api/email/", "");
        const recipient = url.searchParams.get("recipient");
        if (!recipient) {
          return jsonResponse({ error: "Missing recipient parameter" }, 400);
        }
        let lookupRecipient = recipient.trim();
        const username = lookupRecipient.includes("@") ? lookupRecipient.split("@")[0] : lookupRecipient;
        const validation = validateUsername(username, env);
        if (!validation.valid) {
          return jsonResponse({ error: validation.error }, 400);
        }
        if (!lookupRecipient.includes("@")) {
          if (env.EMAIL_DOMAIN) {
            lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
          } else {
            return jsonResponse({ error: "EMAIL_DOMAIN is not configured" }, 400);
          }
        }
        const result = await env.DB.prepare(`
                    SELECT * FROM emails WHERE id = ? AND recipient = ?
                `).bind(emailId, lookupRecipient).first();
        if (!result) {
          return jsonResponse({ error: "Email not found" }, 404);
        }
        let bodyHtml = result.body_html || "";
        let bodyText = result.body_text || "";
        if (!bodyHtml && bodyText) {
          const extracted = extractBodiesFromStoredText(bodyText);
          if (extracted.html) {
            bodyHtml = extracted.html;
          }
          if (extracted.text) {
            bodyText = extracted.text;
          }
        }
        return jsonResponse({
          from: result.sender,
          to: result.recipient,
          subject: decodeMimeWords(result.subject || ""),
          "body-html": truncate(bodyHtml),
          "body-plain": truncate(bodyText),
          timestamp: result.received_at
        });
      }
      if (path === "/api/health") {
        return jsonResponse({ status: "ok" });
      }
      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("API Error:", error);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },
  /**
   * Scheduled cron handler - runs daily to clean up old emails
   * Configure in wrangler.toml:
   * [triggers]
   * crons = ["0 0 * * *"]  # Runs at midnight UTC daily
   */
  async scheduled(event, env, ctx) {
    const cutoffTime = Date.now() - EMAIL_RETENTION_MS;
    try {
      const countResult = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM emails WHERE received_at < ?
            `).bind(cutoffTime).first();
      const count = countResult?.count || 0;
      if (count > 0) {
        await env.DB.prepare(`
                    DELETE FROM emails WHERE received_at < ?
                `).bind(cutoffTime).run();
        console.log(`[CLEANUP] Deleted ${count} emails older than 7 days`);
      } else {
        console.log("[CLEANUP] No old emails to delete");
      }
    } catch (error) {
      console.error("[CLEANUP] Error during email cleanup:", error);
    }
  }
};
export {
  unified_worker_default as default
};
//# sourceMappingURL=unified-worker.js.map
