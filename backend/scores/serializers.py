from rest_framework import serializers
from .models import Score, Result, RecheckRequest


class ScoreSerializer(serializers.ModelSerializer):
    judge_name = serializers.CharField(source='judge.username', read_only=True)
    participant_name = serializers.CharField(
        source='participant.username', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)

    class Meta:
        model = Score
        fields = [
            'id', 'event', 'event_name', 'participant', 'participant_name',
            'judge', 'judge_name', 'technical_skill', 'artistic_expression',
            'stage_presence', 'overall_impression', 'criteria_scores',
            'total_score', 'notes', 'submitted_at', 'updated_at'
        ]
        read_only_fields = ['judge', 'total_score',
                            'submitted_at', 'updated_at']


class ResultSerializer(serializers.ModelSerializer):
    participant_details = serializers.SerializerMethodField()
    is_recheck_allowed = serializers.ReadOnlyField()
    chest_number = serializers.ReadOnlyField()
    full_name = serializers.SerializerMethodField()
    category = serializers.CharField(source='event.category', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    recheck_request_status = serializers.SerializerMethodField()
    recheck_request_id = serializers.SerializerMethodField()

    class Meta:
        model = Result
        fields = [
            'id', 'event', 'participant', 'total_score', 'rank', 'published',
            'published_at', 'participant_details', 'is_recheck_allowed',
            'chest_number', 'full_name', 'category', 'event_name',
            'recheck_request_status', 'recheck_request_id'
        ]

    def get_participant_details(self, obj):
        from users.serializers import UserSerializer
        return UserSerializer(obj.participant).data

    def get_full_name(self, obj):
        """Get participant's full name"""
        full_name = f"{obj.participant.first_name} {obj.participant.last_name}".strip()
        return full_name if full_name else obj.participant.username

    def get_recheck_request_status(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if not user or getattr(user, 'role', None) != 'student':
            return None
        if obj.participant_id != user.id:
            return None
        rr = RecheckRequest.objects.filter(
            result=obj, participant=user).order_by('-submitted_at').first()
        return rr.status if rr else None

    def get_recheck_request_id(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if not user or getattr(user, 'role', None) != 'student':
            return None
        if obj.participant_id != user.id:
            return None
        rr = RecheckRequest.objects.filter(
            result=obj, participant=user).order_by('-submitted_at').first()
        return str(rr.recheck_request_id) if rr else None


class RecheckRequestSerializer(serializers.ModelSerializer):
    """Serializer for RecheckRequest model"""

    class Meta:
        model = RecheckRequest
        fields = [
            'recheck_request_id', 'result', 'participant', 'full_name',
            'category', 'event_name', 'chest_number', 'final_score',
            'reason', 'assigned_volunteer', 'status', 'submitted_at', 'accepted_at'
        ]
        read_only_fields = [
            'recheck_request_id', 'full_name', 'category', 'event_name',
            'chest_number', 'final_score', 'assigned_volunteer', 'status',
            'submitted_at', 'accepted_at'
        ]


class RecheckRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating recheck requests"""

    class Meta:
        model = RecheckRequest
        fields = ['result']

    def validate_result(self, value):
        """Validate that the result belongs to the requesting participant"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if value.participant != request.user:
                raise serializers.ValidationError(
                    "You can only request re-check for your own results."
                )
        return value

    def create(self, validated_data):
        """Create a recheck request with auto-populated fields"""
        request = self.context.get('request')
        result = validated_data['result']

        # Find assigned volunteer for this event
        assigned_volunteer = None
        if result.event.volunteers.exists():
            # Get the first assigned volunteer (in real implementation,
            # you might have more sophisticated assignment logic)
            assigned_volunteer = result.event.volunteers.first()

        if not assigned_volunteer:
            raise serializers.ValidationError(
                "No volunteer is assigned to this event. Cannot process re-check request."
            )

        # Create the recheck request
        recheck_request = RecheckRequest.objects.create(
            result=result,
            participant=request.user,
            assigned_volunteer=assigned_volunteer
        )

        return recheck_request


class RecheckRequestDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for volunteer view of recheck requests"""
    # Map backend fields to frontend expected field names
    id = serializers.CharField(source='recheck_request_id', read_only=True)
    participant_name = serializers.CharField(
        source='full_name', read_only=True)
    participant_chess_number = serializers.CharField(
        source='chest_number', read_only=True)
    event_category = serializers.CharField(source='category', read_only=True)
    created_at = serializers.DateTimeField(
        source='submitted_at', read_only=True)
    participant_username = serializers.CharField(
        source='participant.username', read_only=True)
    event_id = serializers.IntegerField(
        source='result.event.id', read_only=True)

    # Additional fields for detailed view
    participant_school = serializers.SerializerMethodField()
    participant_class = serializers.SerializerMethodField()
    event_date = serializers.SerializerMethodField()
    event_venue = serializers.SerializerMethodField()
    current_position = serializers.SerializerMethodField()
    current_total_score = serializers.CharField(
        source='final_score', read_only=True)
    # Directly expose stored reason text (allow null/blank)
    reason = serializers.CharField(
        read_only=True, allow_null=True, allow_blank=True)

    class Meta:
        model = RecheckRequest
        fields = [
            'id', 'recheck_request_id', 'result', 'participant', 'participant_username',
            'participant_name', 'participant_chess_number', 'participant_school',
            'participant_class', 'event_name', 'event_category', 'event_date',
            'event_venue', 'event_id', 'final_score', 'current_position',
            'current_total_score', 'assigned_volunteer', 'status', 'created_at',
            'submitted_at', 'accepted_at', 'reason'
        ]
        read_only_fields = [
            'id', 'recheck_request_id', 'result', 'participant', 'participant_username',
            'participant_name', 'participant_chess_number', 'participant_school',
            'participant_class', 'event_name', 'event_category', 'event_date',
            'event_venue', 'event_id', 'final_score', 'current_position',
            'current_total_score', 'assigned_volunteer', 'created_at', 'submitted_at'
        ]

    def get_participant_school(self, obj):
        """Get participant's school name"""
        try:
            if hasattr(obj.participant, 'school') and obj.participant.school:
                return obj.participant.school.name
        except Exception:
            pass
        return None

    def get_participant_class(self, obj):
        """Get participant's class"""
        return getattr(obj.participant, 'student_class', None)

    def get_event_date(self, obj):
        """Get event date"""
        try:
            if obj.result and obj.result.event:
                return str(obj.result.event.date)
        except Exception:
            pass
        return None

    def get_event_venue(self, obj):
        """Get event venue name"""
        try:
            if obj.result and obj.result.event and obj.result.event.venue:
                # venue is a ForeignKey, get the name
                return obj.result.event.venue.name
        except Exception:
            pass
        return None

    def get_current_position(self, obj):
        """Get current position/rank"""
        try:
            if obj.result:
                return obj.result.rank
        except Exception:
            pass
        return None
