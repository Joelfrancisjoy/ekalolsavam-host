# Re-Check Requests Debug Guide

## Issue Analysis

The volunteer dashboard is showing "No re-check requests" because the system requires volunteers to be assigned to events before recheck requests can be created.

## Current System Flow

1. **Student submits recheck request** → System looks for volunteers assigned to that event
2. **If no volunteer assigned** → Request creation fails with "No volunteer is assigned to this event"
3. **If volunteer assigned** → Request is created and assigned to that volunteer
4. **Volunteer dashboard** → Shows requests assigned to the logged-in volunteer

## Debugging Steps

### 1. Check if there are any recheck requests in the database:

```bash
# In Django shell
python manage.py shell

from scores.models import RecheckRequest
print(f"Total recheck requests: {RecheckRequest.objects.count()}")
for req in RecheckRequest.objects.all():
    print(f"Request {req.recheck_request_id}: {req.event_name} - {req.full_name} - Status: {req.status}")
```

### 2. Check volunteer assignments to events:

```bash
# In Django shell
from events.models import Event
from users.models import User

volunteers = User.objects.filter(role='volunteer')
print(f"Total volunteers: {volunteers.count()}")

for volunteer in volunteers:
    events = volunteer.assigned_events.all()
    print(f"Volunteer {volunteer.first_name} {volunteer.last_name}: {events.count()} events")
    for event in events:
        print(f"  - {event.name}")
```

### 3. Check if current user is a volunteer:

```bash
# In Django shell
user = User.objects.get(id=YOUR_USER_ID)  # Replace with actual user ID
print(f"User role: {user.role}")
print(f"Is volunteer: {user.role == 'volunteer'}")
```

## Solutions

### Option 1: Assign Volunteer to Events (Recommended)

```bash
# In Django shell
from events.models import Event
from users.models import User

# Get the volunteer user
volunteer = User.objects.get(email='your-volunteer-email@example.com')

# Get events that need volunteer assignment
events = Event.objects.all()

# Assign volunteer to all events (or specific ones)
for event in events:
    event.volunteers.add(volunteer)
    print(f"Assigned {volunteer.first_name} to {event.name}")
```

### Option 2: Create Test Data

```bash
# In Django shell
from scores.models import Result, RecheckRequest
from users.models import User
from events.models import Event

# Get a student and their result
student = User.objects.filter(role='student').first()
result = Result.objects.filter(participant=student).first()

if result and result.is_recheck_allowed:
    # Get volunteer assigned to this event
    volunteer = result.event.volunteers.first()
    
    if volunteer:
        # Create recheck request manually
        recheck_request = RecheckRequest.objects.create(
            result=result,
            participant=student,
            assigned_volunteer=volunteer,
            status='Pending'
        )
        print(f"Created recheck request: {recheck_request.recheck_request_id}")
    else:
        print("No volunteer assigned to this event")
else:
    print("No eligible results for recheck")
```

## Quick Fix Commands

### Assign current user as volunteer to all events:

```bash
python manage.py shell -c "
from events.models import Event
from users.models import User

# Replace with your actual user email
user = User.objects.get(email='your-email@example.com')
user.role = 'volunteer'
user.save()

for event in Event.objects.all():
    event.volunteers.add(user)
    print(f'Assigned to {event.name}')
"
```

### Create a test recheck request:

```bash
python manage.py shell -c "
from scores.models import Result, RecheckRequest
from users.models import User

# Get first available student result
result = Result.objects.select_related('participant', 'event').first()
if result:
    volunteer = result.event.volunteers.first()
    if volunteer:
        if result.is_recheck_allowed:
            req = RecheckRequest.objects.create(
                result=result,
                participant=result.participant,
                assigned_volunteer=volunteer,
                status='Pending'
            )
            print(f'Created request: {req.recheck_request_id}')
        else:
            print('Recheck not allowed for this result')
    else:
        print('No volunteer assigned to event')
else:
    print('No results found')
"
```

## Expected Behavior After Fix

1. ✅ Student can submit recheck requests successfully
2. ✅ Volunteer dashboard shows pending requests
3. ✅ Volunteer can accept requests
4. ✅ Status updates correctly

## Verification

After applying fixes, verify:

1. **Frontend**: Volunteer dashboard shows requests
2. **API**: `GET /api/scores/volunteer/result-re-evaluation/` returns data
3. **Database**: RecheckRequest objects exist with correct assignments