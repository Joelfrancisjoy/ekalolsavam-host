# Quick Start Guide - ID Pre-Registration System

## 🚀 Immediate Usage Guide

### For Admins - How to Generate IDs

1. **Login**
   ```
   URL: http://localhost:3000/login
   Username: admin
   Password: AdminPass123
   ```

2. **Navigate to ID Management**
   ```
   Click: Admin Panel → ID Management
   ```

3. **Generate IDs with Names**
   - Select role: `Volunteer` or `Judge`
   - Click `"+ Add Person"`
   - Fill in:
     - **Name**: John Doe
     - **Phone**: 9876543210 (optional)
     - **Notes**: Team A Leader (optional)
   - Click `"Generate IDs"`

4. **Copy and Share IDs**
   - Click `"Copy All IDs"`
   - Send to volunteers/judges via email/WhatsApp

**Example Output:**
```
VOL1234 - John Doe
VOL5678 - Jane Smith
JUD2345 - Dr. Kumar
```

---

### For Volunteers/Judges - How to Register

1. **Get Your ID**
   - Receive ID from admin (e.g., `VOL1234`)

2. **Visit Registration Page**
   ```
   URL: http://localhost:3000/register-with-id
   ```

3. **Enter Your ID**
   - Type: `VOL1234`
   - Click: `"Verify ID"`

4. **Complete Registration**
   - **First Name**: John
   - **Last Name**: Doe (must match assigned name)
   - **Username**: johndoe (unique)
   - **Email**: john.doe@gmail.com
   - **Phone**: 9876543210 (must match if pre-assigned)
   - **Password**: (minimum 8 characters)
   - **Confirm Password**: (same as above)
   - Click: `"Register"`

5. **Wait for Approval**
   - You'll see success message
   - Account is created but inactive
   - You'll receive email when approved

6. **Login After Approval**
   ```
   URL: http://localhost:3000/login
   Username: johndoe
   Password: (your password)
   ```

---

### For Admins - How to Verify Registrations

1. **Check Pending Verifications**
   ```
   Admin Panel → ID Management → Pending Verifications
   ```

2. **Review Details**
   - Name matches assigned name?
   - Email looks legitimate?
   - Phone matches (if set)?

3. **Approve or Reject**
   - Click `"✓ Approve & Activate"` to approve
   - Click `"✕ Reject"` and enter reason to reject

4. **User Notification**
   - User receives email automatically
   - Account activated if approved
   - User can login immediately

---

## 🎯 Quick Examples

### Example 1: Generate 3 Volunteer IDs

**Admin Action:**
1. Go to: Admin Panel → ID Management → Generate IDs
2. Select Role: `Volunteer`
3. Add 3 people:
   - `John Doe`, `9876543210`
   - `Jane Smith`, `9123456789`
   - `Bob Wilson`, `9988776655`
4. Click `"Generate IDs"`

**Result:**
```
VOL1234 - John Doe
VOL5678 - Jane Smith
VOL9012 - Bob Wilson
```

### Example 2: Volunteer Registration

**John Doe's Action:**
1. Visit: `http://localhost:3000/register-with-id`
2. Enter ID: `VOL1234`
3. Click: `Verify ID`
4. Fill form:
   - Name: `John Doe`
   - Username: `johndoe`
   - Email: `john.doe@gmail.com`
   - Phone: `9876543210`
   - Password: `SecurePass123`
5. Submit

**Status:** Account created, pending admin approval

### Example 3: Admin Verification

**Admin Action:**
1. Go to: Pending Verifications
2. See: `John Doe` - `johndoe` - `VOL1234`
3. Verify name matches
4. Click: `"✓ Approve & Activate"`

**Result:** 
- John receives approval email
- John can now login
- VOL1234 marked as verified

---

## ⚡ Common Tasks

### Task: Generate IDs for 10 Volunteers

**Steps:**
1. Prepare Excel/Google Sheets with:
   - Names
   - Phone numbers (optional)
2. Go to ID Management → Generate IDs
3. Select: `Volunteer`
4. For each person:
   - Click `"+ Add Person"`
   - Copy-paste name and phone
5. Click `"Generate IDs"`
6. Click `"Copy All IDs"`
7. Paste into email/document

---

### Task: Bulk Verify Registrations

**Steps:**
1. Go to: Pending Verifications
2. For each request:
   - Check name matches
   - Click `"Approve"`
3. Users receive emails automatically

**Time:** ~30 seconds per verification

---

### Task: Search for a Specific ID

**Steps:**
1. Go to: ID Management → Manage IDs
2. Type ID code in search box (e.g., `VOL1234`)
3. See full details:
   - Assigned name
   - Phone
   - Status (Available/Used/Verified)
   - Who registered (if used)

---

## 🔍 Status Meanings

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| **Available** | ID generated, not used yet | Share with intended person |
| **Pending Verification** | Someone registered, awaiting approval | Review and approve/reject |
| **Verified** | Approved and active | None - user can login |
| **Inactive** | Deactivated by admin | Cannot be used for registration |

---

## ❗ Common Errors & Solutions

### Error: "Invalid ID code"
**Cause:** ID doesn't exist or typo  
**Solution:** 
- Check ID spelling (case-sensitive)
- Verify with admin
- Get a new ID if needed

### Error: "Name mismatch"
**Cause:** Name doesn't match assigned name  
**Solution:**
- Check assigned name with admin
- Use exact name as assigned
- Contact admin if name needs correction

### Error: "This ID has already been used"
**Cause:** ID already used by someone else  
**Solution:**
- Contact admin for new ID
- Verify you have the correct ID

### Error: "Unauthorized Login"
**Cause:** Account not approved yet  
**Solution:**
- Wait for admin approval
- Check email for updates
- Contact admin if delayed >24 hours

---

## 📱 Mobile-Friendly

All features work on mobile devices:
- ✅ ID generation
- ✅ Registration
- ✅ Verification
- ✅ Management dashboard

---

## 🎓 Training Video Script

**For Admins (5 minutes):**
1. Login to admin panel
2. Click ID Management
3. Select volunteer role
4. Add person with name
5. Generate and copy IDs
6. Share IDs
7. Review pending verifications
8. Approve a registration
9. Show verified status

**For Users (3 minutes):**
1. Receive ID from admin
2. Visit registration page
3. Enter ID
4. Fill form
5. Submit
6. Wait for approval email
7. Login after approval

---

## 📊 Expected Timeline

| Step | Time |
|------|------|
| Admin generates IDs | 1 minute per 10 IDs |
| Admin shares IDs | Immediate |
| User registers | 2-3 minutes |
| User waits for approval | Depends on admin |
| Admin verifies | 30 seconds per user |
| User receives email | Immediate |
| User can login | Immediate |

**Total:** ~5 minutes from ID generation to active account

---

## ✅ Pre-Event Checklist

### 1 Week Before Event
- [ ] List all volunteers needed
- [ ] List all judges needed
- [ ] Collect names and phone numbers
- [ ] Generate all IDs
- [ ] Send IDs to volunteers/judges
- [ ] Send registration link

### 3 Days Before Event
- [ ] Check pending verifications
- [ ] Approve legitimate registrations
- [ ] Follow up with people who haven't registered
- [ ] Send reminder emails

### 1 Day Before Event
- [ ] Verify all critical volunteers are approved
- [ ] Verify all judges are approved
- [ ] Check login access for all
- [ ] Prepare support contact for day-of issues

### Event Day
- [ ] Have admin access ready
- [ ] Be available for verification requests
- [ ] Monitor for registration issues
- [ ] Provide helpdesk support

---

## 🎯 Success Tips

### For Admins
1. **Be Organized**
   - Keep spreadsheet of IDs vs names
   - Track distribution status
   - Note special requirements

2. **Communicate Clearly**
   - Include registration link with ID
   - Set expectations for approval time
   - Provide support contact

3. **Verify Promptly**
   - Check verifications daily
   - Approve legitimate requests quickly
   - Communicate rejection reasons

### For Users
1. **Register Early**
   - Don't wait until last minute
   - Allow time for verification
   - Test login before event

2. **Use Correct Info**
   - Match assigned name exactly
   - Use same phone if provided
   - Choose memorable username

3. **Keep Credentials Safe**
   - Remember username and password
   - Don't share with others
   - Contact admin if forgotten

---

## 🆘 Emergency Support

**If system issues occur:**

1. **Check Backend Running**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Check Frontend Running**
   ```bash
   cd frontend
   npm start
   ```

3. **Check Database**
   ```bash
   python manage.py migrate
   ```

4. **View Logs**
   - Check browser console (F12)
   - Check terminal output
   - Check error messages

5. **Contact Support**
   - Provide error message
   - Describe what you were doing
   - Share screenshot if possible

---

## 📞 Quick Reference

**Admin Panel:** `/admin`  
**ID Management:** `/admin/ids`  
**Registration:** `/register-with-id`  
**Login:** `/login`  

**API Endpoints:**
- Generate IDs: `POST /api/auth/admin/ids/generate/`
- Check ID: `POST /api/auth/ids/check/`
- Register: `POST /api/auth/register/with-id/`
- Verify: `PATCH /api/auth/admin/signup-requests/<id>/`

---

**Last Updated:** October 26, 2025  
**Version:** 2.0  
**Status:** Production Ready ✅
