from django.db import models


class ArtCategory(models.Model):
    category_name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'art_categories'

    def __str__(self):
        return self.category_name


class Level(models.Model):
    level_code = models.CharField(max_length=10, unique=True)
    level_name = models.CharField(max_length=100)

    class Meta:
        db_table = 'levels'

    def __str__(self):
        return self.level_code


class ParticipationType(models.Model):
    type_name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'participation_types'

    def __str__(self):
        return self.type_name


class EventDefinition(models.Model):
    event_code = models.CharField(max_length=20, unique=True)
    event_name = models.CharField(max_length=200)
    category = models.ForeignKey(ArtCategory, on_delete=models.PROTECT, related_name='events')
    participation_type = models.ForeignKey(ParticipationType, on_delete=models.PROTECT, related_name='events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'event_definitions'
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['participation_type']),
        ]

    def __str__(self):
        return self.event_name


class EventVariant(models.Model):
    event = models.ForeignKey(EventDefinition, on_delete=models.CASCADE, related_name='variants')
    variant_name = models.CharField(max_length=100)

    class Meta:
        db_table = 'event_variants'
        unique_together = ('event', 'variant_name')
        indexes = [
            models.Index(fields=['event']),
        ]

    def __str__(self):
        return f"{self.event.event_name} - {self.variant_name}"


class EventRule(models.Model):
    GENDER_CHOICES = [
        ('BOYS', 'Boys'),
        ('GIRLS', 'Girls'),
        ('MIXED', 'Mixed'),
    ]

    event = models.ForeignKey(EventDefinition, on_delete=models.CASCADE, related_name='rules')
    variant = models.ForeignKey(EventVariant, on_delete=models.SET_NULL, null=True, blank=True, related_name='rules')
    level = models.ForeignKey(Level, on_delete=models.PROTECT, related_name='event_rules')
    gender_eligibility = models.CharField(max_length=10, choices=GENDER_CHOICES)
    min_participants = models.PositiveSmallIntegerField(null=True, blank=True)
    max_participants = models.PositiveSmallIntegerField(null=True, blank=True)
    duration_minutes = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'event_rules'
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['variant']),
            models.Index(fields=['level']),
        ]

    def __str__(self):
        return f"{self.event.event_name} ({self.level.level_code})"
