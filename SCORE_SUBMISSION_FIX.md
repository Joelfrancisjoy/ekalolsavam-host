# Score Submission Issue - Fix Documentation

## Problem Description
The Judge Dashboard was showing "Missing required fields" error when trying to submit scores. This was happening because of a data format mismatch between the frontend and backend.

## Root Cause
**Frontend Format** (what was being sent):
```json
{
  "event": 1,
  "participant": 5,
  "items": [
    {"criteria": "Technical Skill", "score": 18.1, "comments": "..."},
    {"criteria": "Artistic Expression", "score": 18.5, "comments": "..."},
    {"criteria": "Stage Presence", "score": 21.1, "comments": "..."},
    {"criteria": "Overall Impression", "score": 20.7, "comments": "..."}
  ]
}
```

**Backend Expected Format** (what the backend was expecting):
```json
{
  "event": 1,
  "participant": 5,
  "technical_skill": 18.1,
  "artistic_expression": 18.5,
  "stage_presence": 21.1,
  "overall_impression": 20.7,
  "notes": "..."
}
```

The backend's `submit_scores_bundle` view in `backend/scores/views.py` (lines 85-88) validates for specific field names (`technical_skill`, `artistic_expression`, etc.) but the frontend was sending an `items` array instead.

## Solution Implemented
Created an **adapter layer** that bridges the format difference without modifying existing code:

### Files Created/Modified:

1. **Created: `backend/scores/adapters.py`**
   - New adapter view `submit_scores_bundle_adapter()` that:
     - Accepts the frontend's items-based format
     - Transforms it to the backend's expected field-based format
     - Maintains all existing validation and business logic
     - Provides clear error messages

2. **Modified: `backend/scores/urls.py`**
   - Imported the new adapter
   - Routed `/api/scores/submit-bundle/` to use the adapter
   - Kept the original view available at `/api/scores/submit-bundle-original/` for backward compatibility

## How to Apply the Fix

### Step 1: Restart the Django Backend Server
The backend server needs to be restarted to load the new code:

```bash
# Stop the current Django server (Ctrl+C in the terminal where it's running)
# Then restart it:
cd backend
python manage.py runserver
```

### Step 2: Test the Fix
1. Open the browser at `http://localhost:3000/judge`
2. Log in as a judge
3. Select an event and participant
4. Enter scores for all criteria
5. Click "Submit Score"
6. The submission should now work without the "Missing required fields" error

## Alternative Manual Fix (If Needed)

If you prefer to modify the frontend instead, update `frontend/src/services/scoreService.js`:

```javascript
submitBundle: async ({ eventId, participantId, items }) => {
    // Transform items array to individual fields
    const payload = {
        event: eventId,
        participant: participantId,
        notes: items[0]?.comments || '',
    };
    
    items.forEach(item => {
        if (item.criteria === 'Technical Skill') {
            payload.technical_skill = item.score;
        } else if (item.criteria === 'Artistic Expression') {
            payload.artistic_expression = item.score;
        } else if (item.criteria === 'Stage Presence') {
            payload.stage_presence = item.score;
        } else if (item.criteria === 'Overall Impression') {
            payload.overall_impression = item.score;
        }
    });
    
    const res = await api.post('/api/scores/submit-bundle/', payload);
    return res.data;
},
```

## Verification Checklist
- [x] Adapter created without modifying existing code
- [x] URL routing updated to use adapter
- [x] Original endpoint preserved for backward compatibility
- [ ] Backend server restarted (USER ACTION REQUIRED)
- [ ] Score submission tested in browser (USER ACTION REQUIRED)

## Technical Details
- **Location**: `backend/scores/adapters.py`
- **Endpoint**: `POST /api/scores/submit-bundle/`
- **Authentication**: Requires JWT token, judge role
- **Validation**: All four criteria scores must be provided
- **Database**: Uses `update_or_create` for upsert behavior based on (event, participant, judge) unique constraint
