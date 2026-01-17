from django.db import models
from users.models import User

class Venue(models.Model):
    name = models.CharField(max_length=100)
    location = models.TextField()
    capacity = models.IntegerField()
    event_limit = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Event(models.Model):
    CATEGORY_CHOICES = [
        ('dance', 'Dance'),
        ('music', 'Music'),
        ('theatre', 'Theatre'),
        ('literary', 'Literary'),
        ('visual_arts', 'Visual Arts'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE)
    max_participants = models.IntegerField()
    judges = models.ManyToManyField(User, related_name='assigned_events')
    volunteers = models.ManyToManyField(User, related_name='assigned_volunteer_events', blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class Judge(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    specialization = models.CharField(max_length=100, blank=True)
    assigned_events = models.ManyToManyField(Event, related_name='assigned_judges', blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.specialization}"

class EventRegistration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    participant = models.ForeignKey(User, on_delete=models.CASCADE)
    registration_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')  # pending, confirmed, cancelled
    chess_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    registration_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ('event', 'participant')

    def __str__(self):
        return f"{self.participant.username} - {self.event.name}"

class ParticipantVerification(models.Model):
    VERIFICATION_STATUS = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    participant = models.ForeignKey(User, on_delete=models.CASCADE)
    chess_number = models.CharField(max_length=20)
    volunteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verified_participants')
    verification_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=VERIFICATION_STATUS, default='pending')
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('event', 'participant', 'volunteer')

    def __str__(self):
        return f"{self.participant.username} - {self.event.name} - {self.volunteer.username}"