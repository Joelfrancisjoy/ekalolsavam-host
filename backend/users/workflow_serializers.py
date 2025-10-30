from rest_framework import serializers
from .workflow_models import (
    AdminIssuedID,
    SchoolParticipant,
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
    
    class Meta:
        model = SchoolParticipant
        fields = ['id', 'school', 'school_name', 'participant_id', 'first_name', 'last_name',
                 'student_class', 'events', 'events_display', 'submitted_at', 
                 'verified_by_volunteer', 'verified_at', 'volunteer']
        read_only_fields = ['submitted_at', 'verified_by_volunteer', 'verified_at', 'volunteer']
    
    def get_events_display(self, obj):
        return [{"id": e.id, "name": e.name} for e in obj.events.all()]


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
