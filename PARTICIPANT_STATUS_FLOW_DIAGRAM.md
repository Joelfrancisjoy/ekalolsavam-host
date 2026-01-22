# Participant Status Flow Diagram

## Complete Workflow Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCHOOL DASHBOARD                                 │
│                                                                          │
│  1. School submits participant data                                     │
│     ┌──────────────────────────────────────────────────┐               │
│     │ Participant Entry Form                            │               │
│     │ - Participant ID: STU001                          │               │
│     │ - Name: John Doe                                  │               │
│     │ - Class: 9                                        │               │
│     │ - Events: [Event1, Event2]                       │               │
│     └──────────────────────────────────────────────────┘               │
│                           │                                              │
│                           │ [Submit]                                     │
│                           ▼                                              │
│     ┌──────────────────────────────────────────────────┐               │
│     │ DATABASE: SchoolParticipant Created               │               │
│     │ - verified_by_volunteer = FALSE                   │               │
│     │ - verified_at = NULL                              │               │
│     │ - volunteer = NULL                                │               │
│     └──────────────────────────────────────────────────┘               │
│                           │                                              │
│                           ▼                                              │
│     ┌──────────────────────────────────────────────────┐               │
│     │ Submitted Participants Table                      │               │
│     │ ┌────────┬──────────┬────────┬──────────────┐   │               │
│     │ │ ID     │ Name     │ Class  │ Status       │   │               │
│     │ ├────────┼──────────┼────────┼──────────────┤   │               │
│     │ │ STU001 │ John Doe │ 9      │ ⏳ Pending   │   │               │
│     │ └────────┴──────────┴────────┴──────────────┘   │               │
│     └──────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           │ Participant data sent to
                           │ assigned volunteer via
                           │ SchoolVolunteerAssignment
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       VOLUNTEER DASHBOARD                                │
│                                                                          │
│  2. Volunteer reviews pending participants                              │
│     ┌──────────────────────────────────────────────────┐               │
│     │ School Verifications Tab                          │               │
│     │                                                    │               │
│     │ Pending Verification (1)                          │               │
│     │ ┌────────────────────────────────────────────┐   │               │
│     │ │ 👤 John Doe                                │   │               │
│     │ │ ID: STU001 | Class: 9                      │   │               │
│     │ │ School: ABC School                         │   │               │
│     │ │ Submitted: 2024-01-21                      │   │               │
│     │ │                                            │   │               │
│     │ │         [Verify & Accept] ◄────────────────┼───┼─── Click here!
│     │ └────────────────────────────────────────────┘   │               │
│     └──────────────────────────────────────────────────┘               │
│                           │                                              │
│                           │ POST /api/auth/volunteer/verify-student/    │
│                           │ {                                            │
│                           │   "participant_id": "STU001",                │
│                           │   "first_name": "John",                      │
│                           │   "last_name": "Doe"                         │
│                           │ }                                            │
│                           ▼                                              │
│     ┌──────────────────────────────────────────────────┐               │
│     │ DATABASE: SchoolParticipant Updated               │               │
│     │ - verified_by_volunteer = TRUE ✓                  │               │
│     │ - verified_at = 2024-01-21 10:30:00              │               │
│     │ - volunteer = volunteer_user_id                   │               │
│     └──────────────────────────────────────────────────┘               │
│                           │                                              │
│                           ▼                                              │
│     ┌──────────────────────────────────────────────────┐               │
│     │ Verified Participants Table                       │               │
│     │ ┌────────┬──────────┬────────┬──────────────┐   │               │
│     │ │ ID     │ Name     │ Class  │ Status       │   │               │
│     │ ├────────┼──────────┼────────┼──────────────┤   │               │
│     │ │ STU001 │ John Doe │ 9      │ ✓ Verified   │   │               │
│     │ └────────┴──────────┴────────┴──────────────┘   │               │
│     └──────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           │ Status update reflected back
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCHOOL DASHBOARD                                 │
│                                                                          │
│  3. School sees updated status                                          │
│     ┌──────────────────────────────────────────────────┐               │
│     │ Submitted Participants Table                      │               │
│     │ ┌────────┬──────────┬────────┬──────────────┐   │               │
│     │ │ ID     │ Name     │ Class  │ Status       │   │               │
│     │ ├────────┼──────────┼────────┼──────────────┤   │               │
│     │ │ STU001 │ John Doe │ 9      │ ✓ Verified   │   │  ◄─── Changed!
│     │ └────────┴──────────┴────────┴──────────────┘   │               │
│     └──────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Status Determination Logic

```javascript
// In School Dashboard (frontend/src/pages/SchoolDashboard.js)

const getStatusDisplay = (participant) => {
  if (participant.verified_by_volunteer === true) {
    return {
      text: '✓ Verified',
      className: 'bg-green-100 text-green-800 border-2 border-green-300'
    };
  } else {
    return {
      text: '⏳ Pending',
      className: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
    };
  }
};
```

## Database State Changes

### Initial State (After School Submission)
```sql
SchoolParticipant {
  id: 1,
  school_id: 5,
  participant_id: "STU001",
  first_name: "John",
  last_name: "Doe",
  student_class: 9,
  verified_by_volunteer: FALSE,  ◄─── Pending
  verified_at: NULL,
  volunteer_id: NULL,
  submitted_at: "2024-01-21 09:00:00"
}
```

### After Volunteer Verification
```sql
SchoolParticipant {
  id: 1,
  school_id: 5,
  participant_id: "STU001",
  first_name: "John",
  last_name: "Doe",
  student_class: 9,
  verified_by_volunteer: TRUE,   ◄─── Verified/Accepted
  verified_at: "2024-01-21 10:30:00",  ◄─── Timestamp added
  volunteer_id: 8,  ◄─── Volunteer who verified
  submitted_at: "2024-01-21 09:00:00"
}
```

## API Call Sequence

### 1. School Submits Participant
```http
POST /api/auth/schools/participants/
Authorization: Bearer <school_token>
Content-Type: application/json

{
  "participant_id": "STU001",
  "first_name": "John",
  "last_name": "Doe",
  "student_class": 9,
  "events": [1, 2]
}

Response: 201 Created
{
  "id": 1,
  "participant_id": "STU001",
  "first_name": "John",
  "last_name": "Doe",
  "student_class": 9,
  "verified_by_volunteer": false,
  "verified_at": null,
  "submitted_at": "2024-01-21T09:00:00Z"
}
```

### 2. Volunteer Views Pending Participants
```http
GET /api/auth/volunteer/school-participants/
Authorization: Bearer <volunteer_token>

Response: 200 OK
[
  {
    "id": 1,
    "participant_id": "STU001",
    "first_name": "John",
    "last_name": "Doe",
    "student_class": 9,
    "verified_by_volunteer": false,
    "verified_at": null,
    "school_name": "ABC School",
    "submitted_at": "2024-01-21T09:00:00Z"
  }
]
```

### 3. Volunteer Verifies Participant
```http
POST /api/auth/volunteer/verify-student/
Authorization: Bearer <volunteer_token>
Content-Type: application/json

{
  "participant_id": "STU001",
  "first_name": "John",
  "last_name": "Doe"
}

Response: 200 OK
{
  "message": "Participant verified",
  "participant": {
    "id": 1,
    "participant_id": "STU001",
    "first_name": "John",
    "last_name": "Doe",
    "student_class": 9,
    "verified_by_volunteer": true,  ◄─── Changed!
    "verified_at": "2024-01-21T10:30:00Z",  ◄─── Added!
    "volunteer": 8,  ◄─── Added!
    "school_name": "ABC School",
    "submitted_at": "2024-01-21T09:00:00Z"
  }
}
```

### 4. School Refreshes and Sees Updated Status
```http
GET /api/auth/schools/participants/
Authorization: Bearer <school_token>

Response: 200 OK
[
  {
    "id": 1,
    "participant_id": "STU001",
    "first_name": "John",
    "last_name": "Doe",
    "student_class": 9,
    "verified_by_volunteer": true,  ◄─── Now true!
    "verified_at": "2024-01-21T10:30:00Z",
    "submitted_at": "2024-01-21T09:00:00Z"
  }
]
```

## Key Points

1. **Status is NOT a separate field** - it's derived from `verified_by_volunteer` boolean
2. **"Pending" = `verified_by_volunteer: false`**
3. **"Verified/Accepted" = `verified_by_volunteer: true`**
4. **Volunteer assignment** is managed through `SchoolVolunteerAssignment` table
5. **Backend logic is complete** - only UI needs to be added to volunteer dashboard
6. **Real-time updates** - school sees status change immediately after volunteer verifies

## Quick Test

```bash
# 1. Login as school and submit participant
# 2. Check status - should show "Pending"
# 3. Login as volunteer
# 4. Call verify endpoint
# 5. Login as school again
# 6. Check status - should now show "Verified"
```
