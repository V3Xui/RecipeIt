/**
 * Sanitizes raw string text nodes to protect against Cross-Site Scripting (XSS) code injection loops.
 * Converts structural HTML character tags into safe contextual character tokens.
 * @param {string} rawString 
 * @returns {string} Sanitized text payload
 */
export const sanitizeHTML = (rawString) => {
    if (!rawString || typeof rawString !== 'string') return '';
    return rawString
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
};

/**
 * Client-Side Throttling mechanism to rate-limit intensive write queries against database lines.
 * Tracks operational processing stamps to block automated click loops.
 */
let lastWriteTimestamp = 0;
export const enforceRateLimit = (cooldownSeconds = 3) => {
    const now = Date.now();
    if (now - lastWriteTimestamp < cooldownSeconds * 1000) {
        window.showToast("Slow down! Processing baseline limits prevent spamming operations.", "error");
        return false;
    }
    lastWriteTimestamp = now;
    return true;
};