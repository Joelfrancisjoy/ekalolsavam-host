# Migration Guide: Transitioning to New Database Schema

## Overview

This guide outlines the migration from the current Django models to the new MySQL schema structure. The new schema provides better data organization, enhanced scoring capabilities, and improved system structure.

## Key Changes

### 1. User Management Structure

**Before:**
- Single `User` model with role-based fields
- All user types (student, judge, volunteer, admin) in one table

**After:**
- Separate models: `Student`, `Judge`, `Volunteer`, `User`
- Better data separation and normalization
- More specific fields for each user type

### 2. Event Management

**Before:**
- Simple `Event` model with direct user relationships
- Basic event registration system

**After:**
- Enhanced `Event` model with better categorization
- `EventStudent` junction table with `chest_number` system
- Better participant tracking and management

### 3. Scoring System

**Before:**
- Simple `Score` model with single criteria
- Basic result calculation

**After:**
- `Scoreboard` table with multiple criteria (criterion1-4)
- Enhanced `Result` table with grades and points
- Better judge assignment and scoring workflow

## Migration Steps

### Step 1: Database Setup

1. Create the new database using the provided MySQL schema
2. Set up Django to connect to the new database
3. Run migrations to create the new model structure

### Step 2: Model Updates

Replace the current models with the new ones:

```bash
# Backup current models
mv backend/users/models.py backend/users/models_old.py
mv backend/events/models.py backend/events/models_old.py
mv backend/scores/models.py backend/scores/models_old.py

# Replace with new models
mv backend/users/models_new.py backend/users/models.py
mv backend/events/models_new.py backend/events/models.py
mv backend/scores/models_new.py backend/scores/models.py
```

### Step 3: Serializer Updates

Replace current serializers with new ones:

```bash
# Backup current serializers
mv backend/users/serializers.py backend/users/serializers_old.py
mv backend/events/serializers.py backend/events/serializers_old.py
mv backend/scores/serializers.py backend/scores/serializers_old.py

# Replace with new serializers
mv backend/users/serializers_new.py backend/users/serializers.py
mv backend/events/serializers_new.py backend/events/serializers.py
mv backend/scores/serializers_new.py backend/scores/serializers.py
```

### Step 4: View Updates

Replace current views with new ones:

```bash
# Backup current views
mv backend/users/views.py backend/users/views_old.py
mv backend/events/views.py backend/events/views_old.py
mv backend/scores/views.py backend/scores/views_old.py

# Replace with new views
mv backend/users/views_new.py backend/users/views.py
mv backend/events/views_new.py backend/events/views.py
mv backend/scores/views_new.py backend/scores/views.py
```

### Step 5: URL Configuration Updates

Replace current URL configurations:

```bash
# Backup current URLs
mv backend/users/urls.py backend/users/urls_old.py
mv backend/events/urls.py backend/events/urls_old.py
mv backend/scores/urls.py backend/scores/urls_old.py

# Replace with new URLs
mv backend/users/urls_new.py backend/users/urls.py
mv backend/events/urls_new.py backend/events/urls.py
mv backend/scores/urls_new.py backend/scores/urls.py
```

### Step 6: Frontend Service Updates

Update frontend services to work with new API structure:

```bash
# Backup current services
mv frontend/src/services/eventService.js frontend/src/services/eventService_old.js
mv frontend/src/services/scoreService.js frontend/src/services/scoreService_old.js
mv frontend/src/services/userService.js frontend/src/services/userService_old.js

# Replace with new services
mv frontend/src/services/eventServiceNew.js frontend/src/services/eventService.js
mv frontend/src/services/scoreServiceNew.js frontend/src/services/scoreService.js
mv frontend/src/services/userServiceNew.js frontend/src/services/userService.js
```

## New API Endpoints

### Users API
- `GET /api/users/schools/` - List schools
- `GET /api/users/students/` - List students
- `GET /api/users/judges/` - List judges
- `GET /api/users/volunteers/` - List volunteers
- `GET /api/users/allowed-emails/` - List allowed emails

### Events API
- `GET /api/events/` - List events
- `POST /api/events/{id}/register_student/` - Register student for event
- `GET /api/events/{id}/participants/` - Get event participants
- `GET /api/events/venues/` - List venues

### Scores API
- `POST /api/scores/scoreboard/submit_scores/` - Submit scores
- `GET /api/scores/scoreboard/` - List scores
- `POST /api/scores/results/calculate_results/` - Calculate results
- `GET /api/scores/results/` - List results

## Data Migration Considerations

### User Data Migration
- Existing users need to be migrated to appropriate new tables
- Role-based data needs to be split into specific entity tables
- User relationships need to be updated

### Event Data Migration
- Existing events need to be updated with new structure
- Event registrations need to be converted to EventStudent records
- Chest numbers need to be generated for existing registrations

### Score Data Migration
- Existing scores need to be migrated to new Scoreboard structure
- Results need to be recalculated using new scoring system

## Benefits of New Schema

1. **Better Data Organization**: Separate tables for different user types
2. **Enhanced Scoring**: Multiple criteria scoring system
3. **Improved Tracking**: Chest number system for better participant tracking
4. **Better Relationships**: Proper foreign key constraints and relationships
5. **Scalability**: More structured approach for future enhancements

## Testing

After migration:
1. Test all API endpoints
2. Verify data integrity
3. Test frontend functionality
4. Perform end-to-end testing of scoring workflow
5. Test user management features

## Rollback Plan

If issues arise:
1. Restore backup files
2. Revert database changes
3. Restore original configuration
4. Test system functionality

## Support

For any issues during migration:
1. Check Django logs for errors
2. Verify database connections
3. Test API endpoints individually
4. Check frontend console for errors
