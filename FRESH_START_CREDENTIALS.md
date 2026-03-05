# Fresh Start - Admin Credentials

## ✅ Database Reset Complete!

Your database has been successfully reset and a fresh admin user has been created.

---

## 🔑 Admin Login Credentials

**Username:** `admin`  
**Email:** `admin@ekalolsavam.com`  
**Password:** `admin123`  
**Role:** Admin/Superuser

---

## 🚀 Next Steps

### 1. Start the Backend Server
```bash
# Already in backend directory with venv activated
python manage.py runserver 8000
```

### 2. Login to Admin Panel

**Via Web Interface:**
- Go to: http://localhost:8000/admin
- Login with credentials above

**Via API/Frontend:**
- Frontend: http://localhost:3000/login
- Login with: `admin` / `admin123`

---

## 📋 What to Do Next

### Immediate Actions:

1. **Change Admin Password** (Recommended)
   - Login to admin panel
   - Go to Users
   - Edit admin user
   - Change password to something secure

2. **Create School Accounts**
   - Go to Admin Panel → School Management
   - Create school accounts
   - Credentials will be sent via email

3. **Generate IDs for Volunteers/Judges**
   - Go to Admin Panel → ID Management
   - Generate unique IDs
   - Share IDs with volunteers/judges

4. **Test the System**
   - Login as admin
   - Create a test school
   - Generate test IDs
   - Test the complete workflow

---

## 🎯 Quick Test Commands

### Test Backend
```bash
python test_backend_endpoints.py
```

### Test Database
```bash
python manage.py dbshell
```

In MySQL, run:
```sql
SELECT username, email, role FROM users_user;
```

Expected output: Only admin user should be present.

---

## 📊 Current State

**Database:** Fresh (empty except admin)  
**Migrations:** All applied ✅  
**Admin User:** Created ✅  
**Models:** Ready to use ✅

---

## 🔒 Security Reminder

**IMPORTANT:** Change the default password (`admin123`) before deploying to production!

To change password programmatically:
```bash
python manage.py changepassword admin
```

---

## 📞 Quick Reference

| Service | URL | Status |
|---------|-----|--------|
| Backend API | http://localhost:8000 | ✅ Ready |
| Django Admin | http://localhost:8000/admin | ✅ Ready |
| Frontend | http://localhost:3000 | ⏳ Start separately |

---

**Database Status:** Clean and ready ✅  
**Admin Created:** Yes ✅  
**Ready for Use:** Yes ✅

Start the servers and login with: `admin` / `admin123`

