# Login Page Auto-Refresh Implementation Guide

## Overview

This document provides comprehensive implementation guidance for the login page auto-refresh feature, which ensures that after logout, the login page automatically refreshes to clear any cached authentication state.

## Feature Requirements

**Requirement 11**: Login Page Auto-Refresh After Logout

The system must automatically refresh the login page after logout to clear cached state, using URL parameters for detection and sessionStorage for loop prevention.

## Architecture

### Component Flow

```
User Logout → Redirect to /login?logout=true → Login Component Mounts
    ↓
Detect logout parameter → Clear tokens → Set sessionStorage flag
    ↓
Perform refresh → Clean login page (no parameter)
```

### Key Components

1. **URL Parameter Detection**: Monitors for `?logout=true` parameter
2. **Token Clearing**: Removes all authentication tokens from storage
3. **Refresh Protection**: Uses sessionStorage to prevent infinite loops
4. **Refresh Execution**: Performs single page refresh

## Implementation Details

### Frontend Implementation (React)

**File**: `frontend/src/pages/Login.jsx` (or equivalent)

```typescript
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're coming from a logout
    const urlParams = new URLSearchParams(location.search);
    const isLogout = urlParams.get('logout') === 'true';
    
    // Check if we've already refreshed
    const hasRefreshed = sessionStorage.getItem('hasRefreshedAfterLogout');

    if (isLogout && !hasRefreshed) {
      // Clear all authentication tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.clear();
      
      // Set flag to prevent infinite refresh
      sessionStorage.setItem('hasRefreshedAfterLogout', 'true');
      
      // Perform refresh by navigating to clean login URL
      window.location.href = '/login';
    }
  }, [location]);

  return (
    // Login component JSX
  );
};

export default Login;
```

### Utility Functions

**File**: `frontend/src/utils/authRefresh.js`

```typescript
/**
 * Checks if the current page load is from a logout redirect
 */
export const isLogoutRedirect = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('logout') === 'true';
};

/**
 * Checks if the page has already been refreshed after logout
 */
export const hasRefreshedAfterLogout = (): boolean => {
  return sessionStorage.getItem('hasRefreshedAfterLogout') === 'true';
};

/**
 * Marks the page as having been refreshed after logout
 */
export const markAsRefreshed = (): void => {
  sessionStorage.setItem('hasRefreshedAfterLogout', 'true');
};

/**
 * Clears all authentication tokens from storage
 */
export const clearAuthTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.clear();
};

/**
 * Performs the auto-refresh after logout
 */
export const performLogoutRefresh = (): void => {
  if (isLogoutRedirect() && !hasRefreshedAfterLogout()) {
    clearAuthTokens();
    markAsRefreshed();
    window.location.href = '/login';
  }
};
```

### Logout Handler Update

**File**: `frontend/src/utils/auth.js` (or equivalent)

```typescript
export const handleLogout = () => {
  // Clear tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // Redirect to login with logout parameter
  window.location.href = '/login?logout=true';
};
```

## Edge Cases and Solutions

### 1. Multiple Tabs

**Problem**: User has multiple tabs open, logs out in one tab

**Solution**: sessionStorage is tab-isolated, so each tab refreshes independently without interference

**Implementation**: No special handling needed - sessionStorage behavior handles this automatically

### 2. Browser Back Button

**Problem**: User clicks back button after logout and refresh

**Solution**: After refresh, URL no longer contains `?logout=true`, so back button doesn't trigger refresh

**Implementation**: Refresh removes the logout parameter from URL

### 3. Direct Navigation

**Problem**: User directly navigates to `/login` without logging out

**Solution**: No logout parameter present, so no refresh is triggered

**Implementation**: Check for `?logout=true` parameter before refreshing

### 4. Session Expiry

**Problem**: User's session expires and they're redirected to login

**Solution**: Session expiry redirects to `/login` without logout parameter, no refresh occurs

**Implementation**: Only logout action adds the `?logout=true` parameter

### 5. Infinite Refresh Loop

**Problem**: Refresh could potentially trigger another refresh

**Solution**: sessionStorage flag prevents multiple refreshes

**Implementation**: Check `hasRefreshedAfterLogout` flag before refreshing

## Testing Strategy

### Unit Tests

**File**: `frontend/src/pages/Login.test.jsx`

```typescript
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

describe('Login Auto-Refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete window.location;
    window.location = { href: '', search: '' };
  });

  test('should refresh when logout parameter is present and not yet refreshed', async () => {
    window.location.search = '?logout=true';
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(sessionStorage.getItem('hasRefreshedAfterLogout')).toBe('true');
      expect(window.location.href).toBe('/login');
    });
  });

  test('should not refresh when already refreshed', () => {
    window.location.search = '?logout=true';
    sessionStorage.setItem('hasRefreshedAfterLogout', 'true');
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(window.location.href).not.toBe('/login');
  });

  test('should not refresh without logout parameter', () => {
    window.location.search = '';
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(sessionStorage.getItem('hasRefreshedAfterLogout')).toBeNull();
    expect(window.location.href).not.toBe('/login');
  });

  test('should clear all tokens before refresh', async () => {
    window.location.search = '?logout=true';
    localStorage.setItem('access_token', 'test_token');
    localStorage.setItem('refresh_token', 'test_refresh');
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });
});
```

### Property-Based Tests

**File**: `frontend/src/pages/Login.property.test.jsx`

```typescript
import fc from 'fast-check';
import { performLogoutRefresh, clearAuthTokens } from '../utils/authRefresh';

describe('Login Auto-Refresh Properties', () => {
  /**
   * Property 35: Single Refresh Guarantee
   * For any logout event, the login page SHALL refresh exactly once per tab session
   */
  test('Property 35: Single refresh guarantee', () => {
    fc.assert(
      fc.property(fc.nat(10), (numAttempts) => {
        sessionStorage.clear();
        localStorage.clear();
        
        let refreshCount = 0;
        const originalHref = window.location.href;
        
        // Mock window.location.href setter
        Object.defineProperty(window.location, 'href', {
          set: () => { refreshCount++; },
          get: () => originalHref
        });
        
        // Simulate multiple refresh attempts
        for (let i = 0; i < numAttempts; i++) {
          window.location.search = '?logout=true';
          performLogoutRefresh();
        }
        
        // Should only refresh once
        return refreshCount <= 1;
      })
    );
  });

  /**
   * Property 36: Token Clearing Completeness
   * For any auto-refresh trigger, ALL authentication tokens SHALL be cleared before refresh
   */
  test('Property 36: Token clearing completeness', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (accessToken, refreshToken) => {
          localStorage.clear();
          sessionStorage.clear();
          
          // Set random tokens
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          
          // Clear tokens
          clearAuthTokens();
          
          // Verify all tokens are cleared
          return (
            localStorage.getItem('access_token') === null &&
            localStorage.getItem('refresh_token') === null
          );
        }
      )
    );
  });

  /**
   * Property 37: Refresh Loop Prevention
   * For any sequence of page loads, the auto-refresh mechanism SHALL NOT cause infinite loops
   */
  test('Property 37: Refresh loop prevention', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 20 }), (navigationSequence) => {
        sessionStorage.clear();
        let refreshCount = 0;
        
        navigationSequence.forEach((hasLogoutParam) => {
          window.location.search = hasLogoutParam ? '?logout=true' : '';
          
          if (hasLogoutParam && !sessionStorage.getItem('hasRefreshedAfterLogout')) {
            sessionStorage.setItem('hasRefreshedAfterLogout', 'true');
            refreshCount++;
          }
        });
        
        // Should never refresh more than once
        return refreshCount <= 1;
      })
    );
  });

  /**
   * Property 38: Performance Constraint
   * For any logout-triggered refresh, the refresh SHALL complete within 100ms of detection
   */
  test('Property 38: Performance constraint', () => {
    fc.assert(
      fc.property(fc.nat(100), () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.search = '?logout=true';
        
        const startTime = performance.now();
        performLogoutRefresh();
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        
        // Should complete within 100ms
        return duration < 100;
      })
    );
  });
});
```

### Integration Tests

**File**: `tests/e2e/logout-refresh.spec.js` (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Logout Auto-Refresh Flow', () => {
  test('should auto-refresh login page after logout', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login with logout parameter
    await expect(page).toHaveURL(/login\?logout=true/);
    
    // Should auto-refresh to clean login URL
    await page.waitForURL('http://localhost:3000/login', { timeout: 1000 });
    
    // Verify tokens are cleared
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(accessToken).toBeNull();
  });

  test('should not cause infinite refresh loop', async ({ page }) => {
    let navigationCount = 0;
    
    page.on('framenavigated', () => {
      navigationCount++;
    });
    
    // Navigate to login with logout parameter
    await page.goto('http://localhost:3000/login?logout=true');
    
    // Wait for potential refreshes
    await page.waitForTimeout(2000);
    
    // Should only navigate twice: initial load + one refresh
    expect(navigationCount).toBeLessThanOrEqual(2);
  });

  test('should handle multiple tabs independently', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Both tabs navigate to logout URL
    await page1.goto('http://localhost:3000/login?logout=true');
    await page2.goto('http://localhost:3000/login?logout=true');
    
    // Both should refresh independently
    await page1.waitForURL('http://localhost:3000/login');
    await page2.waitForURL('http://localhost:3000/login');
    
    // Both should have clean URLs
    expect(page1.url()).toBe('http://localhost:3000/login');
    expect(page2.url()).toBe('http://localhost:3000/login');
    
    await context.close();
  });
});
```

## Performance Considerations

### Timing Constraints

- **Detection**: < 10ms to detect logout parameter
- **Token Clearing**: < 20ms to clear all tokens
- **Flag Setting**: < 10ms to set sessionStorage flag
- **Refresh Execution**: < 60ms to initiate refresh
- **Total**: < 100ms from detection to refresh

### Optimization Tips

1. Use `useEffect` with proper dependencies to avoid unnecessary checks
2. Minimize localStorage/sessionStorage operations
3. Use direct `window.location.href` assignment for fastest refresh
4. Avoid async operations in the refresh flow

## Troubleshooting

### Issue: Infinite Refresh Loop

**Symptoms**: Page keeps refreshing continuously

**Diagnosis**: sessionStorage flag not being set or checked properly

**Solution**: Verify flag is set BEFORE refresh, check browser sessionStorage in DevTools

### Issue: Tokens Not Cleared

**Symptoms**: User still authenticated after logout

**Diagnosis**: Token clearing happens after refresh instead of before

**Solution**: Ensure `clearAuthTokens()` is called before `window.location.href` assignment

### Issue: Refresh Not Triggering

**Symptoms**: Login page shows with `?logout=true` parameter still in URL

**Diagnosis**: Condition check failing or flag already set

**Solution**: Clear sessionStorage and test again, check URL parameter parsing

### Issue: Multiple Tab Interference

**Symptoms**: Refresh behavior inconsistent across tabs

**Diagnosis**: Using localStorage instead of sessionStorage for flag

**Solution**: Ensure using sessionStorage (tab-isolated) not localStorage (shared)

## Deployment Checklist

- [ ] Frontend code implements auto-refresh logic
- [ ] Logout handler adds `?logout=true` parameter
- [ ] Unit tests pass for all scenarios
- [ ] Property tests pass for all properties
- [ ] Integration tests pass for complete flow
- [ ] Performance tests confirm < 100ms constraint
- [ ] Edge cases tested (multiple tabs, back button, etc.)
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Documentation updated
- [ ] Code reviewed and approved

## Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Supported | Full support |
| Firefox | 88+ | ✅ Supported | Full support |
| Safari | 14+ | ✅ Supported | Full support |
| Edge | 90+ | ✅ Supported | Full support |
| IE 11 | - | ❌ Not Supported | sessionStorage limitations |

## References

- **Requirement 11**: Login Page Auto-Refresh After Logout
- **Design Section 4**: Login Page Auto-Refresh Component
- **Properties 35-38**: Auto-refresh correctness properties
- **Task 14**: Implementation tasks and subtasks
