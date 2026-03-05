# Google Login Button Setup Guide

## Problem
The Google login button is not appearing on the login page because the required environment variable `REACT_APP_GOOGLE_CLIENT_ID` is not configured.

## Solution

### Step 1: Get Google OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: E-Kalolsavam
   - User support email: your email
   - Developer contact: your email
6. For Application type, select **Web application**
7. Add **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
8. Add **Authorized redirect URIs**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
9. Click **Create**
10. Copy the **Client ID** (it looks like: `xxxxx.apps.googleusercontent.com`)

### Step 2: Configure Backend Environment

Create or update `backend/.env`:

```env
# ... other existing variables ...

# Google OAuth2 Configuration
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=xxxxx.apps.googleusercontent.com
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=GOCSPX-xxxxxxxxxxxxxx
```

### Step 3: Configure Frontend Environment

Create `frontend/.env`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000

# Google OAuth2 Configuration
# Use the SAME Client ID from backend
REACT_APP_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

**IMPORTANT**: Use the **exact same Client ID** in both backend and frontend!

### Step 4: Restart the Application

1. **Stop both backend and frontend** if running
2. **Restart backend**:
   ```bash
   cd backend
   python manage.py runserver
   ```
3. **Restart frontend**:
   ```bash
   cd frontend
   npm start
   ```

### Step 5: Verify Google Login Button Appears

1. Navigate to `http://localhost:3000/login`
2. You should now see:
   - Regular login form
   - "Or continue with" separator
   - **Google Sign In** button
   - Info message about Google sign-in

## How It Works

### Email Allowlist Validation

The system restricts Google signup to only approved email addresses:

1. **Admin emails** (`joelfrancisjoy@gmail.com`) are automatically allowed
2. **Other users** must have their email added to the allowed list by an admin
3. During Google sign-in, the backend checks if the email is in the `AllowedEmail` table

### User Flow

#### Admin User (joelfrancisjoy@gmail.com):
1. Click "Sign in with Google"
2. Authenticate with Google
3. Automatically redirected to `/admin` dashboard
4. Gets admin role, is_staff, and is_superuser automatically

#### Other Approved Users:
1. Click "Sign in with Google"
2. Authenticate with Google
3. Email is validated against allowed list
4. If approved:
   - New account created (or existing account logged in)
   - Redirected to role-appropriate dashboard
5. If not approved:
   - Error: "Email not authorized for Google signup"

### Role-Based Routing

After successful Google authentication:
- **Admin** → `/admin`
- **Judge** → `/judge` (only if approved)
- **Volunteer** → `/volunteer` (only if approved)
- **Student** → `/dashboard`

## Troubleshooting

### Google Button Not Appearing

**Symptom**: No Google login button on the page

**Solution**: 
1. Check `frontend/.env` exists and has `REACT_APP_GOOGLE_CLIENT_ID`
2. Restart frontend: `npm start`
3. Clear browser cache
4. Check browser console for errors

### "Email not authorized" Error

**Symptom**: Error message when trying to sign in with Google

**Solution**:
1. Admin must add the email to allowed list:
   - Login as admin
   - Go to Admin Panel → Google Signup Emails
   - Add the email address
   - Try Google sign-in again

### "Invalid Google token" Error

**Symptom**: Error during Google authentication

**Solution**:
1. Verify `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY` in `backend/.env` matches Google Console
2. Verify `REACT_APP_GOOGLE_CLIENT_ID` in `frontend/.env` matches Google Console
3. Check that both use the **same Client ID**
4. Restart both backend and frontend

### CORS Errors

**Symptom**: Network errors, CORS policy errors in browser console

**Solution**:
1. Verify `backend/e_kalolsavam/settings.py` has correct CORS configuration:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "http://127.0.0.1:3000",
   ]
   ```
2. Restart backend server

## Testing the Fix

### Test 1: Google Button Visibility
1. Navigate to login page
2. ✅ Google login button should be visible below the form
3. ✅ Button should have Google logo and "Sign in with Google" text

### Test 2: Admin Login (joelfrancisjoy@gmail.com)
1. Click "Sign in with Google"
2. Select joelfrancisjoy@gmail.com account
3. ✅ Should redirect to `/admin` dashboard
4. ✅ User should have admin privileges

### Test 3: Other User Login (with allowed email)
1. Add test email to allowed list via admin panel
2. Click "Sign in with Google"  
3. Select the allowed email account
4. ✅ Should create account and redirect to appropriate dashboard
5. ✅ Should work on subsequent logins

### Test 4: Unauthorized Email
1. Try Google sign-in with email NOT in allowed list
2. ✅ Should show error: "Email not authorized for Google signup"
3. ✅ Should not create account or login

## Security Notes

1. **Environment Variables**: Never commit `.env` files to git
2. **Client Secret**: Keep `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET` confidential
3. **Allowlist**: Only approved emails can register via Google
4. **Role Assignment**: New Google users get 'student' role by default (except joelfrancisjoy@gmail.com)

## Additional Resources

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [React OAuth Google Library](https://www.npmjs.com/package/@react-oauth/google)
- [Django Social Auth](https://python-social-auth.readthedocs.io/)

## Support

If you encounter issues:
1. Check environment variables are correctly set
2. Verify Google Cloud Console configuration
3. Check backend and frontend logs
4. Ensure both servers are running
5. Clear browser cache and cookies
