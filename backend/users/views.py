import os
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from rest_framework.parsers import MultiPartParser, FormParser
from django.core import signing

from .models import User, AllowedEmail, School
from .serializers import (
    UserSerializer, UserRegistrationSerializer, AllowedEmailSerializer,
    BulkAllowedEmailSerializer, AdminUserUpdateSerializer, SchoolSerializer
)
from .permissions import IsAdminRole
from .pagination import AdminStandardResultsSetPagination


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Branch behavior for judge: do not auto-issue tokens; notify admin
        if getattr(user, 'role', '') == 'judge':
            try:
                # Create an admin notification
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='New Judge Registration Pending Approval',
                    message=f"Judge {user.first_name} {user.last_name} ({user.email}) has registered and is pending approval.",
                    notification_type='registration'
                )
            except Exception:
                pass
            # Notify the registrant that their request is received
            try:
                subject = 'Judge Registration Received - E-Kalolsavam'
                message = 'Your judge registration has been received. You will be notified upon approval.'
                send_mail(subject, message, 'joelfrancisjoy@gmail.com', [user.email], fail_silently=True)
            except Exception:
                pass
            return Response({
                'user': UserSerializer(user).data,
                'message': 'Registration submitted. Await admin approval.'
            }, status=status.HTTP_201_CREATED)
        else:
            # Send confirmation email (do not block registration on failure)
            try:
                frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
                login_url = f"{frontend_url.rstrip('/')}/login"
                subject = 'Successful Registration in E-Kalolsavam'
                message = 'Successful Registration in E-Kalolsavam visit the site for more details on Event Participation'
                html_message = f"""
                    <div style='font-family: Arial, sans-serif; line-height: 1.6;'>
                        <h2>Successful Registration in E-Kalolsavam</h2>
                        <p>Successful Registration in E-Kalolsavam visit the site for more details on Event Participation</p>
                        <p>
                            <a href='{login_url}'
                               style='display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;'>
                               Click Here
                            </a>
                        </p>
                    </div>
                """
                send_mail(
                    subject,
                    message,
                    'joelfrancisjoy@gmail.com',  # Sender
                    [user.email],
                    fail_silently=True,
                    html_message=html_message,
                )
            except Exception:
                pass

            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('username')  # username or email
        password = request.data.get('password')

        if identifier and password:
            # Normalize identifier (avoid accidental leading/trailing spaces)
            identifier = str(identifier).strip()
            # Support login with either username or email (case-insensitive)
            login_username = identifier
            try:
                if '@' in identifier:
                    matched = User.objects.filter(email__iexact=identifier).first()
                    if matched:
                        login_username = matched.username
            except Exception:
                pass

            user = authenticate(username=login_username, password=password)
            # Fallback: if authenticate failed, try resolving by username/email and checking password
            if not user:
                candidate = User.objects.filter(
                    Q(username__iexact=identifier) | Q(email__iexact=identifier)
                ).first()
                if candidate and candidate.check_password(password):
                    user = candidate
            if user:
                # Block non-approved judges and volunteers
                if user.role in ['judge', 'volunteer'] and user.approval_status != 'approved':
                    return Response({'error': 'Unauthorized Login'}, status=status.HTTP_403_FORBIDDEN)
                
                # Block blacklisted students
                if user.role == 'student' and user.approval_status == 'rejected':
                    return Response({'error': 'Account has been blacklisted'}, status=status.HTTP_403_FORBIDDEN)
                # Grant full admin authority to specific users
                if user.email == 'joelfrancisjoy@gmail.com' or user.username.lower() == 'cenadmin':
                    changed_fields = []
                    if user.role != 'admin':
                        user.role = 'admin'
                        changed_fields.append('role')
                    if not user.is_staff:
                        user.is_staff = True
                        changed_fields.append('is_staff')
                    if not user.is_superuser:
                        user.is_superuser = True
                        changed_fields.append('is_superuser')
                    if changed_fields:
                        user.save(update_fields=changed_fields)
                    # Ensure email is in allowed list
                    AllowedEmail.objects.get_or_create(
                        email=user.email.lower(),
                        defaults={'is_active': True, 'created_by': user}
                    )
                refresh = RefreshToken.for_user(user)
                data = {
                    'user': UserSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
                # If judge/volunteer has a stored pending password, include a flag and masked preview
                if user.role in ['judge', 'volunteer'] and user.pending_password_encrypted:
                    try:
                        payload = signing.loads(user.pending_password_encrypted)
                        original = str(payload.get('p', ''))
                        if original:
                            masked = original[:2] + '*' * max(0, len(original) - 4) + original[-2:]
                            data['password_choice'] = {
                                'has_pending': True,
                                'masked_hint': masked
                            }
                    except Exception:
                        pass
                # Also surface must_reset_password flag for temp-password users
                if getattr(user, 'must_reset_password', False):
                    data['password_choice'] = data.get('password_choice', {'has_pending': False})
                    data['password_choice']['must_reset'] = True
                return Response(data)
            else:
                return Response({
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({
                'error': 'Username and password required'
            }, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    # Removed pagination to load all users for frontend filtering

    def get_queryset(self):
        qs = super().get_queryset()
        # Filters for admin dashboard
        role = self.request.query_params.get('role')
        approval = self.request.query_params.get('approval_status')
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')

        if role:
            qs = qs.filter(role=role)
        if approval:
            qs = qs.filter(approval_status=approval)
        if is_active in ['true', 'false']:
            qs = qs.filter(is_active=(is_active == 'true'))
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
            )
        return qs


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        # Return full user serializer for GET (read model fully)
        instance = self.get_object()
        return Response(UserSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        # Robust deletion with cleanup and guard against removing the last admin
        instance = self.get_object()

        # Prevent deleting the last active admin
        if getattr(instance, 'role', None) == 'admin' and _would_remove_last_admin(exclude_user_id=instance.id):
            return Response({'error': 'Cannot delete the last active admin'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.db import transaction
            with transaction.atomic():
                # Step 1: Detach M2M assignments to avoid residual relations
                try:
                    instance.assigned_events.clear()
                except Exception:
                    pass
                try:
                    instance.assigned_volunteer_events.clear()
                except Exception:
                    pass

                # Step 2: Reassign events created by this user to the acting admin (to avoid cascading deletions)
                try:
                    # Treat the requesting user as the acting admin (permission already enforced by IsAdminRole)
                    acting_admin = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
                    if acting_admin and getattr(acting_admin, 'id', None) != instance.id:
                        from events.models import Event
                        # Reassign regardless of the role of the user being deleted
                        Event.objects.filter(created_by=instance).update(created_by_id=getattr(acting_admin, 'id', None))
                except Exception:
                    # Non-critical; proceed with deletion even if reassignment fails
                    pass

                # Step 3: Reassign AllowedEmail records created by this user to prevent cascade deletion
                try:
                    acting_admin = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
                    if acting_admin and getattr(acting_admin, 'id', None) != instance.id:
                        # Reassign to acting admin instead of deleting
                        AllowedEmail.objects.filter(created_by=instance).update(created_by_id=getattr(acting_admin, 'id', None))
                    else:
                        # If no valid admin to reassign to, set to NULL (requires model change, but for now delete)
                        AllowedEmail.objects.filter(created_by=instance).update(created_by_id=None)
                except Exception:
                    pass

                # Step 4: Proactively remove dependent rows across apps
                try:
                    from events.models import EventRegistration, ParticipantVerification, Judge as JudgeProfile
                    from scores.models import Score, Result
                    from volunteers.models import VolunteerAssignment
                    from notifications.models import Notification
                    from certificates.models import Certificate
                    from feedback.models import Feedback
                    
                    # Delete in order to avoid FK constraint violations
                    EventRegistration.objects.filter(participant=instance).delete()
                    ParticipantVerification.objects.filter(Q(participant=instance) | Q(volunteer=instance)).delete()
                    Score.objects.filter(Q(participant=instance) | Q(judge=instance)).delete()
                    Result.objects.filter(participant=instance).delete()
                    VolunteerAssignment.objects.filter(volunteer=instance).delete()
                    Notification.objects.filter(user=instance).delete()
                    Certificate.objects.filter(participant=instance).delete()
                    Feedback.objects.filter(user=instance).delete()
                    JudgeProfile.objects.filter(user=instance).delete()
                except Exception:
                    pass

                # Step 5: Perform the actual delete
                self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SchoolListView(generics.ListAPIView):
    queryset = School.objects.filter(is_active=True)
    serializer_class = SchoolSerializer
    permission_classes = [AllowAny]


# Allowed Email Management Views
class AllowedEmailListCreateView(generics.ListCreateAPIView):
    queryset = AllowedEmail.objects.all().order_by('-created_at')
    serializer_class = AllowedEmailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only admin users can view all allowed emails
        if getattr(self.request.user, 'role', None) == 'admin':
            return AllowedEmail.objects.all().order_by('-created_at')
        else:
            # Non-admin users can only see emails they created
            return AllowedEmail.objects.filter(created_by=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # Only admin users can create allowed emails
        if getattr(self.request.user, 'role', None) != 'admin':
            raise PermissionDenied("Only admin users can add allowed emails")
        serializer.save()


class AllowedEmailDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AllowedEmail.objects.all()
    serializer_class = AllowedEmailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only admin users can manage all allowed emails
        if getattr(self.request.user, 'role', None) == 'admin':
            return AllowedEmail.objects.all()
        else:
            # Non-admin users can only manage emails they created
            return AllowedEmail.objects.filter(created_by=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_add_allowed_emails(request):
    """
    Bulk add multiple email addresses to the allowed list
    """
    if getattr(request.user, 'role', None) != 'admin':
        return Response(
            {'error': 'Only admin users can bulk add allowed emails'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = BulkAllowedEmailSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        created_emails = serializer.save()
        return Response({
            'message': f'Successfully added {len(created_emails)} email addresses',
            'created_emails': AllowedEmailSerializer(created_emails, many=True).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_email_allowed(request):
    """
    Check if an email is in the allowed list (public endpoint for frontend validation)
    """
    email = request.GET.get('email')
    if not email:
        return Response({'error': 'Email parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    is_allowed = AllowedEmail.objects.filter(email=email.lower(), is_active=True).exists()
    return Response({'email': email, 'is_allowed': is_allowed})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_email_registered(request):
    """
    Check if an email is registered with valid role (student, volunteer, judge) - for admin validation
    """
    email = request.GET.get('email')
    if not email:
        return Response({'error': 'Email parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    is_registered = User.objects.filter(email=email.lower(), role__in=['student', 'volunteer', 'judge']).exists()
    return Response({'email': email, 'is_registered': is_registered})


@api_view(['GET'])
@permission_classes([AllowAny])
def check_email_exists(request):
    """
    Public endpoint to check if an email is already registered (for registration form validation).
    Returns: { email, exists: true|false }
    """
    email = request.GET.get('email')
    if not email:
        return Response({'error': 'Email parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    exists = User.objects.filter(email__iexact=email.strip().lower()).exists()
    return Response({'email': email, 'exists': exists})


@api_view(['GET'])
@permission_classes([AllowAny])
def check_username_exists(request):
    """
    Public endpoint to check if a username is already taken (case-insensitive).
    Returns: { username, exists: true|false }
    """
    username = request.GET.get('username')
    if not username:
        return Response({'error': 'Username parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    exists = User.objects.filter(username__iexact=username.strip()).exists()
    return Response({'username': username, 'exists': exists})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_pending_password(request):
    """
    Accept the password provided during registration (if any) as the new password
    after logging in with the temporary password sent by admin.
    """
    user = request.user
    if not user.pending_password_encrypted:
        return Response({'error': 'No pending password to accept'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        payload = signing.loads(user.pending_password_encrypted)
        new_password = str(payload.get('p') or '')
    except Exception:
        new_password = ''
    if not new_password:
        return Response({'error': 'Invalid pending password'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.pending_password_encrypted = ''
    user.must_reset_password = False
    user.save(update_fields=['password', 'pending_password_encrypted', 'must_reset_password'])
    # Issue fresh tokens so user stays logged in with new password
    refresh = RefreshToken.for_user(user)
    return Response({'message': 'Password updated', 'refresh': str(refresh), 'access': str(refresh.access_token)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_new_password(request):
    """
    Set a brand new password instead of using the registration-time pending one.
    Expects: { new_password }
    """
    user = request.user
    new_password = str(request.data.get('new_password') or '')
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.pending_password_encrypted = ''
    user.must_reset_password = False
    user.save(update_fields=['password', 'pending_password_encrypted', 'must_reset_password'])
    refresh = RefreshToken.for_user(user)
    return Response({'message': 'Password updated', 'refresh': str(refresh), 'access': str(refresh.access_token)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_email_status(request, pk):
    """
    Toggle the active status of an allowed email
    """
    if getattr(request.user, 'role', None) != 'admin':
        return Response(
            {'error': 'Only admin users can toggle email status'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        allowed_email = AllowedEmail.objects.get(pk=pk)
        allowed_email.is_active = not allowed_email.is_active
        allowed_email.save()

        return Response({
            'message': f'Email {allowed_email.email} is now {"active" if allowed_email.is_active else "inactive"}',
            'email': AllowedEmailSerializer(allowed_email).data
        })
    except AllowedEmail.DoesNotExist:
        return Response({'error': 'Allowed email not found'}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Verify Google ID token, enforce AllowedEmail whitelist, then issue JWT pair.
    Expects: { "token": "<GoogleIDToken>" }
    Returns: { access, refresh, user }
    """
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    token = request.data.get("token")
    if not token:
        return JsonResponse({"error": "No token provided"}, status=400)

    try:
        # Get Google OAuth2 client ID from environment
        client_id = os.getenv('SOCIAL_AUTH_GOOGLE_OAUTH2_KEY')
        if not client_id:
            return JsonResponse({"error": "Google OAuth2 client ID not configured"}, status=500)

        # Verify token with Google
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id
        )
        
        # token is valid
        email = id_info.get('email')
        if not email:
            return JsonResponse({"error": "Email not present in Google token"}, status=400)

        # Check if email is in allowed list or if user is already registered
        # Allow existing users to sign in, but restrict new registrations to allowed emails
        if not User.objects.filter(email__iexact=email).exists():
            if not AllowedEmail.objects.filter(email=email.lower(), is_active=True).exists():
                return JsonResponse({"error": "Email not authorized for Google signup"}, status=403)

        # Get or create user
        first_name = id_info.get('given_name', '')
        last_name = id_info.get('family_name', '')
        
        # Try to find user by email
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            # Determine role based on email
            role = 'admin' if email.lower() == 'joelfrancisjoy@gmail.com' else 'student'
            
            # Create a username from email local-part; ensure uniqueness
            base_username = email.split('@')[0]
            username = base_username
            suffix = 1
            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}{suffix}"
                suffix += 1
                
            user = User.objects.create(
                username=username,
                email=email.lower(),
                first_name=first_name,
                last_name=last_name,
                role=role,
                is_active=True
            )
            user.set_unusable_password()
            user.save()
            
            # For admin users, add to allowed emails
            if role == 'admin':
                AllowedEmail.objects.get_or_create(
                    email=email.lower(),
                    defaults={'is_active': True, 'created_by': user}
                )
        else:
            # Ensure full admin privileges for configured admin emails or Cenadmin username
            if user.email.lower() == 'joelfrancisjoy@gmail.com' or user.username == 'Cenadmin':
                changed_fields = []
                if user.role != 'admin':
                    user.role = 'admin'
                    changed_fields.append('role')
                if not user.is_staff:
                    user.is_staff = True
                    changed_fields.append('is_staff')
                if not user.is_superuser:
                    user.is_superuser = True
                    changed_fields.append('is_superuser')
                if changed_fields:
                    user.save(update_fields=changed_fields)
                # Ensure email is in allowed list for admin users
                AllowedEmail.objects.get_or_create(
                    email=user.email.lower(),
                    defaults={'is_active': True, 'created_by': user}
                )

        # Block non-approved judges and volunteers from Google sign-in
        if user.role in ['judge', 'volunteer'] and user.approval_status != 'approved':
            return JsonResponse({"error": "Unauthorized Login"}, status=403)
        
        # Block blacklisted students from Google sign-in
        if user.role == 'student' and user.approval_status == 'rejected':
            return JsonResponse({"error": "Account has been blacklisted"}, status=403)

        # Issue JWT tokens
        refresh = RefreshToken.for_user(user)
        return JsonResponse({
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        })

    except ValueError as e:
        # Invalid token
        return JsonResponse({"error": "Invalid Google token", "detail": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": "Google authentication error", "detail": str(e)}, status=500)


# ---------- Admin Utilities ----------

def _would_remove_last_admin(exclude_user_id=None):
    """Return True if disabling/removing admin role would leave no active admins."""
    qs = User.objects.filter(role='admin', is_active=True)
    if exclude_user_id:
        qs = qs.exclude(pk=exclude_user_id)
    return not qs.exists()


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_toggle_user_active(request, pk):
    """Activate/Deactivate user while ensuring at least one admin remains active."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    target_state = request.data.get('is_active')
    if target_state is None:
        target_state = not user.is_active
    else:
        target_state = bool(target_state) in (True, 'true', 'True', 1, '1')

    if user.role == 'admin' and not target_state and _would_remove_last_admin(exclude_user_id=user.id):
        return Response({'error': 'Cannot deactivate the last active admin'}, status=status.HTTP_400_BAD_REQUEST)

    user.is_active = target_state
    user.save(update_fields=['is_active'])
    return Response({'id': user.id, 'is_active': user.is_active})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_set_role(request, pk):
    """Set user role. Prevent removing last admin role."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    new_role = request.data.get('role')
    valid_roles = [choice[0] for choice in User._meta.get_field('role').choices]
    if new_role not in valid_roles:
        return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

    if user.role == 'admin' and new_role != 'admin' and _would_remove_last_admin(exclude_user_id=user.id):
        return Response({'error': 'Cannot remove admin role from the last active admin'}, status=status.HTTP_400_BAD_REQUEST)

    user.role = new_role
    user.save(update_fields=['role'])
    return Response({'id': user.id, 'role': user.role})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_set_approval(request, pk):
    """Set approval_status for a user."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('approval_status')
    valid_status = [choice[0] for choice in User._meta.get_field('approval_status').choices]
    if new_status not in valid_status:
        return Response({'error': 'Invalid approval_status'}, status=status.HTTP_400_BAD_REQUEST)

    user.approval_status = new_status
    user.save(update_fields=['approval_status'])

    # Send emails and act based on approval
    try:
        if new_status == 'approved':
            # Generate a temporary password and set it so judge can log in immediately
            import secrets
            temp_password = secrets.token_urlsafe(8)
            user.set_password(temp_password)
            # Ensure the account is active upon approval
            user.is_active = True
            user.must_reset_password = True
            user.save(update_fields=['password', 'is_active', 'must_reset_password'])
            # Keep any registration-time pending password untouched here; it will be offered post-login
            # Inform judge and allow login (also supports Google sign-in)
            subject = 'Judge Approval - E-Kalolsavam'
            message = f'Congrats! You are authorized as a Judge for E-Kalolsavam.\n\nTemporary Password: {temp_password}\nUsername: {user.username}\n\nYou can now sign in with username/password or use Google with this email.'
            send_mail(subject, message, 'joelfrancisjoy@gmail.com', [user.email], fail_silently=True)
        elif new_status == 'rejected':
            # Inform judge and delete profile
            subject = 'Judge Registration Rejected - E-Kalolsavam'
            message = 'We are sorry to inform your judge registration was rejected.'
            send_mail(subject, message, 'joelfrancisjoy@gmail.com', [user.email], fail_silently=True)
            user.delete()
            return Response({'id': pk, 'approval_status': 'deleted'})
    except Exception:
        pass

    return Response({'id': user.id, 'approval_status': user.approval_status})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_bulk_activate(request):
    """Bulk activate or deactivate users: { ids: [], is_active: true/false }"""
    ids = request.data.get('ids') or []
    target = request.data.get('is_active')
    if target not in [True, False, 'true', 'false', 'True', 'False', 1, 0, '1', '0']:
        return Response({'error': 'is_active must be boolean'}, status=status.HTTP_400_BAD_REQUEST)
    target_bool = str(target).lower() in ['true', '1']

    # Prevent removing last admin
    if not target_bool:
        active_admin_ids = list(User.objects.filter(role='admin', is_active=True).values_list('id', flat=True))
        remaining_admins = set(active_admin_ids) - set(ids)
        if not remaining_admins:
            return Response({'error': 'Bulk deactivation would remove the last active admin'}, status=status.HTTP_400_BAD_REQUEST)

    updated = User.objects.filter(id__in=ids).update(is_active=target_bool)
    return Response({'updated': updated, 'is_active': target_bool})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_bulk_set_approval(request):
    """Bulk set approval_status: { ids: [], approval_status: 'approved'|'rejected'|'pending' }"""
    ids = request.data.get('ids') or []
    new_status = request.data.get('approval_status')
    valid_status = [choice[0] for choice in User._meta.get_field('approval_status').choices]
    if new_status not in valid_status:
        return Response({'error': 'Invalid approval_status'}, status=status.HTTP_400_BAD_REQUEST)
    updated = User.objects.filter(id__in=ids).update(approval_status=new_status)
    return Response({'updated': updated, 'approval_status': new_status})