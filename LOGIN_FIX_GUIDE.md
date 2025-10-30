# Login Fix Guide

## Issues Identified

Based on the errors you encountered:

1. **"[GSI_LOGGER]: The given origin is not allowed for the given client ID"** - Google OAuth configuration issue
2. **"ERR_CONNECTION_REFUSED"** - Backend server not running on port 8000
3. **"Failed to load resource: the server responded with a status of 403"** - Permission error

## Root Causes

### 1. Backend Server Not Running
The backend Django server needs to be running on port 8000 for the frontend to connect.

### 2. Google OAuth Origins Not Configured
Your Google OAuth Client ID needs to have the correct authorized JavaScript origins in the Google Cloud Console.

## Solutions

### Step 1: Start the Backend Server

Run the backend server:
```bash
cd backend
python manage.py runserver
```

The server should start on `http://localhost:8000`

### Step 2: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`
5. Click **Edit**
6. Add these **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`
7. Add these **Authorized redirect URIs**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `http://localhost:8000/auth/complete/google-oauth2/`
   - `http://127.0.0.1:8000/auth/complete/google-oauth2/`
8. Click **Save**

### Step 3: Verify Environment Variables

**Backend `.env` file** (already configured):
```env
SECRET_KEY=p6j4*0yhenk@wr*^fu-5wreiqsg2fym9*&#6djr%gqfigfb#x7
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,testserver
DATABASE_NAME=ekalolsavam_db
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_HOST=localhost
DATABASE_PORT=3306

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=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

EMAIL_HOST_USER=joelfrancisjoy@gmail.com
EMAIL_HOST_PASSWORD=tgig dcpn hruo jfii
```

**Frontend `.env` file** (already configured):
```env
WDS_SOCKET_PORT=0
FAST_REFRESH=false
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com
```

### Step 4: Restart Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Step 5: Test the Login

1. Navigate to `http://localhost:3000`
2. Try logging in with username/password
3. Or click "Sign in with Google"

## Troubleshooting

### If backend won't start:
- Check if MySQL database is running
- Verify database credentials in `.env`
- Run migrations: `python manage.py migrate`

### If Google Sign-In still fails:
- Clear browser cache and cookies
- Verify the Client ID matches in both `.env` files
- Wait 5-10 minutes after updating Google Cloud Console (changes take time to propagate)
- Check browser console for detailed errors

### If CORS errors occur:
- Verify `CORS_ALLOWED_ORIGINS` in `backend/e_kalolsavam/settings.py` includes `http://localhost:3000`
- Restart backend server after changes

## Verification Checklist

- [ ] Backend server running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Google Cloud Console has correct origins configured
- [ ] Backend `.env` file has correct Google Client ID
- [ ] Frontend `.env` file has correct Google Client ID
- [ ] Both `.env` files use the SAME Google Client ID
- [ ] No CORS errors in browser console
- [ ] Database is accessible and migrations are up to date

## Quick Fix Summary

The main issue is that Google OAuth needs the authorized origins configured. After adding them in Google Cloud Console:

1. Wait 5-10 minutes for changes to propagate
2. Restart both backend and frontend servers
3. Clear browser cache
4. Try logging in again

Your `.env` files are correctly configured - the issue is purely in Google Cloud Console configuration.


