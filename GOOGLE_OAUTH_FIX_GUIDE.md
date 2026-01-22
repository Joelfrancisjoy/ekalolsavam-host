# Google OAuth 403 Error Fix Guide

## Problem
You're seeing this error: `[GSI_LOGGER]: The given origin is not allowed for the given client ID.`

This happens because your Google Cloud Console OAuth configuration doesn't include the correct authorized origins.

## Solution

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if needed)
3. Navigate to **APIs & Services** → **Credentials**

### Step 2: Find Your OAuth 2.0 Client ID
Look for your OAuth 2.0 client ID: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`

### Step 3: Update Authorized JavaScript Origins
Click on your OAuth 2.0 Client ID and add these **Authorized JavaScript origins**:

```
http://localhost:3000
http://127.0.0.1:3000
http://localhost:8000
http://127.0.0.1:8000
```

### Step 4: Update Authorized Redirect URIs
Add these **Authorized redirect URIs**:

```
http://localhost:8000/auth/complete/google-oauth2/
http://127.0.0.1:8000/auth/complete/google-oauth2/
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

### Step 5: Save Changes
Click **Save** and wait a few minutes for changes to propagate.

## Current Configuration Check

Your current environment variables:
- **Backend Google Client ID**: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`
- **Frontend Google Client ID**: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`
- **Frontend URL**: `http://localhost:3000`
- **Backend URL**: `http://localhost:8000`

✅ **Good**: Frontend and backend are using the same Google Client ID
❌ **Issue**: Google Cloud Console doesn't allow these origins

## Testing After Fix

After updating Google Cloud Console:

1. **Clear browser cache** and cookies for localhost
2. **Restart your frontend** server
3. **Test Google login** button
4. **Check browser console** - the 403 error should be gone

## Alternative Quick Test

If you can't access Google Cloud Console immediately, you can test with a different approach:

1. Create a new Google Cloud project
2. Set up OAuth 2.0 credentials with the correct origins
3. Update your `.env` files with the new credentials

## Verification Commands

Test if the fix worked:

```bash
# Test frontend can load Google OAuth
curl -s "https://accounts.google.com/gsi/client" | grep -q "gsi" && echo "✅ Google OAuth API accessible"

# Test backend OAuth endpoint
curl -X POST http://localhost:8000/api/auth/google/ -H "Content-Type: application/json" -d '{"token":"test"}' | grep -q "error" && echo "✅ Backend OAuth endpoint responding"
```

## Common Issues After Fix

1. **Changes not taking effect**: Wait 5-10 minutes for Google's changes to propagate
2. **Still getting 403**: Clear browser cache completely
3. **Different error**: Check browser console for new error messages
4. **CORS errors**: Make sure backend CORS is configured (next step in our fix process)

## Next Steps

Once Google OAuth 403 is fixed, we'll address:
1. CORS configuration for frontend-backend communication
2. Authentication redirect loop (staying on destination page after login)
3. JWT token management improvements