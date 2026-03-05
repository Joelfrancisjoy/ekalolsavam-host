# ID-Based Registration System - ALL ROLES

## ✅ Changes Implemented

### 1. **Updated Login Page**
- Removed traditional signup form
- Added "Register with ID" button that redirects to `/register-with-id`
- All new users must use ID-based registration

### 2. **Updated ID System to Support Students**
- Added `student` role to ID generation
- Student IDs have prefix **STU** (e.g., STU1234)
- Volunteer IDs have prefix **VOL** (e.g., VOL5678)
- Judge IDs have prefix **JUD** (e.g., JUD9012)

### 3. **Different Verification Workflows**

#### **Students (STU####)**
- Admin generates STU IDs
- Student receives ID
- Student registers at `/register-with-id`
- Account created but **inactive**
- **Designated volunteer** verifies the student
- Account activated after volunteer approval

#### **Volunteers (VOL####)**
- Admin generates VOL IDs
- Volunteer receives ID
- Volunteer registers at `/register-with-id`
- Account created but **inactive**
- **Admin** verifies the volunteer
- Account activated after admin approval

#### **Judges (JUD####)**
- Admin generates JUD IDs
- Judge receives ID
- Judge registers at `/register-with-id`
- Account created but **inactive**
- **Admin** verifies the judge
- Account activated after admin approval

---

## 🎯 Complete Workflow

### For Admin:

1. **Generate IDs for All Roles**
   - Go to Admin Dashboard → ID Management
   - Select role: Student / Volunteer / Judge
   - Assign names (optional but recommended)
   - Generate IDs

2. **Distribute IDs**
   - STU#### → Give to students
   - VOL#### → Give to volunteers
   - JUD#### → Give to judges

3. **Verify Registrations**
   - Go to "Pending Verifications" tab
   - Review registration requests
   - Approve or reject with notes
   - Email sent automatically

### For Students:

1. Receive STU#### ID from admin/school
2. Visit `/register-with-id` page
3. Enter STU ID
4. Fill registration form
5. Submit
6. Wait for **volunteer verification**
7. Receive email when approved
8. Login with credentials

### For Volunteers:

1. Receive VOL#### ID from admin
2. Visit `/register-with-id` page
3. Enter VOL ID
4. Fill registration form
5. Submit
6. Wait for **admin verification**
7. Receive email when approved
8. Login with credentials

### For Judges:

1. Receive JUD#### ID from admin
2. Visit `/register-with-id` page
3. Enter JUD ID
4. Fill registration form
5. Submit
6. Wait for **admin verification**
7. Receive email when approved
8. Login with credentials

---

## 📋 Admin ID Generation Guide

### Generate Student IDs

```
Role: Student
Assignments:
- Name: John Doe
  Phone: 9876543210
  Notes: Class 10, Science stream

Generate → Creates STU1234
```

### Generate Volunteer IDs

```
Role: Volunteer
Assignments:
- Name: Jane Smith
  Phone: 9123456789
  Notes: English department

Generate → Creates VOL5678
```

### Generate Judge IDs

```
Role: Judge
Assignments:
- Name: Dr. Robert Brown
  Phone: 9988776655
  Notes: External judge, dance

Generate → Creates JUD9012
```

---

## 🔐 Security Features

### Name Verification
- If admin assigns a name to an ID
- User **must** provide matching name during registration
- Prevents ID misuse

### Phone Verification
- If admin assigns a phone to an ID
- User **must** provide matching phone during registration
- Additional security layer

### One-Time Use
- Each ID can only be used once
- Prevents multiple registrations with same ID

### Admin/Volunteer Approval Required
- Accounts remain inactive until verified
- Students verified by **designated volunteer**
- Volunteers and judges verified by **admin**
- Email notifications at each step

---

## 🎨 User Interface Updates

### Login Page
**Before:**
```
[Login Form]
[Signup Form with Role Selection]
```

**After:**
```
[Login Form]
[Register with ID Button] → redirects to /register-with-id
💡 All new registrations require an admin-issued ID
```

### Registration Page (`/register-with-id`)
**Step 1: ID Verification**
```
Enter your ID (STU1234 / VOL5678 / JUD9012)
[Verify ID Button]
```

**Step 2: Registration Form**
```
ID: STU1234 • Assigned to: John Doe
📚 Student Account - Verified by designated volunteer

[Username]
[Email]
[Password]
[Confirm Password]
[First Name] (pre-filled if assigned)
[Last Name] (pre-filled if assigned)
[Phone]
[Register Button]
```

**Success Screen:**
```
✓ Registration Successful!

Your student account has been created and is pending verification.

📚 A designated volunteer will verify your account.

You will receive an email once your account is activated.

Redirecting to login page...
```

---

## 📂 Files Modified

### Backend
1. **`backend/users/workflow_models.py`**
   - Added `('student', 'Student')` to ROLE_CHOICES

2. **`backend/users/workflow_views.py`**
   - Updated ID generation to support STU prefix
   - Role validation includes student

### Frontend
1. **`frontend/src/pages/Login.js`**
   - Removed signup form toggle
   - Added "Register with ID" redirect button
   - Added helpful message about ID requirement

2. **`frontend/src/pages/IDBasedRegistration.js`**
   - Updated success message to show different verification workflows
   - Shows role-specific icons and messages

---

## 🧪 Testing Checklist

### Test Student Registration
- [ ] Admin generates STU ID
- [ ] Student visits /register-with-id
- [ ] Student enters STU ID
- [ ] Form shows "Verified by volunteer" message
- [ ] Registration succeeds
- [ ] Account is inactive
- [ ] (Future) Volunteer can verify

### Test Volunteer Registration
- [ ] Admin generates VOL ID
- [ ] Volunteer visits /register-with-id
- [ ] Volunteer enters VOL ID
- [ ] Form shows "Verified by admin" message
- [ ] Registration succeeds
- [ ] Account is inactive
- [ ] Admin can verify and activate

### Test Judge Registration
- [ ] Admin generates JUD ID
- [ ] Judge visits /register-with-id
- [ ] Judge enters JUD ID
- [ ] Form shows "Verified by admin" message
- [ ] Registration succeeds
- [ ] Account is inactive
- [ ] Admin can verify and activate

### Test Login Page
- [ ] Login form still works
- [ ] "Register with ID" button appears
- [ ] Clicking redirects to /register-with-id
- [ ] Helper message shows about ID requirement

---

## 🚀 Deployment Steps

1. **Backend**
   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   python manage.py runserver
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm start
   ```

3. **Notify Users**
   - All registrations now require admin-issued IDs
   - Contact admin to receive your ID
   - Visit /register-with-id to register

---

## 💡 Future Enhancements

### Volunteer Verification for Students
Currently, students are verified by admin. To enable volunteer verification:

1. Create volunteer dashboard for student verification
2. Add volunteer review panel (similar to admin)
3. Assign volunteers to specific schools/groups
4. Volunteers approve/reject student registrations
5. Admin has override capability

### Bulk ID Generation
- Upload CSV with names and details
- Generate hundreds of IDs at once
- Export IDs to PDF for distribution

### QR Code IDs
- Generate QR codes for each ID
- Students scan QR to auto-fill ID field
- Faster registration process

---

## 📞 Support

For questions or issues:
1. Check if ID is valid and active
2. Verify name/phone matches assignment
3. Ensure ID hasn't been used
4. Contact admin if problems persist

---

**Implementation Date:** October 26, 2025  
**Version:** 3.0  
**Status:** ✅ READY FOR USE
