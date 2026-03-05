# Participant Verification Workflow

## Overview
This document describes the participant verification workflow implemented in the E-Kalolsavam system. The workflow ensures that participants only appear on judge dashboards after they have been verified by volunteers.

## Workflow Steps

### 1. Student Registration
- Students register for events through the student dashboard
- Upon registration, they receive a unique **Chess Number**
- Registration details are stored in the system

### 2. Volunteer Verification
When a student arrives at the event venue:

1. **Student provides Chess Number or QR Code** to the volunteer
2. **Volunteer enters Chess Number** in the verification form
3. System **auto-fills participant details** (name, school, class, etc.)
4. Volunteer **selects the event** from their assigned events
5. Volunteer **clicks "Verify Participant"** to confirm
6. System creates a verification record with status: `verified`

### 3. Active Participant Status
Once verified by the volunteer:
- The participant becomes **"Active"** in the volunteer dashboard
- Participant details are marked with a **"Verified & Active"** badge
- The participant's information is highlighted in green

### 4. Judge Dashboard Display
**Important:** Only verified participants appear on judge dashboards.

- Judges can only see participants who have been verified by volunteers
- Unverified participants remain hidden from judges
- This ensures judges only score participants who are present and verified

## Technical Implementation

### Backend Changes

#### Modified Endpoint: `ParticipantsByEventForJudgeView`
**File:** `backend/events/views.py`

```python
# For judges: Only show verified participants
verified_participant_ids = ParticipantVerification.objects.filter(
    event=event,
    status='verified'
).values_list('participant_id', flat=True).distinct()

queryset = EventRegistration.objects.filter(
    event=event,
    participant_id__in=verified_participant_ids
)
```

**Behavior:**
- **For Judges:** Returns only participants with `status='verified'` in `ParticipantVerification` table
- **For Volunteers:** Returns all registered participants (to allow verification)

### Frontend Changes

#### Volunteer Dashboard
**File:** `frontend/src/pages/VolunteerDashboard.js`

**Features:**
1. **Verification Status Tracking**
   - Maintains a set of verified participant IDs
   - Updates after each verification action

2. **Visual Indicators**
   - Green background for verified participants
   - "Verified & Active" badge
   - Checkmark icon instead of user icon

3. **Participants Tab**
   - Shows all registered participants
   - Highlights verified participants
   - Allows volunteers to track verification status

#### Judge Dashboard
**File:** `frontend/src/pages/JudgeDashboard.js`

**Features:**
1. **Filtered Participant List**
   - Only displays verified participants
   - Shows informational note about verification requirement

2. **Visual Indicators**
   - Green checkmark icon for each participant
   - Chess number displayed for reference

3. **Empty State Message**
   - Informs judges that participants will appear after volunteer verification

## Database Schema

### ParticipantVerification Model
```python
class ParticipantVerification(models.Model):
    event = ForeignKey(Event)
    participant = ForeignKey(User)
    chess_number = CharField(max_length=20)
    volunteer = ForeignKey(User, related_name='verified_participants')
    verification_time = DateTimeField(auto_now_add=True)
    status = CharField(choices=['pending', 'verified', 'rejected'])
    notes = TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ('event', 'participant', 'volunteer')
```

## User Roles and Permissions

### Volunteers
- Can view all registered participants for their assigned events
- Can verify participants by entering chess numbers
- Can see verification status of all participants
- Verification creates a record that enables judge access

### Judges
- Can only view verified participants
- Cannot see unverified participants
- Automatically receive participant details after verification
- Can score only verified participants

### Students
- Register for events and receive chess numbers
- Provide chess number to volunteers for verification
- Become visible to judges only after verification

## Benefits

1. **Attendance Control:** Ensures only present participants are scored
2. **Workflow Integrity:** Clear separation between registration and verification
3. **Real-time Updates:** Judges see participants as they are verified
4. **Audit Trail:** Verification records track who verified whom and when
5. **Prevents Errors:** Judges cannot score absent participants

## API Endpoints

### Verify Participant
**POST** `/api/events/verify-participant/`

**Request Body:**
```json
{
  "chess_number": "00100001",
  "event_id": 1,
  "notes": "Participant verified and ready"
}
```

**Response:**
```json
{
  "id": 1,
  "event": 1,
  "participant": 5,
  "chess_number": "00100001",
  "volunteer": 3,
  "status": "verified",
  "verification_time": "2024-10-23T10:30:00Z",
  "notes": "Participant verified and ready"
}
```

### Get Event Participants (Judge View)
**GET** `/api/events/{event_id}/participants/`

**Behavior:**
- For judges: Returns only verified participants
- For volunteers: Returns all registered participants

## Testing Checklist

- [ ] Student can register for an event and receive chess number
- [ ] Volunteer can see all registered participants
- [ ] Volunteer can verify participant using chess number
- [ ] Verified participant appears in volunteer dashboard with "Active" badge
- [ ] Judge dashboard shows only verified participants
- [ ] Unverified participants do not appear on judge dashboard
- [ ] Judge can score verified participants
- [ ] Verification email is sent to judges (if configured)

## Future Enhancements

1. **QR Code Scanning:** Direct QR code scanning for faster verification
2. **Bulk Verification:** Verify multiple participants at once
3. **Verification History:** Detailed logs of all verification actions
4. **Real-time Notifications:** Push notifications to judges when participants are verified
5. **Verification Analytics:** Dashboard showing verification rates and timing
