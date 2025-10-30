# Database Reset Guide - Fresh Start

This guide will help you completely reset your database and start from the beginning.

---

## Method 1: Drop and Recreate Database (Recommended)

### Step 1: Drop Existing Database

```bash
cd backend
```

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p
```

Then in MySQL console:
```sql
DROP DATABASE IF EXISTS your_database_name;
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**Option B: Using MySQL Workbench or phpMyAdmin**
- Connect to MySQL
- Drop the existing database
- Create a new database with same name

### Step 2: Activate Virtual Environment

```bash
.\kalenv\Scripts\Activate.ps1
```

### Step 3: Delete Old Migration Files (Keep __init__.py files)

```bash
# Delete migration files but keep __init__.py
Remove-Item -Recurse -Force users\migrations\*.py
New-Item users\migrations\__init__.py -ItemType File

Remove-Item -Recurse -Force events\migrations\*.py
New-Item events\migrations\__init__.py -ItemType File

Remove-Item -Recurse -Force scores\migrations\*.py
New-Item scores\migrations\__init__.py -ItemType File

Remove-Item -Recurse -Force volunteers\migrations\*.py
New-Item volunteers\migrations\__init__.py -ItemType File

Remove-Item -Recurse -Force certificates\migrations\*.py
New-Item certificates\migrations\__init__.py -ItemType File

Remove-Item -Recurse -Force feedback\migrations\*.py
New-Item feedback\migrations\__init__.py -ItemType File

Remove-Item -Recurse -Force notifications\migrations\*.py
New-Item notifications\migrations\__init__.py -ItemType File
```

### Step 4: Delete Migration History Table

```bash
python manage.py dbshell
```

In the MySQL shell:
```sql
DROP TABLE IF EXISTS django_migrations;
EXIT;
```

### Step 5: Create Fresh Migrations

```bash
python manage.py makemigrations
```

### Step 6: Apply Migrations

```bash
python manage.py migrate
```

### Step 7: Create Admin User

```bash
python manage.py createsuperuser
```

**Follow the prompts:**
- Username: admin (or your choice)
- Email: your-email@example.com
- Password: (enter a strong password)

### Step 8: Verify

```bash
python manage.py runserver 8000
```

Test at: http://localhost:8000/admin

---

## Method 2: Quick Reset with Flush (Faster but keeps migrations)

### Step 1: Activate Virtual Environment

```bash
cd backend
.\kalenv\Scripts\Activate.ps1
```

### Step 2: Flush Database (Delete all data, keep structure)

```bash
python manage.py flush
```

When prompted, type `yes` and press Enter.

### Step 3: Create Admin User

```bash
python manage.py createsuperuser
```

**Follow the prompts:**
- Username: admin (or your choice)
- Email: your-email@example.com
- Password: (enter a strong password)

---

## Method 3: Complete Fresh Start (Nuclear Option)

### Step 1: Backup Important Data (if needed)

```bash
# Optional: Export data before deleting
python manage.py dumpdata > backup.json
```

### Step 2: Delete Database and Migrations

```bash
cd backend
.\kalenv\Scripts\Activate.ps1

# Delete all migration files except __init__.py
Get-ChildItem -Recurse -Include 0*.py | Where-Object { $_.DirectoryName -like "*\migrations" } | Remove-Item

# Drop database (connect to MySQL and drop it)
```

### Step 3: Create Fresh Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 4: Create Admin

```bash
python manage.py createsuperuser
```

---

## After Reset - First Time Setup

### 1. Create Superuser
```bash
python manage.py createsuperuser
```

### 2. Login to Admin
- Go to: http://localhost:8000/admin
- Login with your superuser credentials

### 3. Create First School Account
- Navigate to admin panel
- Go to "Users" → Create a new user
- Set role to "school"
- Set all required fields

### 4. Test the Workflow
1. Login as admin → http://localhost:3000/admin
2. Create school accounts
3. Generate IDs for volunteers
4. Test the workflow

---

## Recommended Approach

**For a completely fresh start, use Method 2 (Flush):**

```bash
# 1. Activate environment
cd backend
.\kalenv\Scripts\Activate.ps1

# 2. Flush database
python manage.py flush

# 3. Create admin user
python manage.py createsuperuser

# 4. Start server
python manage.py runserver 8000
```

This is the **safest and fastest** method that:
- ✅ Keeps all your migrations
- ✅ Keeps your database structure
- ✅ Removes all data
- ✅ Quick to run
- ✅ No risk of breaking things

---

## Troubleshooting

### Error: "Can't connect to MySQL"

**Check your .env file:**
```bash
# backend/.env
DATABASE_NAME=your_database_name
DATABASE_USER=your_mysql_user
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=3306
```

### Error: "Table doesn't exist"

**Solution:** Run migrations again
```bash
python manage.py migrate
```

### Error: "No such database"

**Solution:** Create the database first
```bash
mysql -u root -p
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

## Quick Command Reference

```bash
# Activate environment
cd backend
.\kalenv\Scripts\Activate.ps1

# Reset database (keep structure)
python manage.py flush

# Create admin
python manage.py createsuperuser

# Start server
python manage.py runserver 8000

# Check database
python manage.py dbshell
```

---

## Alternative: Create Fresh Superuser Only

If you just want to create a new admin user **without** deleting data:

```bash
cd backend
.\kalenv\Scripts\Activate.ps1
python manage.py createsuperuser
```

---

**Recommendation:** Use **Method 2 (Flush)** for the cleanest, safest reset.

