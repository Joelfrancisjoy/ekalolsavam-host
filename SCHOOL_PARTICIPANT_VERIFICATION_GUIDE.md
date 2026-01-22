# School Participant Verification Guide

## Overview
This guide explains the workflow for school participant submissions and how volunteers can verify (accept) them.

## Current Workflow

### 1. School Submits Participants
- Schools submit participant data through their dashboard
- Each participant is created with `verified_by_volunteer = False`
- Status displays as "⏳ Pending" in the school dashboard

### 2. Assignment to Volunteer
- Admin assigns volunteers to schools using `SchoolVolunteerAssignment`
- Submitted participants are visible to the assigned volunteer

### 3. Volunteer Verification (Converting Pending → Accepted)
- Volunteer reviews the submitted participants
- Volunteer verifies the participant details
- Status changes to "✓ Verified" (Accepted)

## Database Schema

### SchoolParticipant Model
```python
class SchoolParticipant(models.Model):
    school = ForeignKey(User)  # The school that submitted
    participant_id = CharField  # School-assigned ID
    first_name = CharField
    last_name = CharField
    student_class = PositiveSmallIntegerField
    events = ManyToManyField(Event)
    submitted_at = DateTimeField
    verified_by_volunteer = BooleanField(default=False)  # This controls status
    verified_at = DateTimeField(null=True)
    volunteer = ForeignKey(User, null=True)  # Volunteer who verified
```

## API Endpoints

### For Volunteers

#### 1. View Pending Participants
```
GET /api/auth/volunteer/school-participants/
```
Returns all participants from assigned schools.

#### 2. Verify Participant (Convert Pending → Accepted)
```
POST /api/auth/volunteer/verify-student/
Content-Type: application/json

{
  "participant_id": "STU123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "message": "Participant verified",
  "participant": {
    "id": 1,
    "participant_id": "STU123",
    "first_name": "John",
    "last_name": "Doe",
    "student_class": 9,
    "verified_by_volunteer": true,
    "verified_at": "2024-01-21T10:30:00Z",
    "school_name": "ABC School"
  }
}
```

### For Schools

#### View Submitted Participants
```
GET /api/auth/schools/participants/
```
Returns all participants submitted by the school with their verification status.

## Frontend Implementation

### School Dashboard
The status is displayed based on `verified_by_volunteer`:

```javascript
<span className={`inline-flex items-center px-4 py-2 text-base font-semibold rounded-full ${
  p.verified_by_volunteer
    ? 'bg-green-100 text-green-800 border-2 border-green-300'
    : 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
}`}>
  {p.verified_by_volunteer ? '✓ Verified' : '⏳ Pending'}
</span>
```

### Volunteer Dashboard - Add Verification Tab

To add a verification interface for volunteers, add this to the VolunteerDashboard:

```javascript
// Add state for school participants
const [schoolParticipants, setSchoolParticipants] = useState([]);
const [isVerifying, setIsVerifying] = useState(false);

// Load school participants
const loadSchoolParticipants = async () => {
  try {
    const response = await http.get('/api/auth/volunteer/school-participants/');
    setSchoolParticipants(response.data);
  } catch (error) {
    console.error('Failed to load school participants:', error);
  }
};

// Verify participant
const handleVerifyParticipant = async (participant) => {
  try {
    setIsVerifying(true);
    await http.post('/api/auth/volunteer/verify-student/', {
      participant_id: participant.participant_id,
      first_name: participant.first_name,
      last_name: participant.last_name
    });
    
    // Refresh the list
    await loadSchoolParticipants();
    setVerificationResult({ message: 'Participant verified successfully!' });
  } catch (error) {
    setError(error.response?.data?.error || 'Failed to verify participant');
  } finally {
    setIsVerifying(false);
  }
};
```

## Quick Implementation Steps

### Step 1: Add Tab to Volunteer Dashboard
Add a new tab called "School Verifications" to the volunteer dashboard navigation.

### Step 2: Create Verification Component
Create a component that displays pending school participants:

```javascript
const SchoolVerificationTab = ({ participants, onVerify, isVerifying }) => {
  const pendingParticipants = participants.filter(p => !p.verified_by_volunteer);
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Pending School Participants</h3>
      
      {pendingParticipants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No pending participants</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingParticipants.map((participant) => (
            <div key={participant.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg">
                    {participant.first_name} {participant.last_name}
                  </h4>
                  <p className="text-gray-600">
                    ID: {participant.participant_id} | Class: {participant.student_class}
                  </p>
                  <p className="text-sm text-gray-500">
                    School: {participant.school_name}
                  </p>
                </div>
                <button
                  onClick={() => onVerify(participant)}
                  disabled={isVerifying}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Accept'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Step 3: Add to Main Dashboard
```javascript
{activeTab === 'school-verification' && (
  <SchoolVerificationTab
    participants={schoolParticipants}
    onVerify={handleVerifyParticipant}
    isVerifying={isVerifying}
  />
)}
```

## Testing the Workflow

### 1. As School:
```bash
# Submit a participant
curl -X POST http://localhost:8000/api/auth/schools/participants/ \
  -H "Authorization: Bearer <school_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id": "STU001",
    "first_name": "John",
    "last_name": "Doe",
    "student_class": 9,
    "events": [1, 2]
  }'
```

### 2. As Volunteer:
```bash
# View pending participants
curl http://localhost:8000/api/auth/volunteer/school-participants/ \
  -H "Authorization: Bearer <volunteer_token>"

# Verify participant
curl -X POST http://localhost:8000/api/auth/volunteer/verify-student/ \
  -H "Authorization: Bearer <volunteer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id": "STU001",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### 3. Verify Status Changed:
```bash
# Check as school - should now show verified
curl http://localhost:8000/api/auth/schools/participants/ \
  -H "Authorization: Bearer <school_token>"
```

## Summary

- **Pending Status**: Automatically set when school submits (`verified_by_volunteer = False`)
- **Where Requests Go**: To the volunteer assigned to that school via `SchoolVolunteerAssignment`
- **How to Accept**: Volunteer calls `/api/auth/volunteer/verify-student/` endpoint
- **Status Change**: `verified_by_volunteer` changes from `False` to `True`
- **Display**: Changes from "⏳ Pending" to "✓ Verified" in school dashboard

The backend logic is already implemented. You just need to add the UI in the volunteer dashboard to display and verify pending participants.
