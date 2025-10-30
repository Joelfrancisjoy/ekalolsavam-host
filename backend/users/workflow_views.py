from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework import generics, status
from django.db.models import Q
from django.core.mail import send_mail
import secrets
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
from .permissions import IsAdminRole


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
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'pending')
        return IDSignupRequest.objects.filter(status=status_filter).order_by('-requested_at')


class IDSignupRequestDetailView(generics.RetrieveUpdateAPIView):
    queryset = IDSignupRequest.objects.all()
    serializer_class = IDSignupRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['approved', 'rejected']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        instance.status = new_status
        instance.reviewed_by = request.user
        from django.utils import timezone
        instance.reviewed_at = timezone.now()
        instance.notes = request.data.get('notes', '')
        instance.save()
        
        # Get the associated ID and user
        issued_id = instance.issued_id
        user = instance.user
        
        # If approved, activate the user and mark ID as verified
        if new_status == 'approved':
            user.approval_status = 'approved'
            user.is_active = True
            user.save()
            
            # Mark the ID as verified
            issued_id.is_verified = True
            issued_id.verified_by = request.user
            issued_id.verified_at = timezone.now()
            issued_id.save()
            
            # Send approval email
            try:
                subject = f'{user.role.title()} Account Approved - E-Kalolsavam'
                message = f'''Dear {user.first_name},

Congratulations! Your {user.role} account has been approved and activated.

You can now log in to the E-Kalolsavam platform using your credentials:
Username: {user.username}

Please keep your login credentials secure and do not share them with anyone.

Welcome to the E-Kalolsavam team!

Best regards,
E-Kalolsavam Admin Team
'''
                send_mail(subject, message, 'joelfrancisjoy@gmail.com', [user.email], fail_silently=True)
            except Exception:
                pass
                
        elif new_status == 'rejected':
            user.approval_status = 'rejected'
            user.is_active = False
            user.save()
            
            # Optionally, free up the ID for reuse
            if request.data.get('free_id', False):
                issued_id.is_used = False
                issued_id.used_by = None
                issued_id.used_at = None
                issued_id.save()
            
            # Send rejection email
            try:
                subject = f'{user.role.title()} Registration Update - E-Kalolsavam'
                rejection_reason = instance.notes or 'verification failed'
                message = f'''Dear {user.first_name},

Thank you for your interest in joining E-Kalolsavam as a {user.role}.

After review, we regret to inform you that your registration could not be approved at this time.
Reason: {rejection_reason}

If you believe this is an error or have questions, please contact the admin team.

Thank you for your understanding.

Best regards,
E-Kalolsavam Admin Team
'''
                send_mail(subject, message, 'joelfrancisjoy@gmail.com', [user.email], fail_silently=True)
            except Exception:
                pass
        
        return Response({
            'message': f'Request {new_status} successfully',
            'request': IDSignupRequestSerializer(instance).data
        })


# School: Submit participant data
class SchoolSubmitParticipantsView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        if request.user.role != 'school':
            raise PermissionDenied("Only school accounts can submit participants")
        
        participants_data = request.data.get('participants', [])
        
        if not participants_data:
            return Response({'error': 'No participants data provided'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        created = []
        for p_data in participants_data:
            participant = SchoolParticipant.objects.create(
                school=request.user,
                participant_id=p_data.get('participant_id'),
                first_name=p_data.get('first_name'),
                last_name=p_data.get('last_name'),
                student_class=p_data.get('student_class')
            )
            
            # Add events if provided
            event_ids = p_data.get('event_ids', [])
            if event_ids:
                participant.events.set(event_ids)
            
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
