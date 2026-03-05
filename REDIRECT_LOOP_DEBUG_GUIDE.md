# Authentication Redirect Loop - Debug Guide

## 🔍 Debugging Steps

I've implemented comprehensive debugging tools to help identify exactly what's causing the redirect loop. Follow these steps:

### Step 1: Test with Debug Dashboard

1. **Login successfully** using any method (standard login or Google OAuth)
2. **Navigate to the test dashboard**: `http://localhost:3000/test`
3. **Observe behavior**:
   - ✅ **If it stays on the test page**: The basic authentication is working
   - ❌ **If it redirects to login**: There's an issue with the authentication check itself

### Step 2: Check Browser Console

Open browser developer tools (F12) and look for these debug messages:

#### Expected Debug Messages (Normal Flow):
```
[AuthDebug] AUTH_CHECK: {result: true, reason: "access: true, refresh: true"}
[AuthDebug] TEST_DASHBOARD_MOUNTED: {hasAccess: true, hasRefresh: true, pathname: "/test"}
```

#### Problem Indicators:
```
[AuthDebug] REDIRECT: {from: "/test", to: "/login", reason: "not authenticated"}
[AuthDebug] STORAGE_REMOVE: {key: "access_token"}
[AuthDebug] TOKEN_REFRESH: {success: false, error: "..."}
HTTP Error intercepted: {status: 401, url: "/api/auth/current/", ...}
```

### Step 3: Use Debug Tools

On the test dashboard, use these buttons:

1. **"Dump Auth Logs"** - Shows recent authentication events
2. **"Clear Logs"** - Clears debug history
3. **"Clear Tokens & Reload"** - Resets authentication state

### Step 4: Identify the Root Cause

Based on console output, identify which scenario matches:

#### Scenario A: Tokens Being Removed
**Symptoms**: You see `STORAGE_REMOVE` messages for tokens
**Cause**: API calls are failing and triggering token cleanup
**Solution**: Check which API calls are failing

#### Scenario B: Authentication Check Failing
**Symptoms**: `AUTH_CHECK` shows `result: false` immediately after login
**Cause**: Tokens not being stored properly during login
**Solution**: Check login flow and token storage

#### Scenario C: API Calls Triggering Redirects
**Symptoms**: Multiple `HTTP Error intercepted` messages followed by redirects
**Cause**: Dashboard components making API calls that fail
**Solution**: Make API calls more resilient

## 🛠️ Fixes Implemented

### 1. Enhanced HTTP Interceptor
- Better error handling for network vs auth errors
- Longer delays to prevent redirect loops
- Special handling for expected-to-fail endpoints
- Comprehensive logging

### 2. Improved Authentication State
- More robust token checking
- Debug logging for auth decisions
- Better handling of edge cases

### 3. Resilient Dashboard Loading
- StudentDashboard now handles API failures gracefully
- Fallback data when API calls fail
- No redirects on API errors

### 4. Debug Tools
- Real-time authentication event tracking
- Storage change monitoring
- Navigation tracking
- Easy-to-use debug interface

## 🔧 Manual Testing Steps

### Test 1: Basic Authentication
1. Clear browser cache and localStorage
2. Login with valid credentials
3. Navigate to `/test`
4. **Expected**: Should stay on test page

### Test 2: API Call Resilience
1. Login successfully
2. Navigate to `/dashboard` (StudentDashboard)
3. Open browser console
4. **Expected**: Should see API calls but no redirects

### Test 3: Token Refresh
1. Login successfully
2. Wait for token to expire (or manually expire it)
3. Make an API call
4. **Expected**: Should refresh token automatically

## 📊 Debug Output Examples

### Successful Flow:
```
[AuthDebug] AUTH_CHECK: {result: true, reason: "access: true, refresh: true"}
[AuthDebug] TEST_DASHBOARD_MOUNTED: {hasAccess: true, hasRefresh: true}
StudentDashboard: Starting API calls...
StudentDashboard: API results: {registrations: 0, results: 0, events: 5, user: "loaded"}
```

### Problem Flow:
```
[AuthDebug] AUTH_CHECK: {result: true, reason: "access: true, refresh: true"}
HTTP Error intercepted: {status: 401, url: "/api/auth/current/"}
[AuthDebug] TOKEN_REFRESH: {success: false, error: "Request failed with status code 401"}
[AuthDebug] STORAGE_REMOVE: {key: "access_token"}
[AuthDebug] REDIRECT: {from: "/dashboard", to: "/login", reason: "refresh token invalid"}
```

## 🎯 Next Steps

1. **Test the debug dashboard** at `/test` first
2. **Check console output** for specific error patterns
3. **Use the debug tools** to dump authentication logs
4. **Report findings** - tell me which scenario matches your situation

The debug tools will help us identify exactly where the redirect loop is being triggered!

## 🚨 If Issues Persist

If you still see redirect loops after these fixes:

1. **Clear all browser data** (cache, cookies, localStorage)
2. **Restart both frontend and backend** servers
3. **Test with incognito/private browsing** mode
4. **Check the debug output** and share the console logs

The enhanced debugging will show us exactly what's happening in the authentication flow.