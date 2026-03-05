from rest_framework import serializers
from .models import User, AllowedEmail, School

# Extra imports for validation
import re
import socket
from typing import Optional
from PIL import Image


class UserSerializer(serializers.ModelSerializer):
    section = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'approval_status', 'must_reset_password', 'student_class', 'section', 'school', 'school_category_extra']
        read_only_fields = ['id', 'section']

    def get_section(self, obj):
        return obj.section


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    password_confirm = serializers.CharField(write_only=True, required=False)
    # Allow only safe roles from client
    role = serializers.ChoiceField(choices=[('student', 'Student'), ('judge', 'Judge'), ('volunteer', 'Volunteer')], default='student')

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone', 'role',
            'staff_id_photo', 'college_id_photo', 'school', 'school_category_extra', 'student_class',
            'judge_id_photo'
        ]
        extra_kwargs = {
            'username': {'required': False},
        }

    # -------------------- Helper validation functions --------------------
    def _domain_exists(self, domain: str) -> bool:
        try:
            # Try to resolve domain to any address (A/AAAA)
            socket.getaddrinfo(domain, None)
            return True
        except Exception:
            return False

    def _is_probably_fake_email(self, email: str) -> bool:
        try:
            local = email.split('@')[0]
        except Exception:
            return True
        # Reject patterns like zzzzzz@gmail.com (same char >=5)
        return bool(re.match(r'^(.)\1{4,}$', local))

    def _is_legitimate_gmail(self, email: str) -> bool:
        """Heuristic check for legitimate Gmail addresses with real names."""
        if not email or '@' not in email:
            return False
        email = email.strip().lower()
        if not email.endswith('@gmail.com'):
            return False
        try:
            local = email.split('@')[0]
        except Exception:
            return False
        if not local:
            return False
        # Reject long repeats like aaaaa, zzzzz, etc. (3+ repeats in a row)
        if re.search(r'(.)\1{2,}', local):
            return False
        # Very low variety for long locals
        if len(set(local)) <= 2 and len(local) >= 6:
            return False
        # Obvious placeholders
        if local in {'gmail', 'email', 'user', 'admin', 'test', 'abcd', 'wxyz', 'qwerty'}:
            return False
        # Must contain at least one vowel
        if not re.search(r'[aeiou]', local):
            return False
        # Reject likely random consonant strings with very low vowel ratio and no separators
        letters = len(re.findall(r'[a-z]', local))
        if letters >= 8:
            vowels = len(re.findall(r'[aeiou]', local))
            if (vowels / max(1, letters)) < 0.25 and all(ch not in local for ch in ['.', '_', '-']):
                return False
        return True

    def _validate_phone(self, phone: str):
        if phone is None:
            raise serializers.ValidationError('Phone number is required')
        digits = re.sub(r'\D', '', phone)
        if len(digits) != 10:
            raise serializers.ValidationError('Phone number must be exactly 10 digits')
        if not re.match(r'^[789]', digits):
            raise serializers.ValidationError('Phone number must start with 7, 8, or 9')
        if digits == '0000000000':
            raise serializers.ValidationError('Phone number cannot be all zeros')
        # Reject long repetitive sequences (e.g., 4444422222)
        if re.search(r'(\d)\1{4,}', digits):
            raise serializers.ValidationError('Phone number has an invalid repetitive sequence')
        return digits

    def _is_jpeg(self, f) -> bool:
        """Accept JPEG or PNG images for ID photos."""
        try:
            f.seek(0)
        except Exception:
            pass
        try:
            img = Image.open(f)
            img.verify()  # Validate structure
            fmt = getattr(img, 'format', None)
            try:
                f.seek(0)
            except Exception:
                pass
            return fmt in ('JPEG', 'PNG')
        except Exception:
            try:
                f.seek(0)
            except Exception:
                pass
            return False

    # -------------------- Field-level validations --------------------
    def validate_username(self, value: str) -> str:
        # Allow missing/empty username for judge registration
        incoming_role = (self.initial_data.get('role') or '').lower() if isinstance(self.initial_data, dict) else ''
        username = (value or '').strip()
        if not username and incoming_role == 'judge':
            return ''
        if not username:
            raise serializers.ValidationError('Username is required')
        # Basic constraints
        if len(username) < 3 or len(username) > 150:
            raise serializers.ValidationError('Username must be between 3 and 150 characters')
        # Case-insensitive uniqueness
        if User.objects.filter(username__iexact=username).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError('Exsisting Username')
        return username
    def validate_first_name(self, value: str) -> str:
        """Validate and normalize first name."""
        if not value or not value.strip():
            raise serializers.ValidationError('First name is required.')

        name = value.strip()

        # Check length
        if len(name) < 1 or len(name) > 150:
            raise serializers.ValidationError('First name must be between 1 and 150 characters.')

        # Allow only letters, spaces, hyphens, and apostrophes
        if not re.match(r"^[a-zA-Z\s\-']+$", name):
            raise serializers.ValidationError('First name can only contain letters, spaces, hyphens, and apostrophes.')

        # Title case the name for consistent storage
        return name.title()

    def validate_last_name(self, value: str) -> str:
        """Validate and normalize last name."""
        if not value or not value.strip():
            raise serializers.ValidationError('Last name is required.')

        name = value.strip()

        # Check length
        if len(name) < 1 or len(name) > 150:
            raise serializers.ValidationError('Last name must be between 1 and 150 characters.')

        # Allow only letters, spaces, hyphens, and apostrophes
        if not re.match(r"^[a-zA-Z\s\-']+$", name):
            raise serializers.ValidationError('Last name can only contain letters, spaces, hyphens, and apostrophes.')

        # Title case the name for consistent storage
        return name.title()

    def validate_email(self, value: str) -> str:
        # Normalize and basic sanity checks
        email = (value or '').strip().lower()
        # Enforce legitimate Gmail with real-name heuristics
        if not self._is_legitimate_gmail(email):
            raise serializers.ValidationError('Please provide a valid Gmail address with your real name (e.g., firstname.lastname@gmail.com).')
        # Uniqueness check
        if User.objects.filter(email__iexact=email).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError('Exsisting Email ID')
        # Optional domain existence verification (recommended)
        parts = email.split('@')
        if len(parts) == 2:
            domain = parts[1]
            # Non-blocking domain check to avoid false 400s in restricted environments
            _ = self._domain_exists(domain)
        return email

    def validate_phone(self, value: Optional[str]) -> str:
        return self._validate_phone(value)

    # -------------------- Object-level validation --------------------
    def validate(self, attrs):
        role = attrs.get('role') or 'student'
        # For judges, no password on registration
        if role == 'judge':
            attrs['password'] = attrs.get('password') or ''
            attrs['password_confirm'] = attrs.get('password_confirm') or ''
        else:
            if attrs.get('password') != attrs.get('password_confirm'):
                raise serializers.ValidationError('Passwords do not match')

        # Check for duplicate names (case-insensitive) - this runs after field validation
        # so first_name and last_name are already normalized to title case
        first_name = attrs.get('first_name')
        last_name = attrs.get('last_name')

        if first_name and last_name:
            # Check if a user with the same name already exists (case-insensitive)
            existing_user = User.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name
            ).exclude(pk=getattr(self.instance, 'pk', None)).first()

            if existing_user:
                raise serializers.ValidationError({
                    'first_name': f'A user with the name "{first_name} {last_name}" already exists.',
                    'last_name': f'A user with the name "{first_name} {last_name}" already exists.'
                })

        # Role-specific requirements
        role = attrs.get('role') or 'student'

        # Student-specific: require JPEG college ID and a school
        if role == 'student':
            # Validate class and section range (optional now)
            cls = attrs.get('student_class')
            if cls:  # Only validate if provided
                try:
                    cls_int = int(cls)
                except Exception:
                    raise serializers.ValidationError({'student_class': 'Class must be a valid number'})
                if not (1 <= cls_int <= 12):
                    raise serializers.ValidationError({'student_class': 'Class must be between 1 and 12'})

            college_id = attrs.get('college_id_photo')
            if not college_id:
                raise serializers.ValidationError({'college_id_photo': 'College ID photo is required for students'})
            if not self._is_jpeg(college_id):
                raise serializers.ValidationError({'college_id_photo': 'Only image files (JPEG/PNG) are allowed'})

            school = attrs.get('school')
            if not school:
                raise serializers.ValidationError({'school': 'School selection is required for students'})
            if isinstance(school, School) and not school.is_active:
                raise serializers.ValidationError({'school': 'Selected school is not active'})

            # If selected school's category is not LP, require additional dropdown value
            school_obj = school if isinstance(school, School) else None
            if school_obj and school_obj.category != 'LP':
                extra = attrs.get('school_category_extra')
                if extra not in ['UP', 'HS', 'HSS']:
                    raise serializers.ValidationError({'school_category_extra': 'This field is required and must be one of UP, HS, HSS'})
            else:
                # Ensure empty for LP
                attrs['school_category_extra'] = ''
        elif role == 'volunteer':
            # Volunteer-specific: require JPEG staff ID photo
            staff_id = attrs.get('staff_id_photo')
            if not staff_id:
                raise serializers.ValidationError({'staff_id_photo': 'Staff ID photo is required for volunteers'})
            if not self._is_jpeg(staff_id):
                raise serializers.ValidationError({'staff_id_photo': 'Only image files (JPEG/PNG) are allowed'})

            # Ensure no student-only requirements enforced
            attrs['college_id_photo'] = attrs.get('college_id_photo')  # allowed but not required
            # school and extra are optional for volunteers
        elif role == 'judge':
            # Judge-specific: require JPEG judge ID photo; do not require username/password here
            judge_id = attrs.get('judge_id_photo')
            if not judge_id:
                raise serializers.ValidationError({'judge_id_photo': 'Photo ID is required for judges'})
            if not self._is_jpeg(judge_id):
                raise serializers.ValidationError({'judge_id_photo': 'Only image files (JPEG/PNG) are allowed'})
            # Username can be optional here; backend may generate placeholder until approval
            if not attrs.get('username'):
                # Generate a temporary username from email prefix if missing
                base = (attrs.get('email') or '').split('@')[0] or 'judge'
                candidate = base
                suffix = 1
                while User.objects.filter(username__iexact=candidate).exists():
                    candidate = f"{base}{suffix}"
                    suffix += 1
                attrs['username'] = candidate
        else:
            # Other roles (future): pass
            attrs['college_id_photo'] = attrs.get('college_id_photo')

        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password', '')

        # Disallow client from creating admin users via public registration
        role = validated_data.get('role') or 'student'
        if role not in ['student', 'judge', 'volunteer']:
            raise serializers.ValidationError({'role': 'Invalid role'})

        user = User.objects.create_user(**validated_data)
        if role == 'judge':
            # Judges start as pending and without a usable password
            user.approval_status = 'pending'
            user.set_unusable_password()
            user.save(update_fields=['approval_status', 'password'])
        else:
            user.set_password(password)
            user.save()
        return user


class AllowedEmailSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = AllowedEmail
        fields = ['id', 'email', 'is_active', 'created_at', 'created_by', 'created_by_username']
        read_only_fields = ['id', 'created_at', 'created_by', 'created_by_username']

    def validate_email(self, value):
        email = value.lower()
        if not User.objects.filter(email=email, role__in=['student', 'volunteer', 'judge']).exists():
            raise serializers.ValidationError('Not a Registered ID')
        return email

    def create(self, validated_data):
        # Normalize email and set creator
        validated_data['email'] = validated_data['email'].lower()
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BulkAllowedEmailSerializer(serializers.Serializer):
    emails = serializers.ListField(
        child=serializers.EmailField(),
        allow_empty=False,
        help_text="List of email addresses to add to allowed list"
    )

    def validate_emails(self, value):
        # Remove duplicates while preserving order
        unique_emails = []
        seen = set()
        for email in value:
            email_lower = email.lower()
            if email_lower not in seen:
                # Check if registered
                if not User.objects.filter(email=email_lower, role__in=['student', 'volunteer', 'judge']).exists():
                    raise serializers.ValidationError(f'Email {email} is not a registered ID')
                unique_emails.append(email_lower)
                seen.add(email_lower)
        return unique_emails

    def create(self, validated_data):
        emails = validated_data['emails']
        created_by = self.context['request'].user
        created_emails = []

        for email in emails:
            allowed_email, created = AllowedEmail.objects.get_or_create(
                email=email,
                defaults={'created_by': created_by, 'is_active': True}
            )
            if created:
                created_emails.append(allowed_email)

        return created_emails


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ['id', 'name', 'category', 'is_active']


# Admin-only serializer to restrict writable fields
class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['role', 'phone', 'approval_status', 'student_class', 'school', 'school_category_extra']
