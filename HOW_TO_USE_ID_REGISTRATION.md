# How to Use ID-Based Registration System

**Simple Guide for End Users** 📖

This guide explains how to use the ID-based registration system for E-Kalolsavam. The system allows admins to pre-generate registration IDs for volunteers and judges, who can then use these IDs to register quickly.

---

## 🚀 Before You Start

**Make sure both servers are running:**

### Starting the Backend Server
1. Open a terminal/command prompt
2. Navigate to the backend folder:
   ```
   cd backend
   ```
3. Start the server:
   ```
   python manage.py runserver
   ```
4. You should see: `Starting development server at http://127.0.0.1:8000/`

### Starting the Frontend Server
1. Open a **new** terminal/command prompt (keep the backend running)
2. Navigate to the frontend folder:
   ```
   cd frontend
   ```
3. Start the server:
   ```
   npm start
   ```
4. Your browser should automatically open to `http://localhost:3000`

**✅ Both servers must be running for the system to work!**

---

## 👨‍💼 For Admins: How to Generate Registration IDs

### Step 1: Login to Admin Panel
1. Open your browser and go to: `http://localhost:3000/admin`
2. Login with your admin credentials
3. You'll see the Admin Dashboard

### Step 2: Access ID Management
1. On the Admin Dashboard, look for the **"ID Management"** card
   - It has a 🔑 key icon
   - Description says: "Generate IDs for volunteers and judges"
2. Click on the **"ID Management"** card
3. You'll be taken to the ID Management page

### Step 3: Generate IDs
1. On the ID Management page, you'll see a form to generate new IDs
2. Fill in the required information:
   - **Role**: Select either "Volunteer" or "Judge"
   - **Name**: Enter the person's full name (this will be pre-assigned to the ID)
   - **Phone Number**: Enter the person's phone number (optional but recommended)
   - **Number of IDs**: How many IDs to generate (usually 1)
3. Click the **"Generate IDs"** button
4. The system will create the ID(s) and display them on screen

### Step 4: Share the ID
1. Copy the generated ID (it looks like: `VOL-2024-ABC123` or `JUD-2024-XYZ789`)
2. Share it with the person who needs to register
3. Also share the registration link: `http://localhost:3000/register-with-id`

**💡 Tip:** You can view all generated IDs in the "Issued IDs" section on the same page.

---

## 👤 For Users: How to Register with an ID

### Step 1: Get Your Registration ID
- Your admin should provide you with a registration ID
- It looks like: `VOL-2024-ABC123` (for volunteers) or `JUD-2024-XYZ789` (for judges)

### Step 2: Go to Registration Page
1. Open your browser
2. Go to: `http://localhost:3000/register-with-id`
3. You'll see the ID-based registration page

### Step 3: Verify Your ID
1. Enter your registration ID in the first field
2. Click **"Verify ID"** or **"Next"** button
3. The system will check if your ID is valid

### Step 4: Complete Registration Form
1. After ID verification, you'll see a registration form
2. Fill in all required fields:
   - **Name**: Must match the name assigned to your ID
   - **Email**: Your email address
   - **Phone Number**: Must match the phone number assigned to your ID (if provided)
   - **Password**: Create a secure password
   - **Confirm Password**: Re-enter your password
3. Click **"Register"** or **"Submit"** button

### Step 5: Wait for Approval
1. After submitting, your account will be created but **not active yet**
2. You'll see a message: "Registration submitted for approval"
3. An admin or volunteer will review and approve your registration
4. You'll receive an email when your account is approved
5. After approval, you can login at: `http://localhost:3000/login`

---

## 🔧 Troubleshooting Common Issues

### Problem: "Page Not Found" or blank page

**Solution:**
- Check if the frontend server is running
- Open `http://localhost:3000` in your browser
- If you see the homepage, the frontend is working
- If not, start the frontend server (see "Before You Start" section)

### Problem: "Cannot connect to server" or "Network Error"

**Solution:**
- Check if the backend server is running
- Open `http://localhost:8000/admin` in your browser
- If you see the Django admin page, the backend is working
- If not, start the backend server (see "Before You Start" section)

### Problem: "ID Management" card not showing in Admin Panel

**Solution:**
- Make sure you're logged in as an **admin** user
- Regular users (volunteers, judges, schools) cannot see this option
- Only admin accounts have access to ID Management

### Problem: "Invalid ID" error when trying to register

**Possible causes:**
- The ID was typed incorrectly (check for typos)
- The ID has already been used by someone else
- The ID has expired (if expiration was set)
- Contact your admin to verify the ID

### Problem: Name or phone number doesn't match

**Solution:**
- The name and phone number you enter must **exactly match** what the admin assigned to the ID
- Check with your admin for the correct name/phone number
- Names are case-sensitive (e.g., "John Doe" ≠ "john doe")

### Problem: Registration submitted but no email received

**Solution:**
- Check your spam/junk folder
- The email might take a few minutes to arrive
- Your account is still pending approval - wait for admin to approve
- Contact your admin to check the approval status

---

## 📋 Quick Reference

### Important URLs
- **Admin Panel**: `http://localhost:3000/admin`
- **ID Management**: `http://localhost:3000/admin/ids`
- **Register with ID**: `http://localhost:3000/register-with-id`
- **Login**: `http://localhost:3000/login`

### ID Format
- **Volunteer IDs**: `VOL-2024-XXXXXX`
- **Judge IDs**: `JUD-2024-XXXXXX`

### Registration Status Flow
1. **Pending** → Registration submitted, waiting for approval
2. **Approved** → Account activated, can login
3. **Rejected** → Registration denied (contact admin)

---

## ❓ Need More Help?

### For Technical Issues
- Check that both servers are running (backend and frontend)
- Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)
- Clear your browser cache
- Try a different browser

### For Account Issues
- Contact your system administrator
- Provide your registration ID and email address
- Explain the issue you're experiencing

---

## 📚 Additional Resources

For more technical details (developers and admins):
- **Full System Guide**: `ID_PREREGISTRATION_SYSTEM_GUIDE.md`
- **Quick Start Guide**: `QUICK_START_ID_SYSTEM.md`
- **Implementation Summary**: `ID_PREREGISTRATION_IMPLEMENTATION_SUMMARY.md`

---

**✅ System Status**: Production Ready

**Last Updated**: January 2026

**Support**: Contact your system administrator for assistance
