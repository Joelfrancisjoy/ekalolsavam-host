/**
 * Ultra-simple authentication manager to prevent redirect loops
 * No complex logic, just basic token management
 */

// Global flag to prevent multiple redirects
let isRedirecting = false;

const simpleAuth = {
    // Check if user has tokens
    isAuthenticated() {
        const access = localStorage.getItem('access_token');
        const refresh = localStorage.getItem('refresh_token');
        return Boolean(access || refresh);
    },

    // Store tokens after login
    storeTokens(accessToken, refreshToken) {
        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
        }
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
        // Reset redirect flag when tokens are stored
        isRedirecting = false;
        console.log('Tokens stored successfully');
    },

    // Clear tokens
    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('last_login_payload');
    },

    // Safe redirect to login (prevents loops)
    redirectToLogin(reason = 'auth required') {
        // Prevent multiple redirects
        if (isRedirecting) {
            console.log('Already redirecting, skipping');
            return;
        }

        // Don't redirect if already on login page
        if (window.location.pathname === '/login') {
            console.log('Already on login page');
            return;
        }

        console.log(`Redirecting to login: ${reason}`);
        isRedirecting = true;

        // Clear tokens
        this.clearTokens();

        // Redirect after a delay
        setTimeout(() => {
            window.location.href = '/login';
        }, 100);
    },

    // Get current tokens
    getTokens() {
        return {
            access: localStorage.getItem('access_token'),
            refresh: localStorage.getItem('refresh_token')
        };
    }
};

export default simpleAuth;