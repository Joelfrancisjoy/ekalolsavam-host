# Backend Status Check Guide

## ✅ Backend Status: WORKING

The backend server is running successfully with all new workflow features implemented.

---

## Quick Status Check

### 1. Check Server is Running
```bash
curl http://localhost:8000/api/auth/schools/
```
**Expected**: Returns list of schools (Status 200)

### 2. Check Database Migrations
```bash
cd backend
python manage.py showmigrations users
```
**Expected**: All migrations show `[X]` (applied)

### 3. Run System Check
```bash
python manage.py check
```
**Expected**: "System check identified no issues"

### 4. Run Full Test
```bash
cd ..
python test_backend_endpoints.py
```
**Expected**: All endpoints accessible, returns 200 or 401/403 (auth required)

---

## Endpoint Status

### ✅ Public Endpoints (Working)
- `GET /api/auth/schools/` - List schools
- `GET /api/auth/standings/` - School standings
- `POST /api/auth/register/with-id/` - ID-based registration

### ✅ Protected Endpoints (Require Authentication)
- `POST /api/auth/admin/schools/create/` - Create school accounts
- `POST /api/auth/admin/ids/generate/` - Generate IDs
- `GET /api/auth/admin/signup-requests/` - View signup requests
- `POST /api/auth/schools/participants/submit/` - Submit participants
- `GET /api/auth/volunteer/school-participants/` - View participants
- `POST /api/auth/volunteer/verify-student/` - Verify student

---

## How to Start Backend

### Option 1: Using Startup Script
```bash
cd ..
.\start-backend.bat
```

### Option 2: Manual Start
```bash
cd backend
.\kalenv\Scripts\Activate.ps1
python manage.py runserver 8000
```

---

## How to Verify Everything Works

### 1. Test Admin Panel
Navigate to: http://localhost:8000/admin

You should see the new models registered:
- AdminIssuedID
- SchoolParticipant
- SchoolVolunteerAssignment
- SchoolStanding
- IDSignupRequest

### 2. Test API Endpoints

**Schools List:**
```bash
curl http://localhost:8000/api/auth/schools/
```

**School Standings (empty initially):**
```bash
curl http://localhost:8000/api/auth/standings/
```

### 3. Check Django Admin

1. Go to http://localhost:8000/admin
2. Login with admin credentials
3. Navigate to "Users" section
4. Look for the new models:
   - Admin issued IDs
   - School Participants
   - School Volunteer Assignments
   - School Standings
   - ID Signup Requests

---

## Common Issues & Solutions

### Issue: "Module not found"
**Solution:** Make sure virtual environment is activated
```bash
cd backend
.\kalenv\Scripts\Activate.ps1
```

### Issue: "Port 8000 already in use"
**Solution:** Kill the process or use a different port
```bash
python manage.py runserver 8001
```

### Issue: "Database migration error"
**Solution:** Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Issue: "Authentication required (401)"
**Expected:** New endpoints require authentication. This is normal security behavior.

---

## Next Steps

1. **Backend is Complete** ✅
2. **Start Frontend Development** (Create UI components)
3. **Test with Real Data** (Create school accounts, test workflows)
4. **Deploy** (When ready for production)

---

## Quick Reference

| Component | Status | URL |
|-----------|--------|-----|
| Backend API | ✅ Running | http://localhost:8000/api/auth |
| Django Admin | ✅ Running | http://localhost:8000/admin |
| Schools Endpoint | ✅ Working | http://localhost:8000/api/auth/schools/ |
| Standings Endpoint | ✅ Working | http://localhost:8000/api/auth/standings/ |

---

**Last Checked**: Backend is fully operational ✅

