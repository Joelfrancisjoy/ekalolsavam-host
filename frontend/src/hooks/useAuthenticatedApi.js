import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for making authenticated API calls with better error handling
 * Prevents redirect loops by gracefully handling authentication errors
 */
export const useAuthenticatedApi = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Check authentication status
    useEffect(() => {
        const checkAuth = () => {
            const accessToken = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');

            // Consider authenticated if we have either token
            const authenticated = Boolean(accessToken || refreshToken);
            setIsAuthenticated(authenticated);
            setIsLoading(false);

            if (!authenticated) {
                setAuthError('No authentication tokens found');
            } else {
                setAuthError(null);
            }
        };

        checkAuth();

        // Listen for storage changes (logout in another tab)
        const handleStorageChange = (e) => {
            if (e.key === 'access_token' || e.key === 'refresh_token') {
                checkAuth();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Safe API call wrapper
    const safeApiCall = useCallback(async (apiFunction, fallbackValue = null) => {
        try {
            const result = await apiFunction();
            return { data: result, error: null };
        } catch (error) {
            console.warn('API call failed:', error.message);

            // Don't treat 401 errors as fatal - let the interceptor handle them
            if (error.response?.status === 401) {
                console.log('401 error caught, letting interceptor handle it');
                return { data: fallbackValue, error: 'Authentication required' };
            }

            // For other errors, return fallback data
            return { data: fallbackValue, error: error.message };
        }
    }, []);

    // Batch API calls with error resilience
    const safeBatchApiCalls = useCallback(async (apiCalls) => {
        const results = await Promise.allSettled(apiCalls.map(call =>
            safeApiCall(call.fn, call.fallback)
        ));

        return results.map((result, index) => ({
            name: apiCalls[index].name,
            data: result.status === 'fulfilled' ? result.value.data : apiCalls[index].fallback,
            error: result.status === 'fulfilled' ? result.value.error : result.reason?.message,
            success: result.status === 'fulfilled' && !result.value.error
        }));
    }, [safeApiCall]);

    return {
        isAuthenticated,
        isLoading,
        authError,
        safeApiCall,
        safeBatchApiCalls
    };
};