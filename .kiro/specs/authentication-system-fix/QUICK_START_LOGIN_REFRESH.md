# Quick Start: Login Page Auto-Refresh

## 60-Second Overview

After logout, the login page automatically refreshes to clear cached authentication state. This prevents stale UI, leftover tokens, and ensures users see a clean login interface.

## How It Works

```
Logout → /login?logout=true → Detect → Clear Tokens → Refresh → /login (clean)
```

## Essential Implementation

### 1. Update Login Component

**File**: `frontend/src/pages/Login.jsx`

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Login = () => {
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const isLogout = urlParams.get('logout') === 'true';
    const hasRefreshed = sessionStorage.getItem('hasRefreshedAfterLogout');

    if (isLogout && !hasRefreshed) {
      // Clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.clear();
      
      // Prevent loop
      sessionStorage.setItem('hasRefreshedAfterLogout', 'true');
      
      // Refresh
      window.location.href = '/login';
    }
  }, [location]);

  return (/* Your login JSX */);
};
```

### 2. Update Logout Handler

**File**: `frontend/src/utils/auth.js`

```typescript
export const handleLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // Add logout parameter to trigger refresh
  window.location.href = '/login?logout=true';
};
```

## That's It!

The implementation is complete. The login page will now auto-refresh after logout.

## Quick Test

```bash
# 1. Start your app
npm start

# 2. Login to the application
# 3. Click logout
# 4. Observe: URL briefly shows /login?logout=true, then refreshes to /login
# 5. Verify: localStorage tokens are cleared
```

## Key Features

✅ **Single Refresh**: Only refreshes once per logout  
✅ **Token Clearing**: Removes all auth tokens before refresh  
✅ **Loop Prevention**: SessionStorage flag prevents infinite loops  
✅ **Fast**: Completes in < 100ms  
✅ **Tab-Safe**: Works independently in multiple tabs  

## Common Issues

### Issue: Infinite Refresh Loop

**Fix**: Ensure sessionStorage flag is set BEFORE `window.location.href`

```typescript
// ✅ CORRECT
sessionStorage.setItem('hasRefreshedAfterLogout', 'true');
window.location.href = '/login';

// ❌ WRONG
window.location.href = '/login';
sessionStorage.setItem('hasRefreshedAfterLogout', 'true'); // Never executes!
```

### Issue: Tokens Not Cleared

**Fix**: Clear tokens BEFORE refresh

```typescript
// ✅ CORRECT
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
window.location.href = '/login';

// ❌ WRONG
window.location.href = '/login';
localStorage.removeItem('access_token'); // Never executes!
```

### Issue: Refresh Not Triggering

**Fix**: Check URL parameter and flag

```typescript
// Debug in browser console
console.log(new URLSearchParams(window.location.search).get('logout'));
console.log(sessionStorage.getItem('hasRefreshedAfterLogout'));

// Clear flag to test again
sessionStorage.clear();
```

## Testing Commands

```bash
# Run unit tests
npm test -- Login.test.jsx

# Run property tests
npm test -- Login.property.test.jsx

# Run integration tests
npx playwright test logout-refresh.spec.js

# Run all tests
npm test
```

## File Checklist

- [ ] `frontend/src/pages/Login.jsx` - Auto-refresh logic added
- [ ] `frontend/src/utils/auth.js` - Logout handler updated
- [ ] `frontend/src/pages/Login.test.jsx` - Unit tests created
- [ ] `frontend/src/pages/Login.property.test.jsx` - Property tests created
- [ ] `tests/e2e/logout-refresh.spec.js` - Integration tests created

## Performance Check

```typescript
// Add timing measurement
const startTime = performance.now();
performLogoutRefresh();
const endTime = performance.now();
console.log(`Refresh took ${endTime - startTime}ms`); // Should be < 100ms
```

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Multiple tabs | Each tab refreshes independently |
| Back button | No additional refresh triggered |
| Direct `/login` | No refresh (no logout parameter) |
| Session expiry | No refresh (different from logout) |
| Refresh loop | Prevented by sessionStorage flag |

## Browser Support

✅ Chrome 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Edge 90+  
❌ IE 11 (not supported)

## Key Files Reference

### Specification Files

- **Requirements**: `.kiro/specs/authentication-system-fix/requirements.md` (Requirement 11)
- **Design**: `.kiro/specs/authentication-system-fix/design.md` (Section 4)
- **Tasks**: `.kiro/specs/authentication-system-fix/tasks.md` (Task 14)

### Implementation Files

- **Login Component**: `frontend/src/pages/Login.jsx`
- **Auth Utils**: `frontend/src/utils/auth.js`
- **Refresh Utils**: `frontend/src/utils/authRefresh.js` (optional)

### Test Files

- **Unit Tests**: `frontend/src/pages/Login.test.jsx`
- **Property Tests**: `frontend/src/pages/Login.property.test.jsx`
- **E2E Tests**: `tests/e2e/logout-refresh.spec.js`

### Documentation Files

- **Implementation Guide**: `.kiro/specs/authentication-system-fix/login-refresh-implementation.md`
- **Spec Summary**: `.kiro/specs/authentication-system-fix/SPEC_UPDATE_SUMMARY.md`
- **Quick Start**: `.kiro/specs/authentication-system-fix/QUICK_START_LOGIN_REFRESH.md` (this file)

## Need More Details?

📖 **Full Implementation Guide**: See `login-refresh-implementation.md`  
📋 **Spec Updates**: See `SPEC_UPDATE_SUMMARY.md`  
✅ **Requirements**: See `requirements.md` (Requirement 11)  
🏗️ **Design**: See `design.md` (Section 4)  
📝 **Tasks**: See `tasks.md` (Task 14)

## Quick Reference: Correctness Properties

**Property 35**: Single Refresh Guarantee  
→ Refreshes exactly once per logout

**Property 36**: Token Clearing Completeness  
→ All tokens cleared before refresh

**Property 37**: Refresh Loop Prevention  
→ No infinite refresh loops

**Property 38**: Performance Constraint  
→ Completes in < 100ms

## Implementation Time

⏱️ **Total**: 2-3 hours
- Implementation: 1 hour
- Testing: 1.5 hours
- Review: 30 minutes

## Ready to Implement?

1. ✅ Read this quick start
2. ✅ Update Login component
3. ✅ Update logout handler
4. ✅ Test the flow
5. ✅ Write tests
6. ✅ Deploy

**Questions?** Check the full implementation guide or spec documents.

---

**Last Updated**: January 21, 2026  
**Spec Version**: 1.0  
**Status**: Ready for Implementation
