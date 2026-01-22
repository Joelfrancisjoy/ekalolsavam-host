/**
 * Authentication debugging utility
 * Helps identify what's causing redirect loops
 */

class AuthDebugger {
    constructor() {
        this.logs = [];
        this.maxLogs = 50;
        this.enabled = process.env.NODE_ENV === 'development';
    }

    log(event, data = {}) {
        if (!this.enabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            url: window.location.pathname,
            tokens: {
                hasAccess: !!localStorage.getItem('access_token'),
                hasRefresh: !!localStorage.getItem('refresh_token')
            }
        };

        this.logs.push(logEntry);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        console.log(`[AuthDebug] ${event}:`, data);
    }

    logRedirect(from, to, reason) {
        this.log('REDIRECT', { from, to, reason });

        // If we're seeing multiple redirects quickly, warn about potential loop
        const recentRedirects = this.logs
            .filter(log => log.event === 'REDIRECT')
            .filter(log => Date.now() - new Date(log.timestamp).getTime() < 5000); // Last 5 seconds

        if (recentRedirects.length > 2) {
            console.warn('[AuthDebug] Potential redirect loop detected!', recentRedirects);
            this.dumpLogs();
        }
    }

    logApiCall(url, status, error = null) {
        this.log('API_CALL', { url, status, error: error?.message });
    }

    logTokenRefresh(success, error = null) {
        this.log('TOKEN_REFRESH', { success, error: error?.message });
    }

    logAuthCheck(result, reason = '') {
        this.log('AUTH_CHECK', { result, reason });
    }

    dumpLogs() {
        console.group('[AuthDebug] Recent Authentication Events');
        this.logs.forEach(log => {
            console.log(`${log.timestamp} [${log.event}] ${log.url}:`, log.data);
        });
        console.groupEnd();
    }

    clearLogs() {
        this.logs = [];
        console.log('[AuthDebug] Logs cleared');
    }

    // Monitor localStorage changes
    monitorStorage() {
        if (!this.enabled) return;

        const originalSetItem = localStorage.setItem;
        const originalRemoveItem = localStorage.removeItem;

        localStorage.setItem = function (key, value) {
            if (key === 'access_token' || key === 'refresh_token') {
                authDebugger.log('STORAGE_SET', { key, hasValue: !!value });
            }
            return originalSetItem.apply(this, arguments);
        };

        localStorage.removeItem = function (key) {
            if (key === 'access_token' || key === 'refresh_token') {
                authDebugger.log('STORAGE_REMOVE', { key });
            }
            return originalRemoveItem.apply(this, arguments);
        };
    }

    // Monitor navigation
    monitorNavigation() {
        if (!this.enabled) return;

        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function (state, title, url) {
            authDebugger.log('NAVIGATION_PUSH', { url });
            return originalPushState.apply(this, arguments);
        };

        window.history.replaceState = function (state, title, url) {
            authDebugger.log('NAVIGATION_REPLACE', { url });
            return originalReplaceState.apply(this, arguments);
        };

        window.addEventListener('popstate', (event) => {
            authDebugger.log('NAVIGATION_POP', { url: window.location.pathname });
        });
    }

    init() {
        if (!this.enabled) return;

        this.monitorStorage();
        this.monitorNavigation();

        console.log('[AuthDebug] Authentication debugger initialized');
        console.log('[AuthDebug] Use authDebugger.dumpLogs() to see recent events');

        // Make available globally for debugging
        window.authDebugger = this;
    }
}

const authDebugger = new AuthDebugger();
authDebugger.init();

export default authDebugger;