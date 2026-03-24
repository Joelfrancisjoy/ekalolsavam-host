from rest_framework import serializers
from django.core import signing
from .workflow_models import (
    AdminIssuedID,
    SchoolParticipant,
    SchoolGroupEntry,
    SchoolGroupMember,
    SchoolVolunteerAssignment,
    SchoolStanding,
    IDSignupRequest
)
from .models import User


class AdminIssuedIDSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    used_by_username = serializers.CharField(source='used_by.username', read_only=True, allow_null=True)
    used_by_details = serializers.SerializerMethodField()
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True, allow_null=True)
    status_display = serializers.ReadOnlyField()
    
    class Meta:
        model = AdminIssuedID
        fields = [
            'id', 'id_code', 'role', 'assigned_name', 'assigned_phone',
            'is_active', 'created_by', 'created_by_username', 'created_at',
            'is_used', 'used_at', 'used_by', 'used_by_username', 'used_by_details',
            'is_verified', 'verified_at', 'verified_by', 'verified_by_username',
            'notes', 'status_display'
        ]
        read_only_fields = [
            'created_by', 'created_at', 'is_used', 'used_at', 'used_by',
            'is_verified', 'verified_at', 'verified_by', 'status_display'
        ]
    
    def get_used_by_details(self, obj):
        """Get full details of the user who registered with this ID."""
        if obj.used_by:
            return {
                'id': obj.used_by.id,
                'username': obj.used_by.username,
                'email': obj.used_by.email,
                'first_name': obj.used_by.first_name,
                'last_name': obj.used_by.last_name,
                'phone': obj.used_by.phone,
                'role': obj.used_by.role,
                'approval_status': obj.used_by.approval_status,
                'is_active': obj.used_by.is_active,
            }
        return None


class SchoolParticipantSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.username', read_only=True)
    events_display = serializers.SerializerMethodField()
    section = serializers.SerializerMethodField()
    user_account = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = SchoolParticipant
        fields = ['id', 'school', 'school_name', 'participant_id', 'first_name', 'last_name',
                 'student_class', 'section', 'gender', 'events', 'events_display', 'submitted_at',
                 'verified_by_volunteer', 'verified_at', 'volunteer', 'user_account', 'status']
        read_only_fields = ['submitted_at', 'verified_by_volunteer', 'verified_at', 'volunteer']

    def get_events_display(self, obj):
        return [{"id": e.id, "name": e.name} for e in obj.events.all()]

    def get_section(self, obj):
        """Calculate section based on student class"""
        if 1 <= obj.student_class <= 3:
            return 'LP'
        elif 4 <= obj.student_class <= 7:
            return 'UP'
        elif 8 <= obj.student_class <= 10:
            return 'HS'
        elif 11 <= obj.student_class <= 12:
            return 'HSS'
        return None

    def get_user_account(self, obj):
        """Get user account details if participant has been approved"""
        try:
            from .models import User
            participant_school = getattr(obj.school, 'school', None)
            if participant_school is None:
                return None

            spp_registration_id = f"SPP-{obj.pk}"

            school_registration_id = f"SP-{participant_school.id}-{obj.participant_id}"

            # Prefer registration_id match; fall back to username match.
            user = User.objects.filter(
                role='student',
                school=participant_school,
                registration_id=spp_registration_id
            ).first()
            if user is None:
                user = User.objects.filter(
                    role='student',
                    school=participant_school,
                    registration_id=school_registration_id
                ).first()
            if user is None:
                user = User.objects.filter(
                    role='student',
                    school=participant_school,
                    registration_id=obj.participant_id
                ).first()
            if user is None:
                user = User.objects.filter(
                    role='student',
                    school=participant_school,
                    username=obj.participant_id.lower()
                ).first()

            if user:
                temp_password = None
                try:
                    request = self.context.get('request')
                    requester = getattr(request, 'user', None) if request is not None else None
                    if (
                        requester is not None
                        and getattr(requester, 'is_authenticated', False)
                        and getattr(requester, 'role', None) == 'school'
                        and requester.id == obj.school_id
                        and user.must_reset_password
                        and user.temporary_password_encrypted
                    ):
                        payload = signing.loads(user.temporary_password_encrypted)
                        temp_password = payload.get('p')
                except Exception:
                    temp_password = None

                return {
                    'username': user.username,
                    'section': user.section,
                    'gender': user.gender,
                    'is_active': user.is_active,
                    'user_id': user.id,
                    'temporary_password': temp_password,
                }
        except Exception:
            pass
        return None

    def get_status(self, obj):
        """Get approval status"""
        if obj.verified_by_volunteer:
            return 'approved'
        return 'pending'


class SchoolGroupMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = SchoolGroupMember
        fields = ['id', 'member_order', 'first_name', 'last_name', 'full_name', 'gender', 'student_class', 'phone', 'is_leader']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class StudentGroupMemberUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    member_order = serializers.IntegerField(required=False, min_value=1)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    gender = serializers.ChoiceField(choices=['BOYS', 'GIRLS'], required=False, allow_null=True)
    student_class = serializers.IntegerField(required=False, min_value=1, max_value=12, allow_null=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)

    def validate_first_name(self, value: str) -> str:
        name = str(value or '').strip()
        if not name:
            raise serializers.ValidationError('First name is required.')
        if not all(ch.isalpha() or ch in " -'" for ch in name):
            raise serializers.ValidationError('First name can only contain letters, spaces, hyphens, and apostrophes.')
        return name

    def validate_last_name(self, value: str) -> str:
        name = str(value or '').strip()
        if not name:
            raise serializers.ValidationError('Last name is required.')
        if not all(ch.isalpha() or ch in " -'" for ch in name):
            raise serializers.ValidationError('Last name can only contain letters, spaces, hyphens, and apostrophes.')
        return name

    def validate(self, attrs):
        if attrs.get('id') in [None, ''] and attrs.get('member_order') in [None, '']:
            raise serializers.ValidationError('Each participant must include either id or member_order.')
        return attrs

    def validate_phone(self, value: str) -> str:
        if value in [None, '']:
            return ''
        digits = ''.join(ch for ch in str(value) if ch.isdigit())
        if len(digits) != 10:
            raise serializers.ValidationError('Phone number must be exactly 10 digits')
        if digits[0] not in {'7', '8', '9'}:
            raise serializers.ValidationError('Phone number must start with 7, 8, or 9')
        if digits == '0000000000':
            raise serializers.ValidationError('Phone number cannot be all zeros')
        return digits


class StudentGroupProfileUpdateSerializer(serializers.Serializer):
    gender_category = serializers.ChoiceField(
        choices=['BOYS', 'GIRLS', 'MIXED'],
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    participants = StudentGroupMemberUpdateSerializer(many=True, required=False)

    def validate(self, attrs):
        if 'gender_category' not in attrs and 'participants' not in attrs:
            raise serializers.ValidationError(
                'Provide at least one field to update: gender_category or participants.'
            )
        return attrs


class StudentAllowedGroupEntrySerializer(serializers.Serializer):
    group_entry_id = serializers.IntegerField()
    group_id = serializers.CharField()
    leader_full_name = serializers.CharField()
    leader_user_id = serializers.IntegerField(allow_null=True)
    event_ids = serializers.ListField(child=serializers.IntegerField())
    status = serializers.CharField()


class StudentAllowedEventsResponseSerializer(serializers.Serializer):
    event_ids = serializers.ListField(child=serializers.IntegerField())
    participant_id = serializers.IntegerField(allow_null=True)
    school_id = serializers.IntegerField(allow_null=True)
    group_event_ids = serializers.ListField(child=serializers.IntegerField())
    group_entries = StudentAllowedGroupEntrySerializer(many=True)


class SchoolIndividualEventsQuerySerializer(serializers.Serializer):
    student_class = serializers.IntegerField(required=False, min_value=1, max_value=12)
    studentClass = serializers.IntegerField(required=False, min_value=1, max_value=12)
    level_code = serializers.ChoiceField(choices=['LP', 'UP', 'HS', 'HSS'], required=False)
    levelCode = serializers.ChoiceField(choices=['LP', 'UP', 'HS', 'HSS'], required=False)
    gender_category = serializers.ChoiceField(choices=['BOYS', 'GIRLS', 'MIXED'], required=False)
    genderCategory = serializers.ChoiceField(choices=['BOYS', 'GIRLS', 'MIXED'], required=False)


class SchoolGroupEventsQuerySerializer(serializers.Serializer):
    group_class = serializers.ChoiceField(choices=['LP', 'UP', 'HS', 'HSS'], required=False)
    groupClass = serializers.ChoiceField(choices=['LP', 'UP', 'HS', 'HSS'], required=False)
    gender_category = serializers.ChoiceField(choices=['BOYS', 'GIRLS', 'MIXED'], required=False)
    genderCategory = serializers.ChoiceField(choices=['BOYS', 'GIRLS', 'MIXED'], required=False)


class SchoolGroupEntrySerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.username', read_only=True)
    events_display = serializers.SerializerMethodField()
    members = SchoolGroupMemberSerializer(many=True, read_only=True)
    participants = SchoolGroupMemberSerializer(source='members', many=True, read_only=True)
    leader_user_details = serializers.SerializerMethodField()
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = SchoolGroupEntry
        fields = [
            'id', 'school', 'school_name', 'group_id', 'group_class', 'gender_category',
            'participant_count', 'leader_full_name', 'leader_user', 'leader_user_details',
            'events', 'events_display', 'members', 'participants', 'status', 'review_notes',
            'reviewed_at', 'reviewed_by', 'reviewed_by_username',
            'source', 'submitted_at', 'updated_at',
        ]
        read_only_fields = ['submitted_at', 'updated_at', 'reviewed_at', 'reviewed_by']

    def get_events_display(self, obj):
        return [{"id": e.id, "name": e.name} for e in obj.events.all()]

    def get_leader_user_details(self, obj):
        leader = getattr(obj, 'leader_user', None)
        if leader is None:
            return None
        temporary_password = None
        try:
            request = self.context.get('request')
            requester = getattr(request, 'user', None) if request is not None else None
            if (
                requester is not None
                and getattr(requester, 'is_authenticated', False)
                and getattr(requester, 'role', None) == 'school'
                and requester.id == obj.school_id
                and leader.must_reset_password
                and leader.temporary_password_encrypted
            ):
                payload = signing.loads(leader.temporary_password_encrypted)
                temporary_password = payload.get('p')
        except Exception:
            temporary_password = None
        return {
            'id': leader.id,
            'username': leader.username,
            'first_name': leader.first_name,
            'last_name': leader.last_name,
            'registration_id': leader.registration_id,
            'approval_status': leader.approval_status,
            'temporary_password': temporary_password,
        }


class AdminSchoolGroupApproveRequestSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class AdminSchoolGroupRejectRequestSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)


class SchoolGroupLeaderCredentialsSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    section = serializers.CharField(allow_blank=True, allow_null=True)
    user_id = serializers.IntegerField()


class AdminSchoolGroupApproveResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    group = SchoolGroupEntrySerializer()
    user_credentials = SchoolGroupLeaderCredentialsSerializer()


class AdminSchoolGroupRejectResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    group = SchoolGroupEntrySerializer()


class SchoolVolunteerAssignmentSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.username', read_only=True)
    school_email = serializers.CharField(source='school.email', read_only=True)
    volunteer_name = serializers.CharField(source='volunteer.username', read_only=True)
    volunteer_email = serializers.CharField(source='volunteer.email', read_only=True)
    
    class Meta:
        model = SchoolVolunteerAssignment
        fields = ['id', 'school', 'school_name', 'school_email', 'volunteer', 'volunteer_name',
                 'volunteer_email', 'assigned_at', 'assigned_by', 'is_active']
        read_only_fields = ['assigned_at', 'assigned_by']


class SchoolStandingSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.username', read_only=True)
    school_category = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()
    
    class Meta:
        model = SchoolStanding
        fields = ['id', 'school', 'school_name', 'school_category', 'total_points', 
                 'total_gold', 'total_silver', 'total_bronze', 'total_participants', 
                 'last_updated', 'rank']
        read_only_fields = ['total_points', 'total_gold', 'total_silver', 'total_bronze', 
                          'total_participants', 'last_updated']
    
    def get_school_category(self, obj):
        # Get the school's category from the related School model
        if hasattr(obj, 'school') and obj.school.school:
            return obj.school.school.category
        return None
    
    def get_rank(self, obj):
        # Calculate rank based on points
        standings = SchoolStanding.objects.all().order_by('-total_points', '-total_gold', '-total_silver')
        ranks = list(standings.values_list('id', flat=True))
        try:
            return ranks.index(obj.id) + 1
        except ValueError:
            return None


class IDSignupRequestSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField()
    issued_id_code = serializers.CharField(source='issued_id.id_code', read_only=True)
    
    class Meta:
        model = IDSignupRequest
        fields = ['id', 'issued_id', 'issued_id_code', 'user', 'user_details', 
                 'requested_at', 'status', 'reviewed_by', 'reviewed_at', 'notes']
        read_only_fields = ['requested_at', 'reviewed_by', 'reviewed_at']
    
    def get_user_details(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'email': obj.user.email,
                'first_name': obj.user.first_name,
                'last_name': obj.user.last_name,
                'role': obj.user.role,
            }
        return None
