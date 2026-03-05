from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import VolunteerShift, VolunteerAssignment
from .serializers import VolunteerShiftSerializer, VolunteerAssignmentSerializer

class VolunteerShiftListView(generics.ListCreateAPIView):
    serializer_class = VolunteerShiftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return VolunteerShift.objects.all()
        elif user.role == 'volunteer':
            # Return shifts assigned to this volunteer
            assigned_shifts = VolunteerAssignment.objects.filter(volunteer=user).values_list('shift_id', flat=True)
            return VolunteerShift.objects.filter(id__in=assigned_shifts)
        return VolunteerShift.objects.none()

class VolunteerAssignmentView(generics.ListCreateAPIView):
    serializer_class = VolunteerAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return VolunteerAssignment.objects.all()
        elif user.role == 'volunteer':
            return VolunteerAssignment.objects.filter(volunteer=user)
        return VolunteerAssignment.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'admin':
            serializer.save()
            return
        if user.role == 'volunteer':
            serializer.save(volunteer=user)
            return
        raise PermissionDenied("Only admins or volunteers can create shift assignments")