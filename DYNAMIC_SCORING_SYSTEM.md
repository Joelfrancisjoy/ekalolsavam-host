# Dynamic Event-Specific Scoring System

## Overview
The E-Kalolsavam platform now features a **dynamic, event-specific scoring system** that allows different events across various categories (Theatre, Visual Arts, Music, Literary, Dance) to have their own customized scoring criteria while maintaining a consistent 100-point total score structure.

## Key Features

### ✅ Event-Specific Criteria
- Each event has **4 unique evaluation parameters**
- Each criterion is worth **25 points** (total: 100 points)
- Criteria automatically load based on the selected event
- Judges see relevant criteria for each specific event

### ✅ Automated Final Score Calculation
- System collects scores from **5 judges**
- Automatically **drops highest and lowest** scores
- Calculates **average of remaining 3 scores**
- Formula: `Final Score = (S2 + S3 + S4) / 3` where S1...S5 are sorted totals

### ✅ Real-Time Results Display
- Live results section on Judge Dashboard
- Shows participant details, judge submissions, and final scores
- Visual indicators for completion status
- Transparent display of scoring progress

### ✅ Backward Compatibility
- Existing scores remain intact
- Legacy scoring format still supported
- Smooth migration path for existing data

## Scoring Criteria by Category

### 🎭 Theatre Category

#### Mime
1. **Technical Skill** (25 points)
2. **Artistic Expression** (25 points)
3. **Stage Presence** (25 points)
4. **Overall Impression** (25 points)

#### Skit
1. **Acting Skill** (25 points)
2. **Script & Dialogue Delivery** (25 points)
3. **Team Coordination** (25 points)
4. **Audience Impact** (25 points)

#### Monoact
1. **Character Portrayal** (25 points)
2. **Dialogue Delivery** (25 points)
3. **Emotional Expression** (25 points)
4. **Stage Presence** (25 points)

### 🎨 Visual Arts Category

#### Painting - Oil Colour
1. **Composition & Layout** (25 points)
2. **Colour Harmony & Blending** (25 points)
3. **Creativity & Originality** (25 points)
4. **Technique & Detailing** (25 points)

#### Pencil Sketching
1. **Line Quality & Shading** (25 points)
2. **Proportion & Perspective** (25 points)
3. **Creativity** (25 points)
4. **Presentation & Neatness** (25 points)

#### Cartooning
1. **Concept Clarity** (25 points)
2. **Humor & Expression** (25 points)
3. **Line Precision** (25 points)
4. **Creativity & Style** (25 points)

#### Poster Making
1. **Message Clarity** (25 points)
2. **Visual Impact** (25 points)
3. **Colour Usage** (25 points)
4. **Creativity & Design** (25 points)

### 🎵 Music Category

#### Light Music
1. **Voice Quality** (25 points)
2. **Pitch & Rhythm Accuracy** (25 points)
3. **Expression & Feel** (25 points)
4. **Song Selection & Presentation** (25 points)

#### Violin (Instrumental)
1. **Technical Proficiency** (25 points)
2. **Bowing & Fingering Accuracy** (25 points)
3. **Rhythm & Tempo Control** (25 points)
4. **Musical Interpretation** (25 points)

#### Western Solo
1. **Stage Presence** (25 points)
2. **Musical Expression** (25 points)
3. **Dynamics & Tone** (25 points)
4. **Technical Control** (25 points)

#### Classical Music
1. **Raga & Alapana** (25 points)
2. **Voice Quality** (25 points)
3. **Rhythm & Tala** (25 points)
4. **Presentation** (25 points)

### 🗣️ Literary Category

#### Essay Writing (English/Hindi/Malayalam)
1. **Content Relevance** (25 points)
2. **Creativity & Original Thought** (25 points)
3. **Structure & Coherence** (25 points)
4. **Language & Grammar** (25 points)

*Note: Each language variant maintains separate database entries but uses the same criteria.*

#### Poetry Recitation (English/Hindi/Malayalam)
1. **Voice Modulation** (25 points)
2. **Clarity of Speech** (25 points)
3. **Emotional Expression** (25 points)
4. **Overall Presentation** (25 points)

#### Debate
1. **Clarity of Argument** (25 points)
2. **Relevance of Points** (25 points)
3. **Presentation & Confidence** (25 points)
4. **Rebuttal Strength** (25 points)

#### Story Writing
1. **Plot & Creativity** (25 points)
2. **Character Development** (25 points)
3. **Language & Style** (25 points)
4. **Structure & Flow** (25 points)

### 💃 Dance Category

#### Classical Dance
1. **Technique & Posture** (25 points)
2. **Rhythm & Synchronization** (25 points)
3. **Expression** (25 points)
4. **Costume & Presentation** (25 points)

#### Western Dance
1. **Energy & Creativity** (25 points)
2. **Synchronization** (25 points)
3. **Choreography** (25 points)
4. **Stage Impact** (25 points)

#### Folk Dance
1. **Traditional Authenticity** (25 points)
2. **Group Coordination** (25 points)
3. **Costume & Props** (25 points)
4. **Energy & Presentation** (25 points)

#### Group Dance
1. **Choreography** (25 points)
2. **Synchronization** (25 points)
3. **Formations** (25 points)
4. **Overall Impact** (25 points)

## Technical Implementation

### Backend Architecture

#### 1. Scoring Criteria Configuration (`backend/scores/scoring_criteria.py`)
```python
# Centralized configuration for all event criteria
SCORING_CRITERIA = {
    'theatre': THEATRE_CRITERIA,
    'visual_arts': VISUAL_ARTS_CRITERIA,
    'music': MUSIC_CRITERIA,
    'literary': LITERARY_CRITERIA,
    'dance': DANCE_CRITERIA,
}

def get_criteria_for_event(event_name, category):
    """Dynamically retrieve criteria based on event and category"""
```

#### 2. Enhanced Score Model (`backend/scores/models.py`)
```python
class Score(models.Model):
    # Legacy fields (backward compatible)
    technical_skill = models.DecimalField(null=True, blank=True)
    artistic_expression = models.DecimalField(null=True, blank=True)
    stage_presence = models.DecimalField(null=True, blank=True)
    overall_impression = models.DecimalField(null=True, blank=True)
    
    # New dynamic criteria field
    criteria_scores = models.JSONField(default=dict, blank=True)
    
    # Auto-calculated total
    total_score = models.DecimalField(editable=False)
```

**Key Features:**
- JSONField stores dynamic criteria scores
- Automatic total calculation in `save()` method
- Backward compatibility with legacy fields
- Flexible structure for any event type

#### 3. API Endpoints

**Get Event Criteria**
```
GET /api/scores/event-criteria/?event=<event_id>

Response:
{
  "event_id": 1,
  "event_name": "Mime",
  "category": "theatre",
  "criteria": [
    {"id": "technical_skill", "label": "Technical Skill", "max": 25},
    {"id": "artistic_expression", "label": "Artistic Expression", "max": 25},
    {"id": "stage_presence", "label": "Stage Presence", "max": 25},
    {"id": "overall_impression", "label": "Overall Impression", "max": 25}
  ]
}
```

**Submit Scores (New Format)**
```
POST /api/scores/submit-bundle/

Request:
{
  "eventId": 1,
  "participantId": 5,
  "items": [
    {"criteria": "Technical Skill", "score": 22.5, "comments": "Excellent"},
    {"criteria": "Artistic Expression", "score": 20.0, "comments": "Good"},
    {"criteria": "Stage Presence", "score": 23.5, "comments": "Outstanding"},
    {"criteria": "Overall Impression", "score": 21.0, "comments": "Very good"}
  ]
}

Response:
{
  "status": "ok",
  "created": true,
  "score": { ... }
}
```

**Get Scores Summary**
```
GET /api/scores/summary/?event=<event_id>

Response:
{
  "results": [
    {
      "participant": 5,
      "my_scores_total": 87.0,
      "judges_submitted": 5,
      "judges_totals": [85.0, 87.0, 88.5, 90.0, 92.5],
      "current_final": 88.5
    }
  ]
}
```

### Frontend Implementation

#### 1. Dynamic Criteria Loading
```javascript
useEffect(() => {
  const loadEventData = async () => {
    if (!selectedEventId) return;
    
    // Load event-specific criteria
    const criteriaData = await scoreService.getEventCriteria(selectedEventId);
    setCriteria(criteriaData.criteria);
  };
  loadEventData();
}, [selectedEventId]);
```

#### 2. Scoring Interface
- **Sliders** for intuitive score input (0-25)
- **Percentage buttons** for quick scoring (25%, 50%, 75%, 100%)
- **Number input** for precise values
- **Real-time total** calculation display
- **Notes field** for judge comments

#### 3. Results Display
```javascript
// Automatic calculation of final score
const computeFinalFromJudges = (totals = []) => {
  if (!totals || totals.length < 5) return null;
  const sorted = [...totals].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1); // Drop highest and lowest
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  return Math.round(avg * 100) / 100;
};
```

## Score Calculation Logic

### Step-by-Step Process

1. **Individual Judge Scoring**
   - Judge scores 4 criteria (each 0-25 points)
   - System calculates total: `Total = C1 + C2 + C3 + C4` (max 100)
   - Score saved to database

2. **Collection Phase**
   - System collects scores from all 5 judges
   - Each judge sees their own submission
   - Real-time counter shows progress (e.g., "3 / 5 judges submitted")

3. **Final Calculation (After 5 Judges)**
   - Sort all 5 totals: `[85, 87, 88.5, 90, 92.5]`
   - Drop lowest (85) and highest (92.5)
   - Remaining scores: `[87, 88.5, 90]`
   - Calculate average: `(87 + 88.5 + 90) / 3 = 88.5`
   - **Final Score: 88.5**

4. **Results Display**
   - Participant name and details
   - Number of judges submitted
   - Each judge's individual total
   - Final calculated score
   - Completion status indicator

### Example Calculation

**Event:** Mime (Theatre)  
**Participant:** John Doe

| Judge | Technical Skill | Artistic Expression | Stage Presence | Overall Impression | **Total** |
|-------|----------------|---------------------|----------------|-------------------|-----------|
| Judge 1 | 22.0 | 20.5 | 21.0 | 21.5 | **85.0** ⬇️ (Dropped) |
| Judge 2 | 23.0 | 21.0 | 22.0 | 21.0 | **87.0** ✅ |
| Judge 3 | 22.5 | 22.0 | 22.5 | 21.5 | **88.5** ✅ |
| Judge 4 | 23.5 | 22.5 | 23.0 | 21.0 | **90.0** ✅ |
| Judge 5 | 24.0 | 23.5 | 23.5 | 21.5 | **92.5** ⬆️ (Dropped) |

**Final Score:** `(87.0 + 88.5 + 90.0) / 3 = 88.5`

## Adding New Events

To add a new event with custom criteria:

### 1. Update Scoring Criteria Configuration

Edit `backend/scores/scoring_criteria.py`:

```python
# Add to appropriate category dictionary
THEATRE_CRITERIA = {
    # ... existing events ...
    'New Event Name': [
        {'id': 'criterion1_id', 'label': 'Criterion 1 Label', 'max': 25},
        {'id': 'criterion2_id', 'label': 'Criterion 2 Label', 'max': 25},
        {'id': 'criterion3_id', 'label': 'Criterion 3 Label', 'max': 25},
        {'id': 'criterion4_id', 'label': 'Criterion 4 Label', 'max': 25},
    ],
}
```

### 2. Create Event in Admin Panel

1. Navigate to Admin Panel → Events
2. Create new event with:
   - **Name:** Must match the key in scoring_criteria.py
   - **Category:** Select appropriate category
   - **Other details:** Date, venue, judges, etc.

### 3. System Automatically Handles

- ✅ Criteria loading for judges
- ✅ Score submission with new criteria
- ✅ Total calculation
- ✅ Final score computation
- ✅ Results display

**No code changes needed in frontend or other backend files!**

## Migration Guide

### For Existing Installations

1. **Backup Database**
   ```bash
   python manage.py dumpdata scores > scores_backup.json
   ```

2. **Run Migrations**
   ```bash
   python manage.py migrate scores
   ```

3. **Verify Migration**
   - Existing scores remain intact
   - Legacy fields preserved
   - New `criteria_scores` field added

4. **Test Scoring**
   - Create test event
   - Submit scores as judge
   - Verify criteria load correctly
   - Check results calculation

### Data Migration (Optional)

To migrate existing legacy scores to new format:

```python
# Migration script (if needed)
from scores.models import Score
from scores.scoring_criteria import get_criteria_for_event

for score in Score.objects.filter(criteria_scores={}):
    # Convert legacy fields to criteria_scores
    score.criteria_scores = {
        'technical_skill': float(score.technical_skill or 0),
        'artistic_expression': float(score.artistic_expression or 0),
        'stage_presence': float(score.stage_presence or 0),
        'overall_impression': float(score.overall_impression or 0),
    }
    score.save()
```

## User Interface Features

### Judge Dashboard Enhancements

1. **Event Selection**
   - Dropdown shows assigned events
   - Criteria automatically update on selection

2. **Scoring Interface**
   - Dynamic criteria labels based on event
   - Slider controls (0-25)
   - Quick percentage buttons
   - Precise number input
   - Real-time total display

3. **Participant Selection**
   - Only verified participants shown
   - Chess number display
   - Easy navigation between participants

4. **Results Section**
   - Comprehensive table view
   - Participant details
   - Judge submission count
   - Individual judge scores
   - Final calculated score
   - Visual status indicators
   - Completion badges

5. **Live Updates**
   - Real-time score summary
   - Judge panel progress
   - Current final score (if 5+ judges)

## Security & Validation

### Backend Validation
- ✅ Only judges can submit scores
- ✅ Score range validation (0-25 per criterion)
- ✅ Event and participant existence checks
- ✅ Duplicate submission prevention (upsert logic)
- ✅ Atomic database transactions

### Frontend Validation
- ✅ Input range constraints
- ✅ Required field checks
- ✅ Real-time total calculation
- ✅ Submission confirmation
- ✅ Error handling and display

## Performance Considerations

### Optimizations
- **Database Indexing:** Unique together constraints on (event, participant, judge)
- **Query Optimization:** Select_related for participant and judge data
- **Caching:** Event criteria cached on frontend after first load
- **Lazy Loading:** Results load only when needed
- **Efficient Calculations:** Server-side total computation

### Scalability
- **JSONField:** Flexible storage for any number of criteria
- **Modular Design:** Easy to add new events/categories
- **API Efficiency:** Single endpoint for criteria retrieval
- **Frontend Performance:** React state management for smooth UX

## Troubleshooting

### Common Issues

**Issue:** Criteria not loading for new event  
**Solution:** Ensure event name in database exactly matches key in `scoring_criteria.py`

**Issue:** Final score not calculating  
**Solution:** Verify all 5 judges have submitted scores

**Issue:** Legacy scores not displaying  
**Solution:** System automatically falls back to legacy fields if `criteria_scores` is empty

**Issue:** Migration errors  
**Solution:** Ensure database backup exists, check migration logs, rollback if needed

## Future Enhancements

### Planned Features
- 🔄 Real-time score synchronization across judge devices
- 📊 Advanced analytics and score distribution graphs
- 📱 Mobile-optimized scoring interface
- 🔔 Push notifications when all judges submit
- 📄 PDF export of results with detailed breakdowns
- 🎯 Customizable scoring weights per criterion
- 🏆 Automatic ranking and leaderboard generation
- 📧 Automated result notifications to participants

## Support & Maintenance

### Configuration Files
- **Criteria:** `backend/scores/scoring_criteria.py`
- **Models:** `backend/scores/models.py`
- **Views:** `backend/scores/views.py`
- **Frontend:** `frontend/src/pages/JudgeDashboard.js`

### Key Functions
- `get_criteria_for_event()` - Retrieve event criteria
- `submit_scores_bundle()` - Handle score submissions
- `scores_summary()` - Calculate and return results
- `computeFinalFromJudges()` - Frontend final score calculation

### Testing Checklist
- [ ] Create events in all categories
- [ ] Verify criteria load correctly
- [ ] Submit scores from 5 judges
- [ ] Check final score calculation
- [ ] Verify results display
- [ ] Test with legacy data
- [ ] Check backward compatibility
- [ ] Validate error handling

## Conclusion

The Dynamic Event-Specific Scoring System provides a **robust, flexible, and scalable** solution for managing diverse event types with customized evaluation criteria. The system maintains **backward compatibility** while offering **powerful new features** for comprehensive event scoring and results management.

**Key Benefits:**
- ✅ Customized criteria per event
- ✅ Automated fair scoring (drop extremes)
- ✅ Real-time results
- ✅ Easy to extend
- ✅ Professional UI/UX
- ✅ Secure and validated
- ✅ Backward compatible

For questions or support, refer to the codebase documentation or contact the development team.
