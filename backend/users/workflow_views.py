from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.db import IntegrityError, transaction
from django.core.mail import send_mail
from django.core import signing
from django.utils import timezone
import secrets
import re
import os

from .models import User
from .workflow_models import (
    AdminIssuedID, SchoolParticipant, SchoolVolunteerAssignment,
    SchoolStanding, IDSignupRequest
)
from .workflow_serializers import (
    AdminIssuedIDSerializer, SchoolParticipantSerializer,
    SchoolVolunteerAssignmentSerializer, SchoolStandingSerializer,
    IDSignupRequestSerializer
)
from .permissions import IsAdminRole, IsAdminOrVolunteerRole, IsAdminOrStudentSignupVolunteer


def _ensure_school_user_linked_to_school_profile(school_user):
    if school_user is None:
        return None
    if getattr(school_user, 'school', None) is not None:
        return school_user.school

    try:
        from .models import School
        match = School.objects.filter(name__iexact=(school_user.username or '').strip()).first()
        if match is None:
            return None
        school_user.school = match
        school_user.save(update_fields=['school'])
        return match
    except Exception:
        return None


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_link_school_user_to_school_profile(request):
    username = (request.data.get('username') or '').strip()
    school_id = request.data.get('school_id')

    if not username:
        return Response({'error': 'username is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not school_id:
        return Response({'error': 'school_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        school_id = int(school_id)
    except Exception:
        return Response({'error': 'school_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

    from .models import School
    school_obj = School.objects.filter(pk=school_id).first()
    if school_obj is None:
        return Response({'error': 'School not found'}, status=status.HTTP_404_NOT_FOUND)

    school_user = User.objects.filter(username__iexact=username, role='school').first()
    if school_user is None:
        return Response({'error': 'School user not found'}, status=status.HTTP_404_NOT_FOUND)

    school_user.school = school_obj
    school_user.save(update_fields=['school'])

    return Response({
        'message': 'School user linked successfully',
        'user_id': school_user.id,
        'username': school_user.username,
        'school_id': school_obj.id,
        'school_name': school_obj.name,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_allowed_events(request):
    user = request.user
    if getattr(user, 'role', None) != 'student':
        return Response({'error': 'Only students can access this resource'}, status=status.HTTP_403_FORBIDDEN)

    participant = None
    registration_id = (getattr(user, 'registration_id', None) or '').strip()
    if registration_id.startswith('SPP-'):
        try:
            participant_pk = int(registration_id.split('-', 1)[1])
            participant = SchoolParticipant.objects.select_related('school').prefetch_related('events').filter(pk=participant_pk).first()
        except Exception:
            participant = None

    if participant is None and getattr(user, 'school', None) is not None:
        try:
            participant = SchoolParticipant.objects.select_related('school').prefetch_related('events').filter(
                school__school=user.school,
                first_name__iexact=(user.first_name or ''),
                last_name__iexact=(user.last_name or ''),
            ).order_by('-submitted_at').first()
        except Exception:
            participant = None

    if participant is None:
        return Response({
            'event_ids': [],
            'participant_id': None,
            'school_id': getattr(getattr(user, 'school', None), 'id', None),
        })

    event_ids = list(participant.events.values_list('id', flat=True))
    return Response({
        'event_ids': event_ids,
        'participant_id': participant.pk,
        'school_id': getattr(getattr(user, 'school', None), 'id', None),
    })


def _generate_unique_student_username(participant_id, school_id):
    base = (participant_id or '').strip().lower()
    base = re.sub(r'[^a-z0-9._-]+', '', base)
    if not base:
        base = 'student'

    candidates = [base]
    if school_id is not None:
        candidates.append(f"{base}-{school_id}")

    for candidate in candidates:
        if not User.objects.filter(username=candidate).exists():
            return candidate

    suffix = 2
    while suffix <= 50:
        if school_id is not None:
            candidate = f"{base}-{school_id}-{suffix}"
        else:
            candidate = f"{base}-{suffix}"
        if not User.objects.filter(username=candidate).exists():
            return candidate
        suffix += 1

    raise ValueError('Unable to generate unique username')


def _student_placeholder_email(username):
    domain = 'students.ekalolsavam.local'
    candidate = f"{username}@{domain}"
    if not User.objects.filter(email=candidate).exists():
        return candidate

    suffix = 2
    while suffix <= 50:
        candidate = f"{username}-{suffix}@{domain}"
        if not User.objects.filter(email=candidate).exists():
            return candidate
        suffix += 1

    token = secrets.token_hex(3)
    return f"{username}-{token}@{domain}"


def _school_participant_registration_id(participant_pk):
    return f"SPP-{participant_pk}"


# Admin: Create School Accounts
class AdminCreateSchoolView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def create(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        school_model_id = request.data.get('school_model_id')  # ID from School model
        
        if not all([username, password, email]):
            return Response({'error': 'Username, password, and email are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create school user
        school_user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name or '',
            last_name=last_name or '',
            role='school',
            is_active=True
        )
        
        # Link to School model if provided
        if school_model_id:
            from .models import School
            try:
                school_obj = School.objects.get(id=school_model_id)
                school_user.school = school_obj
                school_user.save()
            except School.DoesNotExist:
                pass
        
        # Send email with credentials
        try:
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            subject = 'School Account Created - E-Kalolsavam'
            message = f'''Your school account has been created.
            
Username: {username}
Password: {password}

Please log in at {frontend_url}/login and change your password for security.
            
You can now submit participant data for your school.'''
            send_mail(subject, message, 'joelfrancisjoy@gmail.com', [email], fail_silently=True)
        except Exception:
            pass
        
        return Response({'message': 'School account created successfully', 
                        'username': username}, status=status.HTTP_201_CREATED)


# Admin: Generate IDs for Volunteers and Judges with name assignments
class AdminGenerateIDView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def create(self, request):
        role = request.data.get('role')  # 'student', 'volunteer' or 'judge'
        count = request.data.get('count', 1)
        assignments = request.data.get('assignments', [])  # List of {name, phone, student_class, school_id} dicts
        
        if role not in ['student', 'volunteer', 'judge']:
            return Response({'error': 'Invalid role. Must be student, volunteer or judge'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # If assignments provided, use that count; otherwise use count parameter
        if assignments:
            if not isinstance(assignments, list):
                return Response({'error': 'Assignments must be a list'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            count = len(assignments)
        else:
            try:
                count = int(count)
                if count < 1 or count > 100:
                    return Response({'error': 'Count must be between 1 and 100'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid count value'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        ids = []
        # Generate prefix based on role
        if role == 'volunteer':
            prefix = 'VOL'
        elif role == 'judge':
            prefix = 'JUD'
        elif role == 'student':
            prefix = 'STU'
        else:
            return Response({'error': 'Invalid role. Must be student, volunteer, or judge'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        for i in range(count):
            # Get assignment details if provided
            assigned_name = None
            assigned_phone = None
            notes = ''
            
            if assignments and i < len(assignments):
                assignment = assignments[i]
                assigned_name = assignment.get('name', '').strip() or None
                assigned_phone = assignment.get('phone', '').strip() or None
                notes = assignment.get('notes', '').strip()
            
            # Generate unique 4-digit random number ID
            max_attempts = 1000
            attempt = 0
            id_code = None
            
            while attempt < max_attempts:
                # Generate random 4-digit number (1000-9999)
                random_number = secrets.randbelow(9000) + 1000
                id_code = f"{prefix}{random_number}"
                
                # Check if ID already exists
                if not AdminIssuedID.objects.filter(id_code=id_code).exists():
                    break
                    
                attempt += 1
                id_code = None
            
            if id_code is None:
                return Response({
                    'error': f'Unable to generate unique ID after {max_attempts} attempts. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create the ID with assignment details
            admin_id = AdminIssuedID.objects.create(
                id_code=id_code,
                role=role,
                assigned_name=assigned_name,
                assigned_phone=assigned_phone,
                notes=notes,
                is_active=True,
                created_by=request.user
            )
            ids.append(AdminIssuedIDSerializer(admin_id).data)
        
        return Response({
            'ids': ids,
            'count': len(ids),
            'message': f'Successfully generated {len(ids)} {role} ID(s)'
        }, status=status.HTTP_201_CREATED)


# Public: Sign up with ID (for volunteers and judges)
class IDSignupView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    
    def create(self, request):
        id_code = request.data.get('id_code')
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        phone = request.data.get('phone')
        
        if not all([id_code, username, password, email, first_name, last_name]):
            return Response({'error': 'All fields are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Validate ID
        try:
            issued_id = AdminIssuedID.objects.get(id_code=id_code.strip().upper())
        except AdminIssuedID.DoesNotExist:
            return Response({'error': 'Invalid ID code. Please check and try again.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if ID is active
        if not issued_id.is_active:
            return Response({'error': 'This ID has been deactivated. Please contact admin.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if ID is already used
        if issued_id.is_used:
            return Response({'error': 'This ID has already been used for registration.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Verify name matches (if name was pre-assigned)
        if issued_id.assigned_name:
            provided_name = f"{first_name} {last_name}".strip().lower()
            assigned_name = issued_id.assigned_name.strip().lower()
            
            # Allow for minor variations but check substantial match
            if provided_name != assigned_name and assigned_name not in provided_name and provided_name not in assigned_name:
                return Response({
                    'error': f'Name mismatch. This ID is assigned to: {issued_id.assigned_name}. Please verify your details.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify phone matches (if phone was pre-assigned)
        if issued_id.assigned_phone and phone:
            # Normalize phone numbers for comparison
            provided_phone = ''.join(filter(str.isdigit, phone))
            assigned_phone = ''.join(filter(str.isdigit, issued_id.assigned_phone))
            
            if provided_phone != assigned_phone:
                return Response({
                    'error': 'Phone number does not match our records. Please verify your details.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username or email already exists
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create user with inactive status (requires admin verification)
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone or '',
            role=issued_id.role,
            approval_status='pending',
            is_active=False,  # Account inactive until admin verifies
            registration_id=id_code
        )
        
        # Mark ID as used
        issued_id.is_used = True
        issued_id.used_by = user
        from django.utils import timezone
        issued_id.used_at = timezone.now()
        issued_id.save()
        
        # Create signup request for admin review
        IDSignupRequest.objects.create(
            issued_id=issued_id,
            user=user,
            status='pending'
        )
        
        # Send email notification to user
        try:
            subject = f'{issued_id.role.title()} Registration Received - E-Kalolsavam'
            message = f'''Dear {first_name},

Your {issued_id.role} registration has been received with ID: {id_code}

Your account is currently pending admin verification. You will receive an email once your account is activated.

Username: {username}
Role: {issued_id.role.title()}

Please do not share your login credentials with anyone.

Thank you for joining E-Kalolsavam!
'''
            send_mail(subject, message, 'joelfrancisjoy@gmail.com', [email], fail_silently=True)
        except Exception:
            pass
        
        return Response({
            'message': f'Registration successful! Your {issued_id.role} account is pending admin verification. You will be notified via email once approved.',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'status': 'pending_verification'
            }
        }, status=status.HTTP_201_CREATED)


# Admin: List and approve signup requests
class IDSignupRequestListView(generics.ListAPIView):
    serializer_class = IDSignupRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminOrVolunteerRole]
    
    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'pending')
        
        # If status is 'all', return all requests regardless of status
        if status_filter == 'all':
            return IDSignupRequest.objects.all().order_by('-requested_at')
        else:
            return IDSignupRequest.objects.filter(status=status_filter).order_by('-requested_at')


class IDSignupRequestDetailView(generics.RetrieveUpdateAPIView):
    queryset = IDSignupRequest.objects.all()
    serializer_class = IDSignupRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminOrVolunteerRole]
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['approved', 'rejected']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if the current user is a volunteer trying to approve non-student requests
        user = request.user
        if user.role == 'volunteer':
            # Volunteers can only approve student signup requests
            if instance.issued_id.role != 'student':
                return Response(
                    {'error': 'Volunteers can only approve student registration requests'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        instance.status = new_status
        instance.reviewed_by = request.user
        from django.utils import timezone
        instance.reviewed_at = timezone.now()
        instance.notes = request.data.get('notes', '')
        instance.save()
        
        # Get the associated ID and user
        issued_id = instance.issued_id
        user_obj = instance.user
        
        # If approved, activate the user and mark ID as verified
        if new_status == 'approved':
            user_obj.approval_status = 'approved'
            user_obj.is_active = True
            user_obj.save()
            
            # Mark the ID as verified
            issued_id.is_verified = True
            issued_id.verified_by = request.user
            issued_id.verified_at = timezone.now()
            issued_id.save()
            
            # Send approval email
            try:
                subject = f'{user_obj.role.title()} Account Approved - E-Kalolsavam'
                message = f'''Dear {user_obj.first_name},

Congratulations! Your {user_obj.role} account has been approved and activated.

You can now log in to the E-Kalolsavam platform using your credentials:
Username: {user_obj.username}

Please keep your login credentials secure and do not share them with anyone.

Welcome to the E-Kalolsavam team!

Best regards,
E-Kalolsavam Admin Team
'''
                send_mail(subject, message, 'joelfrancisjoy@gmail.com', [user_obj.email], fail_silently=True)
            except Exception:
                pass
                
        elif new_status == 'rejected':
            user_obj.approval_status = 'rejected'
            user_obj.is_active = False
            user_obj.save()
            
            # Optionally, free up the ID for reuse
            if request.data.get('free_id', False):
                issued_id.is_used = False
                issued_id.used_by = None
                issued_id.used_at = None
                issued_id.save()
            
            # Send rejection email
            try:
                subject = f'{user_obj.role.title()} Registration Update - E-Kalolsavam'
                rejection_reason = instance.notes or 'verification failed'
                message = f'''Dear {user_obj.first_name},

Thank you for your interest in joining E-Kalolsavam as a {user_obj.role}.

After review, we regret to inform you that your registration could not be approved at this time.
Reason: {rejection_reason}

If you believe this is an error or have questions, please contact the admin team.

Thank you for your understanding.

Best regards,
E-Kalolsavam Admin Team
'''
                send_mail(subject, message, 'joelfrancisjoy@gmail.com', [user_obj.email], fail_silently=True)
            except Exception:
                pass
        
        return Response({
            'message': f'Request {new_status} successfully',
            'request': IDSignupRequestSerializer(instance).data
        })


# School: Submit participant data
class SchoolSubmitParticipantsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Check if user has school role
        if not hasattr(request.user, 'role') or request.user.role != 'school':
            return Response(
                {'error': 'Only school accounts can submit participants'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        participants_data = request.data.get('participants', [])
        
        if not participants_data:
            return Response({'error': 'No participants data provided'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        created = []
        for p_data in participants_data:
            # Validate required fields
            participant_id = p_data.get('participant_id')
            first_name = p_data.get('first_name')
            last_name = p_data.get('last_name')
            student_class = p_data.get('student_class')
            
            if not all([participant_id, first_name, last_name, student_class]):
                return Response({'error': f'Missing required fields for participant {p_data.get("participant_id", "unknown")}'},
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Validate student_class is between 1 and 12
            try:
                student_class_int = int(student_class)
                if student_class_int < 1 or student_class_int > 12:
                    return Response({'error': f'Student class must be between 1 and 12 for participant {participant_id}'},
                                  status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': f'Invalid student class for participant {participant_id}'},
                              status=status.HTTP_400_BAD_REQUEST)
            
            participant = SchoolParticipant.objects.create(
                school=request.user,
                participant_id=participant_id,
                first_name=first_name,
                last_name=last_name,
                student_class=student_class_int
            )
            
            # Add events if provided
            event_ids = p_data.get('event_ids', [])
            if event_ids:
                # Validate that all event IDs are integers
                try:
                    event_ids = [int(e_id) for e_id in event_ids]
                except (ValueError, TypeError):
                    return Response({'error': f'Invalid event ID format for participant {participant_id}'},
                                  status=status.HTTP_400_BAD_REQUEST)
                
                # Validate that all event IDs exist
                from events.models import Event
                valid_event_ids = Event.objects.filter(id__in=event_ids).values_list('id', flat=True)
                invalid_event_ids = set(event_ids) - set(valid_event_ids)
                if invalid_event_ids:
                    return Response({'error': f'Invalid event IDs: {list(invalid_event_ids)} for participant {participant_id}'},
                                  status=status.HTTP_400_BAD_REQUEST)
                
                participant.events.set(valid_event_ids)
            
            created.append(SchoolParticipantSerializer(participant).data)
        
        return Response({'participants': created, 'count': len(created)}, 
                       status=status.HTTP_201_CREATED)


# School: Generate Student IDs
class SchoolGenerateStudentIDView(generics.CreateAPIView):
    """
    Allows schools to generate student IDs for pre-registration.
    Students will use these IDs to sign up on the platform.
    """
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        if request.user.role != 'school':
            raise PermissionDenied("Only school accounts can generate student IDs")
        
        assignments = request.data.get('students', [])  # List of {name, phone, student_class} dicts
        
        if not assignments or not isinstance(assignments, list):
            return Response({'error': 'Students list is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if len(assignments) > 100:
            return Response({'error': 'Maximum 100 students per request'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        ids = []
        prefix = 'STU'
        
        for assignment in assignments:
            assigned_name = assignment.get('name', '').strip()
            assigned_phone = assignment.get('phone', '').strip() or None
            student_class = assignment.get('student_class')
            notes = assignment.get('notes', '').strip()
            
            if not assigned_name:
                continue  # Skip entries without name
            
            # Add school info to notes
            school_note = f"School: {request.user.school.name if request.user.school else request.user.username}"
            if student_class:
                school_note += f" | Class: {student_class}"
            if notes:
                school_note += f" | {notes}"
            else:
                notes = school_note
            
            # Generate unique ID
            max_attempts = 1000
            attempt = 0
            id_code = None
            
            while attempt < max_attempts:
                random_number = secrets.randbelow(9000) + 1000
                id_code = f"{prefix}{random_number}"
                
                if not AdminIssuedID.objects.filter(id_code=id_code).exists():
                    break
                    
                attempt += 1
                id_code = None
            
            if id_code is None:
                return Response({
                    'error': f'Unable to generate unique ID. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create the student ID
            admin_id = AdminIssuedID.objects.create(
                id_code=id_code,
                role='student',
                assigned_name=assigned_name,
                assigned_phone=assigned_phone,
                notes=school_note,
                is_active=True,
                created_by=request.user  # School creates these
            )
            ids.append(AdminIssuedIDSerializer(admin_id).data)
        
        return Response({
            'ids': ids,
            'count': len(ids),
            'message': f'Successfully generated {len(ids)} student ID(s)'
        }, status=status.HTTP_201_CREATED)


# Volunteer: View assigned school participants
class VolunteerSchoolParticipantsView(generics.ListAPIView):
    serializer_class = SchoolParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role != 'volunteer':
            return SchoolParticipant.objects.none()
        
        # Get schools assigned to this volunteer
        assignments = SchoolVolunteerAssignment.objects.filter(
            volunteer=self.request.user,
            is_active=True
        )
        school_ids = assignments.values_list('school_id', flat=True)
        
        return SchoolParticipant.objects.filter(school_id__in=school_ids)


# Volunteer: Verify student against school data
class VolunteerVerifyStudentView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        if request.user.role != 'volunteer':
            raise PermissionDenied("Only volunteers can verify students")
        
        participant_id = request.data.get('participant_id')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        
        # Find school participant
        assignments = SchoolVolunteerAssignment.objects.filter(
            volunteer=request.user,
            is_active=True
        )
        school_ids = assignments.values_list('school_id', flat=True)
        
        try:
            school_participant = SchoolParticipant.objects.filter(
                school_id__in=school_ids,
                participant_id=participant_id,
                first_name__iexact=first_name,
                last_name__iexact=last_name
            ).first()
            
            if not school_participant:
                return Response({'error': 'Participant not found in school data'}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            # Mark as verified
            school_participant.verified_by_volunteer = True
            from django.utils import timezone
            school_participant.verified_at = timezone.now()
            school_participant.volunteer = request.user
            school_participant.save()
            
            return Response({'message': 'Participant verified', 
                            'participant': SchoolParticipantSerializer(school_participant).data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# School: View own submitted participants
class SchoolViewOwnParticipantsView(generics.ListAPIView):
    serializer_class = SchoolParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role != 'school':
            return SchoolParticipant.objects.none()
        
        # Return participants submitted by this school
        return SchoolParticipant.objects.filter(school=self.request.user).order_by('-submitted_at')


# Admin: Assign volunteers to schools
class AdminAssignVolunteerToSchoolView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def create(self, request):
        school_id = request.data.get('school_id')
        volunteer_id = request.data.get('volunteer_id')
        
        try:
            school = User.objects.get(id=school_id, role='school')
            volunteer = User.objects.get(id=volunteer_id, role='volunteer')
        except User.DoesNotExist:
            return Response({'error': 'Invalid school or volunteer ID'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update assignment
        assignment, created = SchoolVolunteerAssignment.objects.update_or_create(
            school=school,
            volunteer=volunteer,
            defaults={'assigned_by': request.user, 'is_active': True}
        )
        
        return Response({'message': 'Assignment created' if created else 'Assignment updated',
                        'assignment': SchoolVolunteerAssignmentSerializer(assignment).data},
                       status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# Public: View school standings
class SchoolStandingsView(generics.ListAPIView):
    serializer_class = SchoolStandingSerializer
    permission_classes = [AllowAny]
    queryset = SchoolStanding.objects.all()


# Admin: List all issued IDs with filters
class AdminIssuedIDListView(generics.ListAPIView):
    serializer_class = AdminIssuedIDSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def get_queryset(self):
        queryset = AdminIssuedID.objects.all().order_by('-created_at')
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter == 'available':
            queryset = queryset.filter(is_used=False, is_active=True)
        elif status_filter == 'used':
            queryset = queryset.filter(is_used=True, is_verified=False)
        elif status_filter == 'verified':
            queryset = queryset.filter(is_verified=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        # Search by ID code or name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(id_code__icontains=search) | 
                Q(assigned_name__icontains=search) |
                Q(used_by__username__icontains=search) |
                Q(used_by__email__icontains=search)
            )
        
        return queryset


# Admin: Update or deactivate an issued ID
class AdminIssuedIDDetailView(generics.RetrieveUpdateAPIView):
    queryset = AdminIssuedID.objects.all()
    serializer_class = AdminIssuedIDSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Allow updating assigned_name, assigned_phone, notes, and is_active
        if 'assigned_name' in request.data:
            instance.assigned_name = request.data['assigned_name']
        
        if 'assigned_phone' in request.data:
            instance.assigned_phone = request.data['assigned_phone']
        
        if 'notes' in request.data:
            instance.notes = request.data['notes']
        
        if 'is_active' in request.data:
            # Prevent deactivating already-used IDs unless explicitly forced
            if instance.is_used and not request.data.get('force', False):
                return Response({
                    'error': 'Cannot deactivate an ID that has been used. Use force=true to override.'
                }, status=status.HTTP_400_BAD_REQUEST)
            instance.is_active = request.data['is_active']
        
        instance.save()
        
        return Response(AdminIssuedIDSerializer(instance).data)


# Admin: Check ID validity (public for registration form)
@api_view(['POST'])
@permission_classes([AllowAny])
def check_id_validity(request):
    """
    Public endpoint to check if an ID code is valid and available.
    Used by registration form for real-time validation.
    """
    id_code = request.data.get('id_code', '').strip().upper()
    
    if not id_code:
        return Response({'valid': False, 'error': 'ID code is required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        issued_id = AdminIssuedID.objects.get(id_code=id_code)
    except AdminIssuedID.DoesNotExist:
        return Response({
            'valid': False,
            'error': 'Invalid ID code'
        })
    
    # Check various validity conditions
    if not issued_id.is_active:
        return Response({
            'valid': False,
            'error': 'This ID has been deactivated'
        })
    
    if issued_id.is_used:
        return Response({
            'valid': False,
            'error': 'This ID has already been used'
        })
    
    # ID is valid and available
    return Response({
        'valid': True,
        'role': issued_id.role,
        'assigned_name': issued_id.assigned_name,
        'message': f'Valid {issued_id.role} ID'
    })


# Admin: List all school participants (for user management panel)
class AdminSchoolParticipantsListView(generics.ListAPIView):
    """
    Admin endpoint to view all school participants pending approval.
    This displays in the User Management panel under Students section.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = SchoolParticipantSerializer

    def get_queryset(self):
        queryset = SchoolParticipant.objects.all().select_related('school').prefetch_related('events')

        # Filter by approval status
        status_filter = self.request.query_params.get('status', None)
        if status_filter == 'pending':
            # Participants who don't have a user account yet
            queryset = queryset.filter(verified_by_volunteer=False)
        elif status_filter == 'approved':
            # Participants who have been approved
            queryset = queryset.filter(verified_by_volunteer=True)

        # Filter by section (LP/UP/HS/HSS)
        section = self.request.query_params.get('section', None)
        if section:
            if section == 'LP':
                queryset = queryset.filter(student_class__gte=1, student_class__lte=3)
            elif section == 'UP':
                queryset = queryset.filter(student_class__gte=4, student_class__lte=7)
            elif section == 'HS':
                queryset = queryset.filter(student_class__gte=8, student_class__lte=10)
            elif section == 'HSS':
                queryset = queryset.filter(student_class__gte=11, student_class__lte=12)

        # Filter by school
        school_id = self.request.query_params.get('school', None)
        if school_id:
            queryset = queryset.filter(school_id=school_id)

        return queryset.order_by('-submitted_at')


# Admin: Approve school participant and create user account
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_approve_school_participant(request, participant_id):
    """
    Approve a school participant and create their user account.
    Generates username/password and assigns section based on class.
    """
    try:
        participant = SchoolParticipant.objects.select_related('school').get(pk=participant_id)
    except SchoolParticipant.DoesNotExist:
        return Response({'error': 'Participant not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if already approved
    if participant.verified_by_volunteer:
        return Response({
            'error': 'Participant has already been approved',
            'participant': SchoolParticipantSerializer(participant).data
        }, status=status.HTTP_400_BAD_REQUEST)

    # Determine section based on class (1-3: LP, 4-7: UP, 8-10: HS, 11-12: HSS)
    student_class = participant.student_class
    if 1 <= student_class <= 3:
        section = 'LP'
    elif 4 <= student_class <= 7:
        section = 'UP'
    elif 8 <= student_class <= 10:
        section = 'HS'
    elif 11 <= student_class <= 12:
        section = 'HSS'
    else:
        return Response({
            'error': f'Invalid student class: {student_class}. Must be between 1-12.'
        }, status=status.HTTP_400_BAD_REQUEST)

    participant_school = getattr(participant.school, 'school', None)
    if participant_school is None:
        participant_school = _ensure_school_user_linked_to_school_profile(participant.school)
    if participant_school is None:
        return Response({
            'error': 'School account is not linked to a School profile. Link the school user to a School before approving participants.',
            'school_user': {
                'id': participant.school.id,
                'username': participant.school.username
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    school_registration_id = _school_participant_registration_id(participant.pk)
    legacy_registration_id = f"SP-{participant_school.id}-{participant.participant_id}"

    existing_user = User.objects.filter(
        role='student',
        school=participant_school,
        registration_id=school_registration_id
    ).first()
    if existing_user is None:
        existing_user = User.objects.filter(
            role='student',
            school=participant_school,
            registration_id=legacy_registration_id
        ).first()
    if existing_user is None:
        existing_user = User.objects.filter(
            role='student',
            school=participant_school,
            registration_id=participant.participant_id
        ).first()
    if existing_user is None:
        existing_user = User.objects.filter(
            role='student',
            school=participant_school,
            username=participant.participant_id.lower()
        ).first()

    # Generate secure random password
    password = secrets.token_urlsafe(12)[:12]  # 12 character password
    temp_password_payload = signing.dumps({"p": password, "generated_at": timezone.now().isoformat()})

    # Create user account
    try:
        if existing_user is not None:
            with transaction.atomic():
                user = existing_user
                user.set_password(password)
                user.must_reset_password = True
                user.temporary_password_encrypted = temp_password_payload
                user.first_name = participant.first_name
                user.last_name = participant.last_name
                user.student_class = participant.student_class
                user.school_category_extra = section
                user.is_active = True
                user.approval_status = 'approved'
                if user.registration_id in [None, '', participant.participant_id, legacy_registration_id]:
                    user.registration_id = school_registration_id
                user.save()
                username = user.username

                # Mark participant as verified
                participant.verified_by_volunteer = True
                participant.verified_at = timezone.now()
                if getattr(request.user, 'role', None) == 'volunteer':
                    participant.volunteer = request.user
                participant.save()
        else:
            last_error = None
            for _ in range(5):
                username = _generate_unique_student_username(participant.participant_id, participant_school.id)
                try:
                    with transaction.atomic():
                        user = User.objects.create_user(
                            username=username,
                            password=password,
                            email=_student_placeholder_email(username),
                            first_name=participant.first_name,
                            last_name=participant.last_name,
                            role='student',
                            student_class=participant.student_class,
                            school_category_extra=section,  # Fixed: use school_category_extra instead of section
                            school=participant_school,
                            registration_id=school_registration_id,
                            is_active=True,
                            approval_status='approved',
                            must_reset_password=True,
                            temporary_password_encrypted=temp_password_payload,
                        )

                        # Mark participant as verified
                        participant.verified_by_volunteer = True
                        participant.verified_at = timezone.now()
                        if getattr(request.user, 'role', None) == 'volunteer':
                            participant.volunteer = request.user
                        participant.save()

                    last_error = None
                    break
                except IntegrityError as e:
                    last_error = e
                    continue

            if last_error is not None:
                raise last_error

        # Send email notification to school (if school has email)
        try:
            if participant.school.email:
                subject = f'Participant Approved: {participant.first_name} {participant.last_name}'
                message = f'''Dear {participant.school.username},

Your participant has been approved and their account has been created.

Participant Details:
Name: {participant.first_name} {participant.last_name}
Participant ID: {participant.participant_id}
Class: {participant.student_class}
Section: {section}

Login Credentials:
Username: {username}
Password: {password}

The participant can now log in to the system and register for events.

Best regards,
E-Kalolsavam Admin Team
'''
                send_mail(subject, message, 'noreply@ekalolsavam.com', [participant.school.email], fail_silently=True)
        except Exception as e:
            # Don't fail the approval if email sending fails
            print(f"Failed to send email: {str(e)}")

        return Response({
            'message': 'Participant approved successfully',
            'participant': SchoolParticipantSerializer(participant).data,
            'user_credentials': {
                'username': username,
                'password': password,  # Only returned once
                'section': section,
                'user_id': user.id
            }
        }, status=status.HTTP_201_CREATED)

    except IntegrityError as e:
        return Response({
            'error': 'Failed to create user account: username or other unique field already exists.',
            'details': str(e)
        }, status=status.HTTP_409_CONFLICT)
    except Exception as e:
        return Response({
            'error': f'Failed to create user account: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin: Bulk approve school participants
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_bulk_approve_school_participants(request):
    """
    Bulk approve multiple school participants at once.
    """
    participant_ids = request.data.get('participant_ids', [])

    if not participant_ids or not isinstance(participant_ids, list):
        return Response({
            'error': 'participant_ids must be a non-empty list'
        }, status=status.HTTP_400_BAD_REQUEST)

    results = {
        'approved': [],
        'failed': [],
        'already_approved': []
    }

    for participant_id in participant_ids:
        try:
            participant = SchoolParticipant.objects.select_related('school').get(pk=participant_id)

            # Skip if already approved
            if participant.verified_by_volunteer:
                results['already_approved'].append({
                    'id': participant_id,
                    'participant_id': participant.participant_id,
                    'name': f"{participant.first_name} {participant.last_name}"
                })
                continue

            # Determine section
            student_class = participant.student_class
            if 1 <= student_class <= 3:
                section = 'LP'
            elif 4 <= student_class <= 7:
                section = 'UP'
            elif 8 <= student_class <= 10:
                section = 'HS'
            elif 11 <= student_class <= 12:
                section = 'HSS'
            else:
                results['failed'].append({
                    'id': participant_id,
                    'error': f'Invalid class: {student_class}'
                })
                continue

            password = secrets.token_urlsafe(12)[:12]
            temp_password_payload = signing.dumps({"p": password, "generated_at": timezone.now().isoformat()})

            participant_school = getattr(participant.school, 'school', None)
            if participant_school is None:
                participant_school = _ensure_school_user_linked_to_school_profile(participant.school)
            if participant_school is None:
                results['failed'].append({
                    'id': participant_id,
                    'error': 'School account is not linked to a School profile'
                })
                continue

            school_registration_id = _school_participant_registration_id(participant.pk)
            legacy_registration_id = f"SP-{participant_school.id}-{participant.participant_id}"

            existing_user = User.objects.filter(
                role='student',
                school=participant_school,
                registration_id=school_registration_id
            ).first()
            if existing_user is None:
                existing_user = User.objects.filter(
                    role='student',
                    school=participant_school,
                    registration_id=legacy_registration_id
                ).first()
            if existing_user is None:
                existing_user = User.objects.filter(
                    role='student',
                    school=participant_school,
                    registration_id=participant.participant_id
                ).first()
            if existing_user is None:
                existing_user = User.objects.filter(
                    role='student',
                    school=participant_school,
                    username=participant.participant_id.lower()
                ).first()

            if existing_user is not None:
                with transaction.atomic():
                    user = existing_user
                    user.set_password(password)
                    user.must_reset_password = True
                    user.temporary_password_encrypted = temp_password_payload
                    user.first_name = participant.first_name
                    user.last_name = participant.last_name
                    user.student_class = participant.student_class
                    user.school_category_extra = section
                    user.is_active = True
                    user.approval_status = 'approved'
                    if user.registration_id in [None, '', participant.participant_id, legacy_registration_id]:
                        user.registration_id = school_registration_id
                    user.save()
                    username = user.username

                    # Mark as verified
                    participant.verified_by_volunteer = True
                    participant.verified_at = timezone.now()
                    if getattr(request.user, 'role', None) == 'volunteer':
                        participant.volunteer = request.user
                    participant.save()
            else:
                last_error = None
                for _ in range(5):
                    username = _generate_unique_student_username(participant.participant_id, participant_school.id)
                    try:
                        with transaction.atomic():
                            user = User.objects.create_user(
                                username=username,
                                password=password,
                                email=_student_placeholder_email(username),
                                first_name=participant.first_name,
                                last_name=participant.last_name,
                                role='student',
                                student_class=participant.student_class,
                                school_category_extra=section,  # Fixed: use school_category_extra instead of section
                                school=participant_school,
                                registration_id=school_registration_id,
                                is_active=True,
                                approval_status='approved',
                                must_reset_password=True,
                                temporary_password_encrypted=temp_password_payload,
                            )

                            # Mark as verified
                            participant.verified_by_volunteer = True
                            participant.verified_at = timezone.now()
                            if getattr(request.user, 'role', None) == 'volunteer':
                                participant.volunteer = request.user
                            participant.save()

                        last_error = None
                        break
                    except IntegrityError as e:
                        last_error = e
                        continue

                if last_error is not None:
                    raise last_error

            results['approved'].append({
                'id': participant_id,
                'participant_id': participant.participant_id,
                'name': f"{participant.first_name} {participant.last_name}",
                'username': username,
                'password': password,
                'section': section
            })

        except SchoolParticipant.DoesNotExist:
            results['failed'].append({
                'id': participant_id,
                'error': 'Participant not found'
            })
        except IntegrityError as e:
            results['failed'].append({
                'id': participant_id,
                'error': 'Username or other unique field already exists',
                'details': str(e)
            })
        except Exception as e:
            results['failed'].append({
                'id': participant_id,
                'error': str(e)
            })

    return Response({
        'message': f'Approved {len(results["approved"])} participants',
        'results': results
    }, status=status.HTTP_200_OK)
