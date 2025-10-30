# Database Reset Methods - What Gets Removed

## Method Comparison

### Method 1: `python manage.py flush` ⭐ RECOMMENDED
**What it does:**
- ✅ **KEEPS** all database structure (tables, columns, indexes, relationships)
- ✅ **KEEPS** all migrations (history intact)
- ✅ **REMOVES** all data from all tables
- ✅ **REAPPLIES** initial data from fixtures (if any)

**Effect:**
```
Before: [Tables with data]
After:  [Same tables, EMPTY]
```

**Best for:**
- Quick reset
- Testing with clean data
- Development reset
- Safe operation

---

### Method 2: Drop Database
**What it does:**
- ❌ **REMOVES** everything (tables, data, structure)
- ❌ **REMOVES** database itself
- ✅ Then you recreate from migrations

**Effect:**
```
Before: [Database exists]
After:  [Database deleted]
Then:   [Recreated from migrations]
```

**Best for:**
- Complete fresh start
- When schema has changed significantly
- When you suspect database corruption

---

### Method 3: Drop Migrations + Database
**What it does:**
- ❌ **REMOVES** all migrations
- ❌ **REMOVES** database
- ✅ Creates brand new migrations from scratch
- ✅ Rebuilds database from scratch

**Effect:**
```
Before: [migrations + database]
After:  [nothing]
Then:   [brand new migrations + database]
```

**Best for:**
- Starting completely over
- When migrations are messed up
- Nuclear option

---

## Quick Answer to Your Question

### `flush` - Just the Data Inside Tables ✅
```
Tables:    KEPT ✅
Data:      REMOVED ❌
Structure: KEPT ✅
Migrations: KEPT ✅
```

### Drop Database - Everything Removed ❌
```
Tables:    REMOVED ❌
Data:      REMOVED ❌
Structure: REMOVED ❌
Migrations: KEPT ✅
```

---

## What You Should Use

**For your situation (starting with admin), use `flush`:**

```bash
cd backend
.\kalenv\Scripts\Activate.ps1
python manage.py flush
python manage.py createsuperuser
```

**This will:**
1. Keep all your tables (User, Event, School, etc.)
2. Keep all relationships
3. Remove all existing data
4. Give you a clean slate to create the admin
5. **Not require** re-running migrations

**Result:**
- Admin table exists (empty)
- Can create superuser
- Can start using the system fresh

---

## Visual Example

### Current State:
```
users_user table:
- id=1, username='john', role='student'
- id=2, username='jane', role='judge'

events_event table:
- id=1, name='Music'
- id=2, name='Dance'
```

### After `python manage.py flush`:
```
users_user table:
- (empty - no rows)

events_event table:
- (empty - no rows)
```

But the **structure** remains:
- Tables still exist
- Columns still exist
- Foreign keys still exist
- Indexes still exist

---

## Summary

| Method | Tables | Data | Migrations | Admin Creation |
|--------|--------|------|------------|----------------|
| `flush` | ✅ Kept | ❌ Deleted | ✅ Kept | ✅ Create new |
| Drop DB | ❌ Deleted | ❌ Deleted | ✅ Kept | ✅ Create new |
| Drop Both | ❌ Deleted | ❌ Deleted | ❌ Deleted | ✅ Create new |

**For your case, `flush` is perfect.** It gives you a clean database to create the admin from scratch, while keeping all the structure intact.

