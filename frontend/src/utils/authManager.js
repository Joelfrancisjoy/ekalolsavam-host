/**
 * Simple and robust authentication manager
 * Prevents redirect loops by managing authentication state properly
 */

class AuthManager {
    constructor() {
        this.isRedirecting = false;
        this.redirectTimeout = null;
    }

    // Check if user has valid tokens
    isAuthenticated() {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        // If we have no tokens at all, definitely not authenticated
        if (!accessToken && !refreshToken) {
            return false;
        }

        // If we have an access token, check if it's expired
        if (accessToken) {
            try {
                // Decode JWT to check expiration
                const tokenParts = accessToken.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const currentTime = Date.now() / 1000;

                    // If access token is not expired, user is authenticated
                    if (payload.exp > currentTime) {
                        return true;
                    }
                }
            } catch (e) {
                console.warn('Error decoding access token:', e);
                // If we can't decode it, fall back to checking if we have tokens
            }
        }

        // If access token is expired but we have a refresh token, user might still be authenticated
        // but needs to refresh. Return true to allow the refresh process to happen.
        return !!refreshToken;
    }

    // Get current tokens
    getTokens() {
        const access = localStorage.getItem('access_token');
        const refresh = localStorage.getItem('refresh_token');

        return {
            access,
            refresh,
            accessExpired: this.isTokenExpired(access),
            refreshExpired: this.isTokenExpired(refresh)
        };
    }

    // Check if a token is expired
    isTokenExpired(token) {
        if (!token) return true;

        try {
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) return true;

            const payload = JSON.parse(atob(tokenParts[1]));
            const currentTime = Date.now() / 1000;

            return payload.exp <= currentTime;
        } catch (e) {
            console.warn('Error checking token expiration:', e);
            return true;
        }
    }

    // Set tokens after successful login
    setTokens(accessToken, refreshToken) {
        console.log('[AuthManager] Setting tokens - access:', !!accessToken, 'refresh:', !!refreshToken);

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            console.log('[AuthManager] Stored access token');
        }
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
            console.log('[AuthManager] Stored refresh token');
        }

        // Verify storage worked
        const storedAccess = localStorage.getItem('access_token');
        const storedRefresh = localStorage.getItem('refresh_token');
        console.log('[AuthManager] Verified storage - access:', !!storedAccess, 'refresh:', !!storedRefresh);

        // Clear any pending redirects
        this.cancelRedirect();
    }

    // Clear tokens on logout
    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    // Safe redirect to login (prevents loops)
    redirectToLogin(reason = 'authentication required') {
        // Prevent multiple simultaneous redirects
        if (this.isRedirecting) {
            console.log('Redirect already in progress, skipping');
            return;
        }

        // Don't redirect if already on login page
        if (window.location.pathname === '/login') {
            console.log('Already on login page, skipping redirect');
            return;
        }

        console.log(`Redirecting to login: ${reason}`);
        this.isRedirecting = true;

        // Clear tokens
        this.clearTokens();

        // Use a delay to prevent immediate loops
        this.redirectTimeout = setTimeout(() => {
            window.location.href = '/login';
        }, 500);
    }

    // Cancel pending redirect
    cancelRedirect() {
        if (this.redirectTimeout) {
            clearTimeout(this.redirectTimeout);
            this.redirectTimeout = null;
        }
        this.isRedirecting = false;
    }

    // Handle successful login
    handleLoginSuccess(response) {
        console.log('[AuthManager] Processing login response:', response);

        // Handle different response structures
        const access = response?.access || response?.token || response?.accessToken || response?.tokens?.access;
        const refresh = response?.refresh || response?.refreshToken || response?.tokens?.refresh;
        const user = response?.user || response?.userData || response?.profile;

        console.log('[AuthManager] Extracted tokens - access:', !!access, 'refresh:', !!refresh, 'user:', !!user);

        // Store tokens
        this.setTokens(access, refresh);

        // Store user data
        if (user) {
            try {
                localStorage.setItem('last_login_payload', JSON.stringify(response));
            } catch (e) {
                console.warn('Failed to store login payload:', e);
            }
        }

        // Cancel any pending redirects
        this.cancelRedirect();

        return { access, refresh, user };
    }

    // Get stored user data
    getStoredUser() {
        try {
            const payload = localStorage.getItem('last_login_payload');
            return payload ? JSON.parse(payload).user : null;
        } catch (e) {
            console.warn('Failed to parse stored user data:', e);
            return null;
        }
    }
}

// Create singleton instance
const authManager = new AuthManager();

export default authManager;