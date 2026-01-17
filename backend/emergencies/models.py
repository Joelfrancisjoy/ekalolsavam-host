from django.db import models

from users.models import User
from events.models import Event, Venue


class Emergency(models.Model):
    EMERGENCY_TYPE_CHOICES = [
        ("medical", "Medical"),
        ("fire", "Fire / Smoke"),
        ("security", "Security / Safety"),
        ("other", "Other"),
    ]

    PERSON_ROLE_CHOICES = [
        ("participant", "Participant"),
        ("judge", "Judge"),
        ("volunteer", "Volunteer"),
        ("staff", "Staff"),
        ("public", "Public Visitor"),
    ]

    SEVERITY_CHOICES = [
        ("red", "Red"),
        ("orange", "Orange"),
        ("yellow", "Yellow"),
        ("blue", "Blue"),
        ("green", "Green"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("resolved", "Resolved"),
        ("cancelled", "Cancelled"),
    ]

    CREATED_FROM_CHOICES = [
        ("public_button", "Public Button"),
        ("volunteer", "Volunteer"),
    ]

    emergency_type = models.CharField(max_length=20, choices=EMERGENCY_TYPE_CHOICES)

    person_role = models.CharField(max_length=20, choices=PERSON_ROLE_CHOICES, blank=True)
    person_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="emergencies_as_subject",
    )
    person_id_value = models.CharField(max_length=50, blank=True)

    event = models.ForeignKey(
        Event,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="emergencies",
    )
    venue = models.ForeignKey(
        Venue,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="emergencies",
    )
    category = models.CharField(max_length=50, blank=True)

    cause_type = models.CharField(max_length=20, blank=True)
    cause_description = models.TextField(blank=True)

    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    created_from = models.CharField(
        max_length=20,
        choices=CREATED_FROM_CHOICES,
        default="public_button",
    )

    requires_schedule_adjustment = models.BooleanField(default=False)
    schedule_adjusted = models.BooleanField(default=False)

    hospital_notified = models.BooleanField(default=False)
    hospital_reference_id = models.CharField(max_length=100, blank=True)

    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="emergencies_created",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        venue_name = self.venue.name if self.venue else "Unknown venue"
        return f"{self.get_emergency_type_display()} at {venue_name} ({self.created_at})"
