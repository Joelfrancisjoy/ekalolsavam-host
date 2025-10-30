# School Role & Enhanced Workflow Implementation

## Overview

This document describes the implementation of a new school role and the enhanced workflow for the E-Kalolsavam platform. The new system introduces several improvements:

1. **School Role** - Schools can manage participant data
2. **ID-Based Registration** - Volunteers and judges use admin-issued IDs to sign up
3. **Volunteer Verification** - Volunteers verify student registrations against school-submitted data
4. **School Standings** - Automatic calculation of school rankings based on student points

---

## Key Changes

### 1. New Database Models

#### AdminIssuedID (`workflow_models.py`)
- Stores IDs issued by admins for volunteer and judge registration
- Fields: `id_code`, `role`, `created_by`, `is_used`, `used_at`, `used_by`
- Purpose: Prevents junk users by requiring valid IDs for signup

#### SchoolParticipant (`workflow_models.py`)
- Stores participant data submitted by schools
- Fields: `school`, `participant_id`, `first_name`, `last_name`, `student_class`, `events`
- Fields: `verified_by_volunteer`, `verified_at`, `volunteer`
- Purpose: Provides reference data for volunteer verification

#### SchoolVolunteerAssignment (`workflow_models.py`)
- Links volunteers to schools for participant verification
- Fields: `school`, `volunteer`, `assigned_by`, `assigned_at`, `is_active`
- Purpose: Manages which volunteer handles which school's participants

#### SchoolStanding (`workflow_models.py`)
- Tracks school rankings based on student performance
- Fields: `school`, `total_points`, `total_gold`, `total_silver`, `total_bronze`, `total_participants`
- Purpose: Displays school leaderboard

#### IDSignupRequest (`workflow_models.py`)
- Tracks signup requests from users with admin-issued IDs
- Fields: `issued_id`, `user`, `requested_at`, `status`, `reviewed_by`, `reviewed_at`
- Purpose: Allows admin to review and approve volunteer/judge accounts before activation

### 2. Updated User Model

Added fields to `users/models.py`:
- `contact_email` - Email contact for school users
- `registration_id` - Admin-issued ID used during signup
- `role = 'school'` - New role option

### 3. New API Endpoints

#### Admin Endpoints
- `POST /api/auth/admin/schools/create/` - Create school accounts
- `POST /api/auth/admin/ids/generate/` - Generate IDs for volunteers/judges
- `GET /api/auth/admin/signup-requests/` - List ID signup requests
- `PATCH /api/auth/admin/signup-requests/<id>/` - Approve/reject signup requests
- `POST /api/auth/admin/assign-volunteer/` - Assign volunteers to schools

#### School Endpoints
- `POST /api/auth/schools/participants/submit/` - Submit participant data

#### Volunteer Endpoints
- `GET /api/auth/volunteer/school-participants/` - View assigned school participants
- `POST /api/auth/volunteer/verify-student/` - Verify student against school data

#### Public Endpoints
- `GET /api/auth/standings/` - View school standings
- `POST /api/auth/register/with-id/` - Sign up using admin-issued ID

---

## Workflow Overview

### School Account Creation (Admin)
1. Admin creates school account via dashboard
2. System generates username/password
3. Credentials are emailed to school contact
4. School logs in and can submit participant data

### Volunteer/Judge Registration (ID-Based)
1. Admin generates unique IDs for volunteers/judges
2. IDs are shared with candidates
3. Candidates sign up using the ID at `/register/with-id`
4. Admin reviews and approves/rejects requests
5. Upon approval, accounts are activated

### Participant Data Submission (School)
1. School submits participant details (ID, name, events)
2. Data is stored in `SchoolParticipant` model
3. Assigned volunteer receives notification
4. Volunteer uses this data to verify student registrations

### Student Registration & Verification (Volunteer)
1. Student attempts to register
2. Volunteer checks details against `SchoolParticipant` records
3. If match found, volunteer verifies the student
4. Student account is activated
5. Prevents unauthorized registrations

### School Standings
1. Automatic calculation based on student results
2. Points awarded for gold/silver/bronze
3. Leaderboard displays school rankings
4. Publicly accessible at `/api/auth/standings/`

---

## Installation & Setup

### 1. Database Migrations
```bash
cd backend
python manage.py makemigrations users
python manage.py migrate
```

✅ Already completed - migrations created and applied

### 2. Environment Configuration
No additional environment variables required for basic functionality.

### 3. Admin Dashboard Integration
The admin dashboard needs to be updated to include:
- School account creation interface
- ID generation tool
- Signup request approval interface
- Volunteer-school assignment interface

### 4. Frontend Components Needed

#### Admin Panel
- **School Management**: Create/edit school accounts
- **ID Generator**: Generate IDs for volunteers/judges
- **Signup Requests**: Review and approve ID-based registrations
- **Volunteer Assignment**: Assign volunteers to schools

#### School Dashboard
- **Participant Data Entry**: Form to submit participant details
- **Submitted Participants**: View/edit submitted participant list
- **Event Selection**: Choose events for each participant

#### Volunteer Dashboard
- **School Participants**: View participants from assigned schools
- **Verification Interface**: Verify student registrations
- **Verification History**: Track verified participants

#### Public Pages
- **School Standings**: Display leaderboard
- **ID Signup Form**: Register with admin-issued ID

---

## API Usage Examples

### 1. Create School Account (Admin)
```bash
POST /api/auth/admin/schools/create/
{
  "username": "school_abc",
  "password": "secure123",
  "email": "school@example.com",
  "first_name": "ABC",
  "last_name": "School",
  "school_model_id": 1
}
```

### 2. Generate IDs (Admin)
```bash
POST /api/auth/admin/ids/generate/
{
  "role": "volunteer",
  "count": 10
}
```

### 3. Sign Up with ID (Public)
```bash
POST /api/auth/register/with-id/
{
  "id_code": "V8aBcDeFgH",
  "username": "volunteer1",
  "password": "password123",
  "email": "volunteer@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

### 4. Submit Participants (School)
```bash
POST /api/auth/schools/participants/submit/
{
  "participants": [
    {
      "participant_id": "P001",
      "first_name": "John",
      "last_name": "Smith",
      "student_class": 10,
      "event_ids": [1, 3, 5]
    }
  ]
}
```

### 5. Verify Student (Volunteer)
```bash
POST /api/auth/volunteer/verify-student/
{
  "participant_id": "P001",
  "first_name": "John",
  "last_name": "Smith"
}
```

---

## Security Considerations

1. **ID-Based Registration**: Prevents unauthorized signups
2. **Volunteer Verification**: Ensures only authorized students can register
3. **School Data Validation**: Volunteers cross-check student data
4. **Admin Approval**: All ID-based signups require admin approval
5. **Credentials Email**: School credentials sent securely via email

---

## Benefits

1. **Reduced Admin Workload**: ID-based system filters junk users
2. **Better Data Quality**: Schools provide structured participant data
3. **Improved Verification**: Volunteers verify against official school records
4. **Transparency**: School standings create competitive element
5. **Accountability**: Clear audit trail for all participant data

---

## Migration Notes

- ✅ Database migrations applied
- ✅ Models created and registered in admin
- ✅ API endpoints implemented
- ⏳ Frontend components pending
- ⏳ Admin dashboard updates pending
- ⏳ School dashboard pending
- ⏳ Volunteer dashboard updates pending

---

## Next Steps

1. **Frontend Development**:
   - Create school dashboard for participant data entry
   - Update admin panel with new management tools
   - Update volunteer dashboard with verification interface
   - Create public standings page
   - Create ID signup form for volunteers/judges

2. **Testing**:
   - Test school account creation flow
   - Test ID-based registration
   - Test participant data submission
   - Test volunteer verification
   - Test school standings calculation

3. **Documentation**:
   - Create user guides for schools
   - Create volunteer verification guide
   - Update admin guide

---

## Files Modified/Created

### Backend
- ✅ `backend/users/models.py` - Added school role and fields
- ✅ `backend/users/workflow_models.py` - New workflow models
- ✅ `backend/users/workflow_views.py` - New API endpoints
- ✅ `backend/users/workflow_serializers.py` - Serializers for new models
- ✅ `backend/users/admin.py` - Admin registration for new models
- ✅ `backend/users/urls.py` - URL routing for new endpoints
- ✅ `backend/users/__init__.py` - Model imports

### Database
- ✅ `0010_user_contact_email_user_registration_id_and_more.py` - Migration

---

## Support

For questions or issues:
1. Check this documentation
2. Review the API endpoints in `workflow_views.py`
3. Examine the models in `workflow_models.py`
4. Contact the development team

---

**Status**: ✅ Backend Implementation Complete  
**Date**: 2025-01-XX  
**Version**: 2.0 (Enhanced Workflow)
