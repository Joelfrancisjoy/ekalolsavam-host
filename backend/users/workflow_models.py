from django.db import models
from django.conf import settings


class AdminIssuedID(models.Model):
    """
    IDs issued by admin for volunteers, judges, and students to sign up with.
    Admin pre-assigns names to IDs before distributing them.
    """
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('volunteer', 'Volunteer'),
        ('judge', 'Judge'),
    ]
    
    id_code = models.CharField(max_length=50, unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    
    # Pre-assigned name for this ID (admin sets this when generating)
    assigned_name = models.CharField(
        max_length=200,
        help_text="Full name of the person this ID is assigned to",
        blank=True,
        null=True
    )
    
    # Phone number for verification (optional)
    assigned_phone = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="Phone number for verification"
    )
    
    # Activation status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this ID is active and can be used for registration"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issued_ids'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Usage tracking
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='registered_with_id',
        null=True,
        blank=True
    )
    
    # Verification tracking
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether admin has verified the account created with this ID"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='verified_ids',
        null=True,
        blank=True,
        limit_choices_to={'role': 'admin'}
    )
    
    # Admin notes
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about this ID assignment"
    )
    
    class Meta:
        verbose_name = 'Admin Issued ID'
        verbose_name_plural = 'Admin Issued IDs'
        ordering = ['-created_at']
    
    def __str__(self):
        if self.assigned_name:
            return f"{self.id_code} - {self.assigned_name} ({self.role})"
        return f"{self.id_code} ({self.role})"
    
    @property
    def status_display(self):
        """Human-readable status of this ID."""
        if self.is_verified:
            return "Verified"
        elif self.is_used:
            return "Pending Verification"
        elif not self.is_active:
            return "Inactive"
        else:
            return "Available"


class SchoolParticipant(models.Model):
    """
    Participant data submitted by schools.
    This data is sent to the assigned volunteer for verification.
    """
    GENDER_CHOICES = [
        ('BOYS', 'Boys'),
        ('GIRLS', 'Girls'),
    ]

    school = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='school_participants',
        limit_choices_to={'role': 'school'}
    )
    participant_id = models.CharField(max_length=100, help_text="School-assigned participant ID")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    student_class = models.PositiveSmallIntegerField(help_text="Class 1-12")
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    events = models.ManyToManyField('events.Event', related_name='school_participant_events')
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_by_volunteer = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='verified_school_participants',
        null=True,
        blank=True,
        limit_choices_to={'role': 'volunteer'}
    )
    
    class Meta:
        verbose_name = 'School Participant'
        verbose_name_plural = 'School Participants'
        ordering = ['-submitted_at']
        unique_together = [['school', 'participant_id']]
    
    def __str__(self):
        return f"{self.participant_id} - {self.first_name} {self.last_name}"


class SchoolGroupEntry(models.Model):
    """
    Group-based participant data submitted by schools for group events.
    """
    GROUP_CLASS_CHOICES = [
        ('LP', 'Lower Primary'),
        ('UP', 'Upper Primary'),
        ('HS', 'High School'),
        ('HSS', 'Higher Secondary School'),
    ]
    GENDER_CHOICES = [
        ('BOYS', 'Boys'),
        ('GIRLS', 'Girls'),
        ('MIXED', 'Mixed'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('bulk', 'Bulk Import'),
    ]

    school = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='school_group_entries',
        limit_choices_to={'role': 'school'}
    )
    group_id = models.CharField(max_length=100, help_text="School-assigned unique group ID")
    group_class = models.CharField(max_length=10, choices=GROUP_CLASS_CHOICES)
    gender_category = models.CharField(max_length=10, choices=GENDER_CHOICES)
    participant_count = models.PositiveSmallIntegerField()
    leader_full_name = models.CharField(max_length=220)
    leader_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='led_school_groups',
        null=True,
        blank=True,
        limit_choices_to={'role': 'student'}
    )
    events = models.ManyToManyField('events.Event', related_name='school_group_entries', blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    review_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='reviewed_school_group_entries',
        null=True,
        blank=True,
        limit_choices_to={'role': 'admin'}
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'School Group Entry'
        verbose_name_plural = 'School Group Entries'
        ordering = ['-submitted_at']
        unique_together = [['school', 'group_id']]
        constraints = [
            models.CheckConstraint(
                check=models.Q(participant_count__gte=1) & models.Q(participant_count__lte=20),
                name='school_group_participant_count_range',
            ),
        ]

    def __str__(self):
        return f"{self.group_id} - {self.school.username}"


class SchoolGroupMember(models.Model):
    """
    Individual members within a school group entry.
    """
    group_entry = models.ForeignKey(
        SchoolGroupEntry,
        on_delete=models.CASCADE,
        related_name='members'
    )
    member_order = models.PositiveSmallIntegerField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_leader = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'School Group Member'
        verbose_name_plural = 'School Group Members'
        ordering = ['member_order']
        unique_together = [['group_entry', 'member_order']]

    def __str__(self):
        return f"{self.group_entry.group_id} - {self.first_name} {self.last_name}"


class SchoolVolunteerAssignment(models.Model):
    """
    Assignment of volunteers to schools for participant verification.
    """
    school = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_volunteer',
        limit_choices_to={'role': 'school'}
    )
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_schools',
        limit_choices_to={'role': 'volunteer'}
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='school_volunteer_assignments',
        null=True,
        limit_choices_to={'role': 'admin'}
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'School-Volunteer Assignment'
        verbose_name_plural = 'School-Volunteer Assignments'
        unique_together = [['school', 'volunteer']]
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.school.username} -> {self.volunteer.username}"


class SchoolStanding(models.Model):
    """
    Tracks standings for each school based on student points.
    """
    school = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='standings',
        limit_choices_to={'role': 'school'}
    )
    total_points = models.PositiveIntegerField(default=0)
    total_gold = models.PositiveIntegerField(default=0)
    total_silver = models.PositiveIntegerField(default=0)
    total_bronze = models.PositiveIntegerField(default=0)
    total_participants = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'School Standing'
        verbose_name_plural = 'School Standings'
        ordering = ['-total_points', '-total_gold', '-total_silver']
        unique_together = [['school']]
    
    def __str__(self):
        return f"{self.school.username}: {self.total_points} points"


class IDSignupRequest(models.Model):
    """
    Tracks signup requests from users using admin-issued IDs.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    issued_id = models.ForeignKey(
        AdminIssuedID,
        on_delete=models.CASCADE,
        related_name='signup_requests'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='id_signup_requests'
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='reviewed_signups',
        null=True,
        blank=True,
        limit_choices_to={'role': 'admin'}
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'ID Signup Request'
        verbose_name_plural = 'ID Signup Requests'
        ordering = ['-requested_at']
        unique_together = [['issued_id', 'user']]
    
    def __str__(self):
        return f"{self.user.username} via {self.issued_id.id_code} - {self.status}"
