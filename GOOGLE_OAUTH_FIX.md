# Google OAuth Configuration Fix

## Error
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

## Solution

You need to configure authorized origins in Google Cloud Console.

### Steps to Fix:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Login with your Google account

2. **Navigate to Credentials**
   - Select your project
   - Go to: **APIs & Services** → **Credentials**

3. **Find your OAuth 2.0 Client ID**
   - Client ID: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`
   - Click on it to edit

4. **Add Authorized JavaScript origins**
   Click "Add URI" and add each of these:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`

5. **Add Authorized redirect URIs**
   Click "Add URI" and add each of these:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `http://localhost:8000/auth/complete/google-oauth2/`
   - `http://127.0.0.1:8000/auth/complete/google-oauth2/`

6. **Save Changes**
   - Click "Save" at the bottom
   - Wait 5-10 minutes for changes to propagate

7. **Restart Servers**
   ```bash
   # Stop both frontend and backend
   # Then restart them
   ```

## Verification

After making changes:
1. Clear your browser cache
2. Wait 5-10 minutes
3. Try Google Sign-In again

## Screenshot Location in Console

The authorized origins section looks like this:
```
Authorized JavaScript origins
   ✓ http://localhost:3000
   ✓ http://localhost:8000
   ...
```

## Important Notes

- Both `.env` files already have the correct Client ID
- The issue is purely in Google Cloud Console configuration
- Changes take 5-10 minutes to propagate globally
- Make sure you're using `http://` not `https://` for localhost
- Use the same Client ID in both backend and frontend (already done ✓)

## Your Current Configuration (Correct ✓)

**Backend `.env`:**
```env
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=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
```

**Frontend `.env`:**
```env
REACT_APP_GOOGLE_CLIENT_ID=286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com
REACT_APP_API_URL=http://localhost:8000
```

Both files are configured correctly. You just need to add the origins in Google Cloud Console.


