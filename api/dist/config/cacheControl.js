"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cacheControl = {
    dynamic: "public, max-age=2, stale-while-revalidate=15, stale-if-error=150",
    static: "public, max-age=300, stale-while-revalidate=1800, stale-if-error=3600",
    immutable: "public, max-age=31536000, immutable, stale-if-error=604800"
};
exports.default = cacheControl;
//# sourceMappingURL=cacheControl.js.map