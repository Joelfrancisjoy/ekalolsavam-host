from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from users.permissions import IsAdminRole
from .models import Event, Venue, EventRegistration, Judge, ParticipantVerification
from .serializers import EventSerializer, VenueSerializer, EventRegistrationSerializer, JudgeSerializer, ParticipantVerificationSerializer
from .services.event_state import transition_event, can_transition
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404


class VenueListCreateView(generics.ListCreateAPIView):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer

    # Allow any authenticated user to list venues; only admins can create
    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class VenueDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer

    # Authenticated users can read; only admins can update/delete
    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class JudgeListCreateView(generics.ListCreateAPIView):
    queryset = Judge.objects.all()
    serializer_class = JudgeSerializer
    permission_classes = [IsAdminRole]


class JudgeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Judge.objects.all()
    serializer_class = JudgeSerializer
    permission_classes = [IsAdminRole]


class EventListCreateView(generics.ListCreateAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    # Authenticated users can list events; only admins can create
    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get_queryset(self):
        queryset = Event.objects.all()
        category = self.request.query_params.get('category', None)
        date = self.request.query_params.get('date', None)
        published_only = self.request.query_params.get('published_only', None)

        if category:
            queryset = queryset.filter(category=category)
        if date:
            queryset = queryset.filter(date=date)
        if published_only and published_only.lower() == 'true':
            queryset = queryset.filter(status__in=[
                                       "published", "registration_closed", "in_progress", "scoring_closed", "results_published", "archived"])

        return queryset


@method_decorator(csrf_exempt, name='dispatch')
class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    # Authenticated users can read; only admins can update/delete
    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def perform_destroy(self, instance: Event):
        """
        When an event is deleted, email all assigned judges and volunteers that
        the event was removed and they are relieved of duties.
        """
        try:
            try:
                subject = f"Event Cancelled: {instance.name}"
                message = (
                    f"The event '{instance.name}' scheduled on {instance.date} at "
                    f"{getattr(instance.venue, 'name', '')} has been removed by the administrator.\n\n"
                    "You have been relieved of your duties for this event.\n\n"
                    "Regards,\nE-Kalolsavam Admin"
                )
                emails = set()
                # Judges (M2M to users)
                try:
                    emails.update(
                        [u.email for u in instance.judges.all() if u.email])
                except Exception:
                    pass
                # Volunteers (new M2M)
                try:
                    emails.update(
                        [u.email for u in instance.volunteers.all() if u.email])
                except Exception:
                    pass
                if emails:
                    send_mail(subject, message, None, list(
                        emails), fail_silently=True)
            except Exception:
                # Non-blocking - continue deletion even if mail fails
                pass
            # Proceed with actual delete
            return super().perform_destroy(instance)
        except Exception:
            # As a last resort, avoid 500s: perform raw delete
            try:
                instance.delete()
            except Exception:
                pass
            return


@api_view(['POST'])
@permission_classes([IsAdminRole])
def assign_volunteers(request, pk):
    """
    Assign volunteers to an event. Body: { "volunteer_ids": [1,2,3] }
    Only users with role=volunteer are allowed; others are ignored/raise error.
    """
    event = get_object_or_404(Event, pk=pk)
    volunteer_ids = request.data.get('volunteer_ids', [])
    if not isinstance(volunteer_ids, list):
        return Response({'error': 'volunteer_ids must be a list of user IDs'}, status=status.HTTP_400_BAD_REQUEST)

    from users.models import User
    volunteers = list(User.objects.filter(
        id__in=volunteer_ids, role='volunteer'))
    if len(volunteers) != len(set(volunteer_ids)):
        return Response({'error': 'Some users not found or not volunteers'}, status=status.HTTP_400_BAD_REQUEST)

    event.volunteers.set(volunteers)
    event.save()

    # Try to create shifts and volunteer assignments if volunteers app exists
    created_assignments = {}
    try:
        from volunteers.models import Shift, VolunteerAssignment
        # Ensure a default shift for the event (if none) using event's times
        shift, _ = Shift.objects.get_or_create(
            event=event,
            start_time=event.start_time,
            end_time=event.end_time,
        )
        for v in volunteers:
            va, _ = VolunteerAssignment.objects.get_or_create(
                volunteer=v, shift=shift)
            created_assignments[v.id] = va.shift_id
    except Exception:
        # volunteers app not installed or other issue; continue without shifts
        pass

    # Notify volunteers by email with shift info when available
    try:
        for v in volunteers:
            subject = f"Volunteer Assignment: {event.name}"
            shift_id = created_assignments.get(v.id)
            shift_line = f"\nShift ID: {shift_id}" if shift_id else ""
            message = (
                f"You have been assigned as a volunteer for '{event.name}'.\n"
                f"Date: {event.date}\nTime: {event.start_time}-{event.end_time}\n"
                f"Venue: {getattr(event.venue, 'name', '')}{shift_line}\n\n"
                "Please be present on time."
            )
            if v.email:
                send_mail(subject, message, None, [
                          v.email], fail_silently=True)
    except Exception:
        pass

    return Response(EventSerializer(event).data)


class EventRegistrationView(generics.ListCreateAPIView):
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return EventRegistration.objects.all()
        return EventRegistration.objects.filter(participant=user)

    def perform_create(self, serializer):
        registration = serializer.save(participant=self.request.user)

        # Enforce registration rule: Registration only allowed when event is published
        if registration.event.status != "published":
            from django.core.exceptions import ValidationError
            raise ValidationError("Registrations are closed for this event")

        # Generate a unique chess number for the registration
        if not registration.chess_number:
            import uuid
            # Generate a unique chess number using event ID and participant ID
            chess_number = f"{registration.event.id:03d}{registration.participant.id:05d}"
            registration.chess_number = chess_number
            registration.save()

        # Send a confirmation email to the student; do not block on failures
        try:
            participant = self.request.user
            event = registration.event
            subject = 'Event Registration Confirmed'
            message = (
                f"Hello {participant.first_name} {participant.last_name},\n\n"
                f"You have successfully registered for the event '{event.name}'.\n"
                f"Category: {event.get_category_display()}\n"
                f"Date: {event.date}\n"
                f"Time: {event.start_time} - {event.end_time}\n"
                f"Venue: {getattr(event.venue, 'name', '')}\n"
                f"Chess Number: {registration.chess_number}\n\n"
                "Thank you for registering. All the best!"
            )
            # From email will use EMAIL_HOST_USER; fallback to None lets Django use default
            send_mail(subject, message, None, [
                      participant.email], fail_silently=True)
        except Exception:
            # Intentionally ignore email errors
            pass

        # Send notification emails to assigned judges and volunteers
        try:
            participant = self.request.user
            event = registration.event
            notification_subject = f"New Participant Registration: {event.name}"
            notification_message = (
                f"A new participant has registered for the event '{event.name}'.\n\n"
                f"Participant Details:\n"
                f"Name: {participant.first_name} {participant.last_name}\n"
                f"Email: {participant.email}\n"
                f"Chess Number: {registration.chess_number}\n\n"
                f"Event Details:\n"
                f"Category: {event.get_category_display()}\n"
                f"Date: {event.date}\n"
                f"Time: {event.start_time} - {event.end_time}\n"
                f"Venue: {getattr(event.venue, 'name', '')}\n\n"
                "Please prepare for the event accordingly."
            )

            # Collect emails of assigned judges and volunteers
            recipient_emails = set()

            # Add judge emails
            for judge in event.judges.all():
                if judge.email:
                    recipient_emails.add(judge.email)

            # Add volunteer emails
            for volunteer in event.volunteers.all():
                if volunteer.email:
                    recipient_emails.add(volunteer.email)

            # Send email to all recipients
            if recipient_emails:
                send_mail(
                    notification_subject,
                    notification_message,
                    None,
                    list(recipient_emails),
                    fail_silently=True
                )
        except Exception:
            # Intentionally ignore email errors for judges/volunteers
            pass

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class UserEventRegistrationsView(generics.ListAPIView):
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EventRegistration.objects.filter(participant=self.request.user)


# ---------- Judge helper endpoints ----------
class MyAssignedEventsView(generics.ListAPIView):
    """
    List events assigned to the current judge. Admins get empty by default here
    (use the regular listing instead).
    """
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'judge':
            # Only published events should be visible in the dashboard
            return Event.objects.filter(
                judges=user,
                status__in=["published", "registration_closed", "in_progress",
                            "scoring_closed", "results_published", "archived"]
            ).order_by('date', 'start_time')
        return Event.objects.none()


class ParticipantsByEventForJudgeView(generics.ListAPIView):
    """
    List participants (registrations) for a given event, only if the current
    judge is assigned to that event. Supports filtering by chess number.

    For judges: Only returns verified participants (those verified by volunteers).
    For volunteers: Returns all registered participants.
    """
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        event_id = self.kwargs.get('pk')
        event = get_object_or_404(Event, pk=event_id)

        user = self.request.user
        # Allow judges and volunteers assigned to the event
        is_assigned_judge = getattr(
            user, 'role', None) == 'judge' and event.judges.filter(pk=user.pk).exists()
        is_assigned_volunteer = getattr(
            user, 'role', None) == 'volunteer' and event.volunteers.filter(pk=user.pk).exists()

        if is_assigned_judge:
            # For judges: Only show participants who have been verified by volunteers
            verified_participant_ids = ParticipantVerification.objects.filter(
                event=event,
                status='verified'
            ).values_list('participant_id', flat=True).distinct()

            queryset = EventRegistration.objects.filter(
                event=event,
                participant_id__in=verified_participant_ids
            ).select_related('participant', 'participant__school')

            # Filter by chess number if provided
            chess_number = self.request.query_params.get('chess_number')
            if chess_number:
                queryset = queryset.filter(chess_number=chess_number)

            return queryset
        elif is_assigned_volunteer:
            # For volunteers: Show all registered participants
            queryset = EventRegistration.objects.filter(
                event=event).select_related('participant', 'participant__school')

            # Filter by chess number if provided
            chess_number = self.request.query_params.get('chess_number')
            if chess_number:
                queryset = queryset.filter(chess_number=chess_number)

            return queryset
        return EventRegistration.objects.none()


# ---------- Participant Verification endpoints ----------

class ParticipantVerificationView(generics.ListCreateAPIView):
    """
    List and create participant verifications for volunteers
    """
    serializer_class = ParticipantVerificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'volunteer':
            return ParticipantVerification.objects.filter(volunteer=user)
        elif user.role == 'admin':
            return ParticipantVerification.objects.all()
        return ParticipantVerification.objects.none()

    def perform_create(self, serializer):
        # Enforce verification rule: Verification only allowed when event is in registration_closed or in_progress status
        event = serializer.validated_data['event']
        if event.status not in ["registration_closed", "in_progress"]:
            from django.core.exceptions import ValidationError
            raise ValidationError("Verification not allowed at this stage")

        serializer.save(volunteer=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_participant_by_chess_number(request):
    """
    Verify a participant by chess number for a specific event and send details to assigned judges
    """
    if request.user.role != 'volunteer':
        return Response({'error': 'Only volunteers can verify participants'},
                        status=status.HTTP_403_FORBIDDEN)

    chess_number = request.data.get('chess_number')
    event_id = request.data.get('event_id')
    notes = request.data.get('notes', '')

    if not chess_number or not event_id:
        return Response({'error': 'Chess number and event_id are required'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        # Find the registration with this chess number for the specified event
        registration = EventRegistration.objects.select_related('participant', 'participant__school', 'event').get(
            chess_number=chess_number,
            event_id=event_id
        )

        # Enforce verification rule: Verification only allowed when event is in registration_closed or in_progress status
        if registration.event.status not in ["registration_closed", "in_progress"]:
            return Response({
                'error': 'Verification not allowed at this stage'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if already verified by this volunteer
        existing_verification = ParticipantVerification.objects.filter(
            event=registration.event,
            participant=registration.participant,
            volunteer=request.user
        ).first()

        if existing_verification:
            return Response({
                'error': 'Participant already verified by you',
                'verification': ParticipantVerificationSerializer(existing_verification).data
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create verification record
        verification = ParticipantVerification.objects.create(
            event=registration.event,
            participant=registration.participant,
            chess_number=chess_number,
            volunteer=request.user,
            status='verified',
            notes=notes
        )

        # Send participant details to assigned judges
        try:
            send_participant_details_to_judges(verification)
        except Exception as e:
            # Log the error but don't fail the verification
            print(f"Error sending participant details to judges: {str(e)}")

        serializer = ParticipantVerificationSerializer(verification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except EventRegistration.DoesNotExist:
        return Response({'error': 'No participant found with this chess number for the specified event'},
                        status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_participant_details_to_judges(verification):
    """
    Send participant details to assigned judges for the event
    """
    from django.core.mail import send_mail
    from django.conf import settings

    event = verification.event
    participant = verification.participant

    # Get assigned judges for this event
    assigned_judges = event.judges.all()

    if not assigned_judges.exists():
        return

    # Prepare participant details
    participant_category = participant.section or 'N/A'
    school_name = participant.school.name if participant.school else 'N/A'
    student_class = participant.student_class or 'N/A'

    subject = f"Participant Verification - {event.name}"

    message = f"""
    A participant has been verified for the event: {event.name}
    
    Participant Details:
    - Name: {participant.first_name} {participant.last_name}
    - Chess Number: {verification.chess_number}
    - Category: {participant_category}
    - School: {school_name}
    - Class: {student_class}
    - Event Date: {event.date}
    - Event Time: {event.start_time} - {event.end_time}
    - Venue: {event.venue.name}
    
    Verification Details:
    - Verified by: {verification.volunteer.first_name} {verification.volunteer.last_name}
    - Verification Time: {verification.verification_time}
    - Notes: {verification.notes or 'No additional notes'}
    
    Please prepare for judging this participant.
    """

    # Send email to all assigned judges
    judge_emails = [judge.email for judge in assigned_judges if judge.email]

    if judge_emails:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            judge_emails,
            fail_silently=True,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_volunteer_assignments(request):
    """
    Get events assigned to the current volunteer
    """
    if request.user.role != 'volunteer':
        return Response({'error': 'Only volunteers can access this endpoint'},
                        status=status.HTTP_403_FORBIDDEN)

    events = []
    # 1) Legacy volunteer shifts (if volunteers app is used)
    try:
        from volunteers.models import VolunteerAssignment
        shift_assignments = VolunteerAssignment.objects.filter(
            volunteer=request.user
        ).select_related('shift__event', 'shift__event__venue')
        for a in shift_assignments:
            events.append({
                'id': a.shift.event.id,
                'name': a.shift.event.name,
                'date': a.shift.event.date,
                'start_time': a.shift.start_time,
                'end_time': a.shift.end_time,
                'venue': getattr(a.shift.event.venue, 'name', ''),
                'shift_id': a.shift.id
            })
    except Exception:
        # If volunteers app is absent, just ignore
        pass

    # 2) New direct assignments via Event.volunteers M2M
    direct_events = Event.objects.filter(
        volunteers=request.user).select_related('venue')
    for ev in direct_events:
        events.append({
            'id': ev.id,
            'name': ev.name,
            'date': ev.date,
            'start_time': ev.start_time,
            'end_time': ev.end_time,
            'venue': getattr(ev.venue, 'name', ''),
            'shift_id': None
        })

    # Deduplicate by (id, shift_id) to avoid duplicates when both sources present
    uniq = {}
    for e in events:
        key = (e['id'], e['shift_id'])
        uniq[key] = e
    return Response(list(uniq.values()))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def volunteer_check_in(request):
    """
    Allow volunteers to check in for their shifts
    """
    if request.user.role != 'volunteer':
        return Response({'error': 'Only volunteers can check in'},
                        status=status.HTTP_403_FORBIDDEN)

    shift_id = request.data.get('shift_id')
    if not shift_id:
        return Response({'error': 'shift_id is required'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        from volunteers.models import VolunteerAssignment
        assignment = VolunteerAssignment.objects.get(
            volunteer=request.user,
            shift_id=shift_id
        )

        if assignment.checked_in:
            return Response({'error': 'Already checked in'},
                            status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        assignment.checked_in = True
        assignment.check_in_time = timezone.now()
        assignment.save()

        return Response({'message': 'Successfully checked in'}, status=status.HTTP_200_OK)

    except VolunteerAssignment.DoesNotExist:
        return Response({'error': 'Assignment not found'},
                        status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminRole])
def transition_event_status(request, pk):
    """
    Transition event to a new status.
    POST /api/events/{id}/transition/
    { "to": "published" }
    """
    try:
        event = get_object_or_404(Event, pk=pk)
        target_status = request.data.get('to')

        if not target_status:
            return Response(
                {'error': 'Missing required field: to'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate transition
        if not can_transition(event.status, target_status):
            return Response(
                {'error': f'Invalid transition from {event.status} → {target_status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Perform transition
        transition_event(event, target_status)

        return Response({
            'id': event.id,
            'status': event.status,
            'message': f'Event status changed to {target_status}'
        })

    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
