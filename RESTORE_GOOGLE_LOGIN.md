# Restore Google Login Button - Quick Fix Guide

## Issue
The Google login button is not appearing on the login page (`/login`).

## Root Cause
The Google login button is **conditionally rendered** in the code based on the `REACT_APP_GOOGLE_CLIENT_ID` environment variable:

```javascript
{process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
  <div className="mt-8">
    {/* Google Login Button */}
  </div>
) : null}
```

If this environment variable is not set, the button will not render.

## Quick Fix (5 minutes)

### Step 1: Get Your Google OAuth2 Client ID

If you already have a Google Cloud project set up:
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Copy the Client ID (format: `xxxxx-xxxxx.apps.googleusercontent.com`)

If you need to create new credentials, see [Detailed Setup](#detailed-setup-for-new-google-oauth2-project) below.

### Step 2: Create Frontend Environment File

Create a file named `.env` in the `frontend/` directory:

```bash
cd frontend
# On Windows PowerShell:
New-Item -Path ".env" -ItemType File

# On Mac/Linux:
touch .env
```

Add this content to `frontend/.env`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000

# Google OAuth2 Client ID
# IMPORTANT: Use the SAME Client ID from backend/.env
REACT_APP_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

**Replace** `YOUR_CLIENT_ID_HERE.apps.googleusercontent.com` with your actual Google Client ID.

### Step 3: Verify Backend Configuration

Make sure `backend/.env` has the same Client ID:

```env
# In backend/.env
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=GOCSPX-your-client-secret
```

**Critical**: Both frontend and backend MUST use the **exact same Client ID**!

### Step 4: Restart Frontend

```bash
# Stop the frontend if running (Ctrl+C)
cd frontend
npm start
```

### Step 5: Verify

1. Open browser to `http://localhost:3000/login`
2. You should now see:
   - ✅ Regular username/password form
   - ✅ "Or continue with" divider
   - ✅ Google Sign In button with Google logo
   - ✅ Info message about Google sign-in

## Expected Behavior After Fix

### Google Login Button Should Show:
- Below the password/username form
- With Google logo and "Sign in with Google" text
- Info tooltip explaining Google sign-in
- Responsive sizing

### When Clicked:
- Opens Google account selection popup
- Allows user to select Google account
- Authenticates with backend
- Redirects to appropriate dashboard based on role

## Detailed Setup for New Google OAuth2 Project

If you don't have Google OAuth2 credentials yet:

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `E-Kalolsavam`
4. Click **Create**

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in required fields:
   - **App name**: E-Kalolsavam Portal
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**
6. Skip scopes (default is fine)
7. Add test users if needed
8. Click **Save and Continue**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `E-Kalolsavam Web Client`
5. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - Add production URLs when deploying
6. **Authorized redirect URIs**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `http://localhost:8000/auth/complete/google-oauth2/` (for backend)
7. Click **Create**
8. **Save the Client ID and Client Secret**

### 4. Configure Environment Files

**Backend** (`backend/.env`):
```env
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=xxxxx-xxxxx.apps.googleusercontent.com
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=GOCSPX-xxxxxxxxxxxxx
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=xxxxx-xxxxx.apps.googleusercontent.com
```

## Testing the Restoration

### Test 1: Button Visibility ✅
1. Navigate to `http://localhost:3000/login`
2. Scroll down below the password field
3. **Expected**: Google login button is visible with Google logo

### Test 2: Admin Login ✅
1. Click "Sign in with Google"
2. Select `joelfrancisjoy@gmail.com` (or configured admin email)
3. **Expected**: 
   - Redirected to `/admin`
   - Full admin access granted
   - No errors in console

### Test 3: Regular User Login ✅
1. As admin, add a test email to allowed list:
   - Go to Admin Panel → Google Signup Emails
   - Add your test Gmail address
2. Logout
3. Click "Sign in with Google"
4. Select the test email
5. **Expected**:
   - Account created automatically
   - Redirected to `/dashboard` (student role by default)
   - No errors

### Test 4: Unauthorized Email ✅
1. Try Google sign-in with email NOT in allowed list
2. **Expected**:
   - Error message: "Email not authorized for Google signup"
   - User stays on login page
   - No account created

## Troubleshooting

### Issue: Google Button Still Not Showing

**Check 1**: Environment variable is set
```bash
# In frontend directory
cat .env
# Should show: REACT_APP_GOOGLE_CLIENT_ID=...
```

**Check 2**: Frontend was restarted after creating .env
```bash
# Must restart for .env changes to take effect
npm start
```

**Check 3**: Browser cache
- Clear browser cache
- Try incognito/private window
- Check browser console for errors

### Issue: "Invalid Google Token" Error

**Cause**: Client ID mismatch between frontend and backend

**Fix**: 
1. Verify both `.env` files use the **exact same** Client ID
2. No extra spaces, quotes, or characters
3. Restart both backend and frontend

### Issue: "Email not authorized" for Admin

**Cause**: Admin email not in allowed list

**Fix**:
1. Login with regular username/password as admin
2. Go to Admin Panel → Google Signup Emails
3. Add `joelfrancisjoy@gmail.com` to allowed list
4. Try Google login again

### Issue: CORS Errors in Browser Console

**Cause**: Backend CORS not configured for frontend origin

**Fix**:
Check `backend/e_kalolsavam/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

Restart backend after changes.

## File Checklist

After completing setup, you should have:

- ✅ `frontend/.env` with `REACT_APP_GOOGLE_CLIENT_ID`
- ✅ `backend/.env` with `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY` and `SECRET`
- ✅ Same Client ID in both files
- ✅ Google Cloud Console credentials configured
- ✅ Authorized origins include `http://localhost:3000`

## Security Notes

### Environment Files
- ✅ `.env` files are in `.gitignore`
- ✅ Never commit `.env` files to version control
- ✅ Use `.env.example` as template

### Google Client Secret
- ✅ Keep `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET` confidential
- ✅ Only store in backend `.env`
- ✅ Never expose in frontend code

### Email Allowlist
- ✅ Only approved emails can register via Google
- ✅ Admin can manage allowed emails
- ✅ joelfrancisjoy@gmail.com gets automatic admin privileges

## Additional Notes

### Why Two Environment Variables?

1. **Backend** (`SOCIAL_AUTH_GOOGLE_OAUTH2_KEY`):
   - Used by Django Social Auth
   - Verifies Google ID tokens
   - Creates user accounts

2. **Frontend** (`REACT_APP_GOOGLE_CLIENT_ID`):
   - Used by `@react-oauth/google` library
   - Renders Google login button
   - Initiates OAuth flow

### Role-Based Dashboard Routing

After successful Google login:

| Role | Redirect | Approval Required |
|------|----------|-------------------|
| Admin | `/admin` | No (auto-approved) |
| Student | `/dashboard` | No |
| Judge | `/judge` | Yes |
| Volunteer | `/volunteer` | Yes |

### Default Role Assignment

- New Google signups → `student` role
- Exception: `joelfrancisjoy@gmail.com` → `admin` role

## Related Documentation

- [`AUTHENTICATION_SETUP.md`](./AUTHENTICATION_SETUP.md) - Complete auth setup
- [`GOOGLE_SIGNUP_RESTRICTION.md`](./GOOGLE_SIGNUP_RESTRICTION.md) - Email allowlist management
- [`GOOGLE_LOGIN_SETUP.md`](./GOOGLE_LOGIN_SETUP.md) - Detailed Google login guide

## Success Indicators

You'll know the fix worked when:

1. ✅ Google login button visible on `/login` page
2. ✅ No errors in browser console
3. ✅ Admin can login with joelfrancisjoy@gmail.com
4. ✅ Redirects to correct dashboard after login
5. ✅ Email allowlist validation works
6. ✅ Unauthorized emails are rejected

## Need Help?

If you're still experiencing issues:

1. Check all environment variables are set correctly
2. Verify Google Cloud Console configuration
3. Review browser console for specific errors
4. Check backend server logs
5. Ensure both servers are running
6. Try clearing all browser data and cookies

---

**Last Updated**: 2025-10-24
**Status**: Complete - Google Login Restored ✅
