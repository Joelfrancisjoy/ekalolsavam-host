from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class AllowedEmail(models.Model):
    email = models.EmailField(
        max_length=254,
        unique=True,
        verbose_name='Email Address'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='allowedemail_set',
        verbose_name='Created By',
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = 'Allowed Email'
        verbose_name_plural = 'Allowed Emails'
        ordering = ['-created_at']

    def __str__(self):
        return self.email

class School(models.Model):
    CATEGORY_CHOICES = [
        ('LP', 'Lower Primary'),
        ('UP', 'Upper Primary'),
        ('HS', 'High School'),
        ('HSS', 'Higher Secondary School'),
    ]
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=3, choices=CATEGORY_CHOICES)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class User(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('judge', 'Judge'),
        ('admin', 'Admin'),
        ('volunteer', 'Volunteer'),
        ('school', 'School')
    ]
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=15, blank=True)

    # Student-specific
    college_id_photo = models.ImageField(upload_to='college_id_photos/', blank=True, null=True)
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True)
    school_category_extra = models.CharField(max_length=10, blank=True, null=True)
    # Academic class/standard for students (1-12). Used to derive LP/UP/HS/HSS section.
    student_class = models.PositiveSmallIntegerField(null=True, blank=True)

    # Volunteer-specific
    staff_id_photo = models.ImageField(upload_to='staff_id_photos/', blank=True, null=True)
    # Judge-specific
    judge_id_photo = models.ImageField(upload_to='judge_id_photos/', blank=True, null=True)
    
    # School-specific (school email contact)
    contact_email = models.EmailField(blank=True, null=True)
    
    approval_status = models.CharField(max_length=10, choices=APPROVAL_STATUS_CHOICES, default='pending')
    
    # For ID-based signup (volunteers/judges)
    registration_id = models.CharField(max_length=50, blank=True, null=True, help_text="Admin-issued ID for registration")
    # Temporarily store the password provided during registration (encrypted).
    # This is cleared once the user accepts it or sets a new password after approval.
    pending_password_encrypted = models.TextField(blank=True, null=True)
    # Require user to set a new password on next login (used for temp-password accounts)
    must_reset_password = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def section(self):
        """Derive LP/UP/HS/HSS from student_class.
        LP: 1-4, UP: 5-7, HS: 8-10, HSS: 11-12. Returns None if unknown."""
        try:
            cls = int(self.student_class) if self.student_class is not None else None
        except Exception:
            cls = None
        if cls is None:
            return None
        if 1 <= cls <= 4:
            return 'LP'
        if 5 <= cls <= 7:
            return 'UP'
        if 8 <= cls <= 10:
            return 'HS'
        if 11 <= cls <= 12:
            return 'HSS'
        return None
