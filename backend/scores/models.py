from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import User
from events.models import Event
import uuid


class Score(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    participant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='scores')
    judge = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='judged_scores')

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

    notes = models.TextField(blank=True, null=True,
                             help_text="Additional comments from judge")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Anomaly detection fields
    is_flagged = models.BooleanField(
        default=False, help_text="Flagged as potentially anomalous")
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
    admin_reviewed = models.BooleanField(
        default=False, help_text="Admin has reviewed this flagged score")
    admin_notes = models.TextField(
        blank=True, null=True, help_text="Admin notes about flagged score")

    class Meta:
        db_table = 'score_scores'
        unique_together = ('event', 'participant', 'judge')
        ordering = ['-submitted_at']

    def save(self, *args, **kwargs):
        # Calculate total score before saving
        if self.criteria_scores:
            # Use dynamic criteria scores
            self.total_score = sum(
                float(v) for v in self.criteria_scores.values() if v is not None)
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

    @property
    def is_recheck_allowed(self):
        """Check if a recheck request is allowed for this result"""
        # Check if there's already a recheck request for this result
        return not RecheckRequest.objects.filter(
            result=self,
            participant=self.participant
        ).exists()

    @property
    def chest_number(self):
        """Get the chest number for this participant in this event"""
        try:
            from events.models import EventRegistration
            registration = EventRegistration.objects.get(
                event=self.event,
                participant=self.participant
            )
            return registration.chess_number or "N/A"
        except EventRegistration.DoesNotExist:
            return "N/A"


class RecheckRequest(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
    ]

    recheck_request_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the recheck request"
    )
    result = models.ForeignKey(
        Result,
        on_delete=models.CASCADE,
        help_text="The result being requested for re-check"
    )
    participant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text="The participant requesting the re-check"
    )

    # Cached participant data for easy access (denormalized for performance)
    full_name = models.CharField(
        max_length=255,
        help_text="Participant's full name at time of request"
    )
    category = models.CharField(
        max_length=50,
        help_text="Event category at time of request"
    )
    event_name = models.CharField(
        max_length=100,
        help_text="Event name at time of request"
    )
    chest_number = models.CharField(
        max_length=20,
        help_text="Participant's chest number at time of request"
    )
    final_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Final score at time of request"
    )
    reason = models.TextField(
        blank=True,
        null=True,
        help_text="Optional reason provided by the participant for the re-check request"
    )

    assigned_volunteer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assigned_recheck_requests',
        help_text="Volunteer assigned to process this request"
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='Pending',
        help_text="Current status of the recheck request"
    )

    submitted_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the request was submitted"
    )
    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the request was accepted by volunteer"
    )

    class Meta:
        db_table = 'scores_recheck_request'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['assigned_volunteer', 'status']),
            models.Index(fields=['participant', 'result']),
            models.Index(fields=['status']),
        ]
        # Prevent duplicate requests for the same result
        unique_together = ('result', 'participant')

    def __str__(self):
        return f"Recheck Request - {self.event_name} - {self.full_name} - {self.status}"

    def save(self, *args, **kwargs):
        # Auto-populate cached fields from related objects if not already set
        if not self.full_name and self.participant:
            self.full_name = f"{self.participant.first_name} {self.participant.last_name}".strip(
            )
            if not self.full_name:
                self.full_name = self.participant.username

        if not self.category and self.result:
            self.category = self.result.event.category

        if not self.event_name and self.result:
            self.event_name = self.result.event.name

        if not self.final_score and self.result:
            self.final_score = self.result.total_score

        # Get chest number from EventRegistration
        if not self.chest_number and self.participant and self.result:
            try:
                from events.models import EventRegistration
                registration = EventRegistration.objects.get(
                    event=self.result.event,
                    participant=self.participant
                )
                self.chest_number = registration.chess_number or "N/A"
            except EventRegistration.DoesNotExist:
                self.chest_number = "N/A"

        super().save(*args, **kwargs)


class RazorpayPayment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('created', 'Created'),
        ('attempted', 'Attempted'),
        ('captured', 'Captured'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recheck_request = models.ForeignKey(
        RecheckRequest, on_delete=models.CASCADE, related_name='payments')
    razorpay_order_id = models.CharField(max_length=100, unique=True)
    razorpay_payment_id = models.CharField(
        max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(
        max_length=100, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default='created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'scores_razorpay_payments'
        ordering = ['-created_at']

    def __str__(self):
        return f'Razorpay Payment {self.razorpay_order_id} - {self.status}'
