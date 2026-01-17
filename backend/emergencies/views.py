from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from users.models import User
from notifications.models import Notification

from .serializers import (
    EmergencyPublicInitiateSerializer,
    EmergencyListSerializer,
    EmergencyVolunteerCreateSerializer,
    EmergencyVolunteerUpdateSerializer,
)
from .models import Emergency


@api_view(["POST"])
@permission_classes([AllowAny])
def public_initiate_emergency(request):
    serializer = EmergencyPublicInitiateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    emergency = serializer.save()
    _handle_post_severity_actions(emergency)

    _broadcast_emergency_notification(emergency)

    output = EmergencyListSerializer(emergency).data
    return Response(output, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_active_emergencies(request):
    qs = Emergency.objects.filter(status="active").order_by("-created_at")
    serializer = EmergencyListSerializer(qs, many=True)
    return Response(serializer.data)


def _handle_post_severity_actions(emergency: Emergency) -> None:
    severity = emergency.severity or ""
    if severity in ["red", "orange", "yellow"] and not emergency.requires_schedule_adjustment:
        emergency.requires_schedule_adjustment = True
        emergency.save(update_fields=["requires_schedule_adjustment"])


def _broadcast_emergency_notification(emergency: Emergency) -> None:
    try:
        title = "Emergency Alert"
        venue_name = emergency.venue.name if emergency.venue else "Unknown venue"
        sev = (emergency.severity or "").upper() or "UNSPECIFIED"
        message = f"{emergency.get_emergency_type_display()} at {venue_name}. Severity: {sev}."
        volunteer_users = User.objects.filter(role__iexact="volunteer", is_active=True)
        Notification.objects.bulk_create(
            [
                Notification(
                    user=u,
                    title=title,
                    message=message,
                    notification_type="system",
                )
                for u in volunteer_users
            ]
        )
    except Exception:
        # Notifications are best-effort; do not break emergency creation if notifications fail.
        pass


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def volunteer_create_emergency(request):
    user = request.user
    if str(getattr(user, "role", "") or "").lower() != "volunteer":
        return Response({"error": "Only volunteers can create emergencies"}, status=status.HTTP_403_FORBIDDEN)

    serializer = EmergencyVolunteerCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    emergency = serializer.save(created_by=user, created_from="volunteer")
    _handle_post_severity_actions(emergency)
    _broadcast_emergency_notification(emergency)
    output = EmergencyListSerializer(emergency).data
    return Response(output, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def volunteer_complete_emergency(request, pk):
    user = request.user
    if str(getattr(user, "role", "") or "").lower() != "volunteer":
        return Response({"error": "Only volunteers can update emergencies"}, status=status.HTTP_403_FORBIDDEN)

    emergency = get_object_or_404(Emergency, pk=pk)
    serializer = EmergencyVolunteerUpdateSerializer(emergency, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    emergency = serializer.save()
    _handle_post_severity_actions(emergency)
    output = EmergencyListSerializer(emergency).data
    return Response(output)
