# Admin Login Credentials - After Database Flush

## 🔐 Admin Account Details

After fixing the admin redirect issue, use these credentials to login:

### Login Credentials

```
Username: admin
Password: AdminPass123
Email: admin@ekalolsavam.com
```

### Access URLs

- **Frontend Login:** http://localhost:3000/login
- **Admin Panel:** http://localhost:3000/admin (after login)
- **Backend API:** http://localhost:8000/api/auth/login/

---

## ✅ What Was Fixed

1. **Admin Role Field:**
   - Updated `role` field from empty `''` to `'admin'`
   - This ensures proper redirect to `/admin` instead of `/dashboard`

2. **Password Set:**
   - Admin user now has password: `AdminPass123`
   - Can be changed after first login

3. **User Attributes:**
   - ✅ `role = 'admin'`
   - ✅ `is_staff = True`
   - ✅ `is_superuser = True`
   - ✅ `is_active = True`

---

## 🔧 How to Change Password

### Method 1: Django Admin (Recommended)

1. Login to admin panel: http://localhost:3000/admin
2. Navigate to Users section
3. Click on your admin user
4. Click "Change password"
5. Enter new password twice
6. Click "Save"

### Method 2: Command Line

```bash
cd backend
python manage.py changepassword admin
```

### Method 3: Python Script

```bash
cd backend
python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings'); django.setup(); from users.models import User; admin = User.objects.get(username='admin'); admin.set_password('YourNewPassword'); admin.save(); print('Password updated')"
```

---

## 🧪 Testing Login

### Test Standard Login

```bash
cd test-project-app
python test_admin_login2.py
```

**Expected Output:**
```
✅ LOGIN SUCCESSFUL!

User Details:
  Username: admin
  Email: admin@ekalolsavam.com
  Role: admin

Expected Redirect: /admin
Reason: Role is 'admin'

✅ ✅ ✅ SUCCESS! ✅ ✅ ✅
Admin user WILL redirect to /admin panel correctly!
```

### Manual Test

1. Start both servers:
   ```bash
   # Terminal 1
   cd backend
   python manage.py runserver

   # Terminal 2
   cd frontend
   npm start
   ```

2. Open browser: http://localhost:3000/login

3. Enter credentials:
   - Username: `admin`
   - Password: `AdminPass123`

4. Click "Login"

5. Verify redirect to: http://localhost:3000/admin ✅

---

## 🛡️ Security Recommendations

### For Development

The current password (`AdminPass123`) is acceptable for development, but:

1. **Change it if:**
   - You're sharing the codebase
   - Multiple developers have access
   - You're deploying to a test server

2. **Use a stronger password:**
   - At least 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Not a dictionary word

### For Production

**CRITICAL:** Change the password before deploying to production!

```bash
# Use a strong, random password
cd backend
python manage.py changepassword admin
```

**Recommended:**
- Use a password manager to generate strong passwords
- Minimum 16 characters
- Enable 2FA if possible (future enhancement)
- Rotate passwords regularly

---

## 📋 Troubleshooting

### Issue: Login fails with "Invalid credentials"

**Solution:**
1. Verify password is correct
2. Check caps lock
3. Reset password if needed:
   ```bash
   cd backend
   python manage.py changepassword admin
   ```

### Issue: Redirects to /dashboard instead of /admin

**Solution:**
1. Check role field:
   ```bash
   cd backend
   python check_admin.py
   ```
   
2. Run fix command:
   ```bash
   python manage.py fix_admin_roles
   ```

3. Verify role is now 'admin':
   ```bash
   python check_admin.py
   ```

### Issue: "User does not exist"

**Solution:**
1. Check if admin user exists:
   ```bash
   cd backend
   python check_admin.py
   ```

2. If no users found, create one:
   ```bash
   python manage.py createsuperuser
   python manage.py fix_admin_roles
   ```

---

## 🔄 After Future Database Flushes

If you flush the database again:

1. **Create admin user:**
   ```bash
   cd backend
   python manage.py createsuperuser
   ```

2. **Fix role (IMPORTANT!):**
   ```bash
   python manage.py fix_admin_roles
   ```

3. **Verify:**
   ```bash
   python check_admin.py
   ```

4. **Set a password you can remember** or use `AdminPass123` again

---

## 📝 Quick Reference

### Current Setup

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `AdminPass123` |
| Email | `admin@ekalolsavam.com` |
| Role | `admin` |
| Can Login? | ✅ Yes |
| Redirects to? | `/admin` ✅ |
| Access Level | Full Admin |

### Important Commands

| Task | Command |
|------|---------|
| Check admin | `python check_admin.py` |
| Fix roles | `python manage.py fix_admin_roles` |
| Change password | `python manage.py changepassword admin` |
| Test login | `python test_admin_login2.py` |

---

**Created:** October 26, 2025  
**Status:** ✅ Admin login working correctly  
**Redirect:** ✅ Goes to /admin panel
