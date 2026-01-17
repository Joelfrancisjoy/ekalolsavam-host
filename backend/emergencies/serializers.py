from rest_framework import serializers

from .models import Emergency
from events.models import Venue


class EmergencyPublicInitiateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[c[0] for c in Emergency.EMERGENCY_TYPE_CHOICES])
    severity = serializers.ChoiceField(
        choices=[c[0] for c in Emergency.SEVERITY_CHOICES],
        required=False,
        allow_blank=True,
    )
    venue_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_venue_id(self, value):
        if value is None:
            return None
        try:
            venue = Venue.objects.get(pk=value)
        except Venue.DoesNotExist as exc:
            raise serializers.ValidationError("Venue not found") from exc
        return venue

    def create(self, validated_data):
        venue = validated_data.get("venue_id")
        emergency_type = validated_data["type"]
        severity = validated_data.get("severity") or ""
        emergency = Emergency.objects.create(
            emergency_type=emergency_type,
            venue=venue,
            severity=severity,
            created_from="public_button",
        )
        return emergency


class EmergencyVolunteerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Emergency
        fields = [
            "emergency_type",
            "person_role",
            "person_id_value",
            "event",
            "venue",
            "category",
            "cause_type",
            "cause_description",
            "severity",
        ]


class EmergencyVolunteerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Emergency
        fields = [
            "person_role",
            "person_id_value",
            "event",
            "venue",
            "category",
            "cause_type",
            "cause_description",
            "severity",
            "status",
        ]


class EmergencyListSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source="venue.name", read_only=True)

    class Meta:
        model = Emergency
        fields = [
            "id",
            "emergency_type",
            "person_role",
            "person_id_value",
            "cause_type",
            "cause_description",
            "event",
            "category",
            "venue",
            "venue_name",
            "status",
            "severity",
            "created_at",
        ]
