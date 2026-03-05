# Quick Start - Fix Login Issues

## Current Status
✅ Environment files are configured correctly  
✅ Backend `.env` file exists with Google OAuth credentials  
✅ Frontend `.env` file exists with matching Client ID  
❌ Google Cloud Console needs authorized origins added  
❌ Backend server needs to be running  

## Immediate Actions Required

### 1. Start Backend Server
```bash
cd backend
python manage.py runserver
```
The server will start on `http://localhost:8000`

### 2. Start Frontend Server
In a new terminal:
```bash
cd frontend
npm start
```
The server will start on `http://localhost:3000`

### 3. Configure Google OAuth Origins
Go to: https://console.cloud.google.com/apis/credentials

Find: `286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com`

Click Edit, then add these **Authorized JavaScript origins**:
- `http://localhost:3000`
- `http://localhost:8000`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:8000`

Add these **Authorized redirect URIs**:
- `http://localhost:3000`
- `http://localhost:8000/auth/complete/google-oauth2/`

**Click Save** and wait 5-10 minutes.

### 4. Test Login
1. Navigate to `http://localhost:3000/login`
2. Try username/password login
3. Or click "Sign in with Google"

## Error Explanations

### Error 1: `ERR_CONNECTION_REFUSED`
**Cause:** Backend server not running  
**Fix:** Run `python manage.py runserver` in the `backend` directory

### Error 2: `The given origin is not allowed for the given client ID`
**Cause:** Google OAuth origins not configured in Google Cloud Console  
**Fix:** Add localhost URLs to authorized origins (see step 3 above)

### Error 3: `403 Permission Error`
**Cause:** Backend server not running or CORS issue  
**Fix:** Start backend server first, then refresh frontend

## Files Already Configured ✓

**backend/.env:**
```env
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com
```

**frontend/.env:**
```env
REACT_APP_GOOGLE_CLIENT_ID=286343152027-b5vl0g0s9no9qsd8iko6o86qq9ovfiei.apps.googleusercontent.com
REACT_APP_API_URL=http://localhost:8000
```

These are already configured correctly. You just need to:
1. Start both servers
2. Add origins in Google Cloud Console

## Test After Setup

Once both servers are running:
```bash
# Test backend
curl http://localhost:8000/api/auth/current/

# Open browser
# Go to http://localhost:3000
# Click login
```

## Summary

The login issues are caused by:
1. ❌ Backend server not running → **Start it**
2. ❌ Google OAuth origins not configured → **Add them in Cloud Console**

Your code and `.env` files are already correctly configured! ✓


