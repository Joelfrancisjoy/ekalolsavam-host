# Google OAuth Configuration Guide

## Issue Description
You're seeing this error in the browser console:
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

This happens because your Google Cloud Console OAuth configuration doesn't include the correct authorized origins.

## Solution Steps

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Login with your Google account
3. Select your project (or create one if needed)

### Step 2: Navigate to Credentials
1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`

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
1. Click **Save** at the bottom
2. Wait 5-10 minutes for changes to propagate globally

### Step 6: Verification
After making changes:
1. Clear your browser cache and cookies
2. Close all browser tabs related to the application
3. Restart both frontend and backend servers
4. Try Google Sign-In again

## Verification Steps
1. Open browser to `http://localhost:3000/login`
2. You should see the Google Sign In button
3. Clicking it should open Google account selection without errors

## Troubleshooting
- If the Google button doesn't appear, check that `REACT_APP_GOOGLE_CLIENT_ID` is set in your frontend `.env` file
- If you still see the 403 error, ensure the client ID in your frontend matches the one in Google Cloud Console
- Make sure you're using `http://` not `https://` for localhost
- Clear browser cache and cookies if issues persist

## Current Configuration
Your current environment variables are correctly configured:
- **Frontend Google Client ID**: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`
- **Frontend URL**: `http://localhost:3000`
- **Backend URL**: `http://localhost:8000`