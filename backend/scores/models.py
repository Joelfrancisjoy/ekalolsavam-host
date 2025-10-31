from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import User
from events.models import Event

class Score(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    participant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scores')
    judge = models.ForeignKey(User, on_delete=models.CASCADE, related_name='judged_scores')
    
    # Legacy fields for backward compatibility (kept for existing data)
    technical_skill = models.DecimalField(
        max_digits=4, 
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Technical Skill score (0-25)",
        null=True,
        blank=True
    )
    artistic_expression = models.DecimalField(
        max_digits=4, 
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Artistic Expression score (0-25)",
        null=True,
        blank=True
    )
    stage_presence = models.DecimalField(
        max_digits=4, 
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Stage Presence score (0-25)",
        null=True,
        blank=True
    )
    overall_impression = models.DecimalField(
        max_digits=4, 
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Overall Impression score (0-25)",
        null=True,
        blank=True
    )
    
    # New dynamic criteria field (JSON format for flexibility)
    criteria_scores = models.JSONField(
        default=dict,
        help_text="Dynamic scoring criteria as JSON {criterion_id: score}",
        blank=True
    )
    
    # Total score (automatically calculated, max 100)
    total_score = models.DecimalField(
        max_digits=5, 
        decimal_places=1,
        editable=False,
        help_text="Total score (sum of all criteria)"
    )
    
    notes = models.TextField(blank=True, null=True, help_text="Additional comments from judge")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Anomaly detection fields
    is_flagged = models.BooleanField(default=False, help_text="Flagged as potentially anomalous")
    anomaly_confidence = models.DecimalField(
        max_digits=4, 
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Anomaly confidence score (0.0-1.0)"
    )
    anomaly_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Details about anomaly detection"
    )
    admin_reviewed = models.BooleanField(default=False, help_text="Admin has reviewed this flagged score")
    admin_notes = models.TextField(blank=True, null=True, help_text="Admin notes about flagged score")

    class Meta:
        db_table = 'score_scores'
        unique_together = ('event', 'participant', 'judge')
        ordering = ['-submitted_at']

    def save(self, *args, **kwargs):
        # Calculate total score before saving
        if self.criteria_scores:
            # Use dynamic criteria scores
            self.total_score = sum(float(v) for v in self.criteria_scores.values() if v is not None)
        else:
            # Fallback to legacy fields for backward compatibility
            legacy_scores = [
                self.technical_skill or 0,
                self.artistic_expression or 0,
                self.stage_presence or 0,
                self.overall_impression or 0
            ]
            self.total_score = sum(legacy_scores)
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.participant.username} - {self.event.name} - Judge: {self.judge.username} - Total: {self.total_score}"

class Result(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    participant = models.ForeignKey(User, on_delete=models.CASCADE)
    total_score = models.DecimalField(max_digits=6, decimal_places=2)
    rank = models.IntegerField()
    published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('event', 'participant')
        ordering = ['rank']

    def __str__(self):
        return f"{self.event.name} - {self.participant.username} - Rank: {self.rank}"