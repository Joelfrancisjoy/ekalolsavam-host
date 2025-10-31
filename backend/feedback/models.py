from django.db import models
from django.conf import settings
from events.models import Event

class Feedback(models.Model):
    CATEGORY_CHOICES = [
        ('registration', 'Registration'),
        ('schedule', 'Schedule'),
        ('venue', 'Venue'),
        ('organization', 'Organization'),
        ('technical', 'Technical'),
        ('other', 'Other'),
    ]

    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('neutral', 'Neutral'),
        ('negative', 'Negative'),
    ]

    FEEDBACK_TYPES = [
        ('event', 'Event Feedback'),
        ('system', 'System Feedback'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, null=True, blank=True)
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPES, default='system')
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, null=True, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    contact_email = models.EmailField(blank=True, null=True)

    sentiment_score = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    sentiment_label = models.CharField(max_length=10, choices=SENTIMENT_CHOICES, default='neutral')
    sentiment_confidence = models.FloatField(default=0.5)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        try:
            uname = self.user.username if self.user_id else 'anonymous'
        except Exception:
            uname = 'anonymous'
        title = self.subject or (self.category or 'Feedback')
        return f"{uname} - {title}"