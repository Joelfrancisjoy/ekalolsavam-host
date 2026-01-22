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
from django.db import transaction
from rest_framework.parsers import MultiPartParser, FormParser
from django.core import signing

from .models import User, AllowedEmail, School
from .serializers import (
    UserSerializer, UserRegistrationSerializer, AllowedEmailSerializer,
    BulkAllowedEmailSerializer, AdminUserUpdateSerializer, SchoolSerializer
)
from .permissions import IsAdminRole
from .pagination import AdminStandardResultsSetPagination
from users.services.auth_service import login_user
from users.services.password_service import accept_pending_password as service_accept_pending_password, set_new_password as service_set_new_password
from users.services.admin_user_service import delete_user_with_cleanup, would_remove_last_admin, toggle_user_active, set_user_role, set_user_approval
from core.exceptions import DomainError


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from users.services.registration_service import register_user

        result = register_user(serializer)

        response = {
            "user": UserSerializer(result["user"]).data
        }

        if result.get("tokens"):
            response.update(result["tokens"])
        else:
            response["message"] = result["message"]

        return Response(response, status=201)


# users/views.py

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    try:
        from users.services.auth_service import login_user
        data = login_user(
            request.data.get("username"),
            request.data.get("password"),
        )
        return Response(data)
    except DomainError as e:
        return Response({"error": str(e)}, status=403)


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
        if getattr(instance, 'role', None) == 'admin' and would_remove_last_admin(exclude_user_id=instance.id):
            return Response({'error': 'Cannot delete the last active admin'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use the service to handle the deletion with cleanup
            acting_admin = request.user if getattr(
                request, 'user', None) and request.user.is_authenticated else None
            delete_user_with_cleanup(instance, acting_admin=acting_admin)
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

    serializer = BulkAllowedEmailSerializer(
        data=request.data, context={'request': request})
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

    is_allowed = AllowedEmail.objects.filter(
        email=email.lower(), is_active=True).exists()
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

    is_registered = User.objects.filter(email=email.lower(), role__in=[
                                        'student', 'volunteer', 'judge']).exists()
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
    try:
        from users.services.password_service import accept_pending_password as service_accept_pending_password
        refresh = service_accept_pending_password(user)
        return Response({'message': 'Password updated', 'refresh': str(refresh), 'access': str(refresh.access_token)})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Failed to update password'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_new_password(request):
    """
    Set a brand new password instead of using the registration-time pending one.
    Expects: { new_password }
    """
    user = request.user
    new_password = str(request.data.get('new_password') or '')
    try:
        from users.services.password_service import set_new_password as service_set_new_password
        refresh = service_set_new_password(user, new_password)
        return Response({'message': 'Password updated', 'refresh': str(refresh), 'access': str(refresh.access_token)})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Failed to set new password'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth(request):
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    from users.services.auth_service import login_user

    token = request.data.get("token")

    if not token:
        return JsonResponse({"error": "No token provided"}, status=400)

    try:
        client_id = os.getenv("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")
        if not client_id:
            return JsonResponse({"error": "Google client ID not configured"}, status=500)

        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id
        )

        email = id_info.get("email")
        if not email:
            return JsonResponse({"error": "Email not found in token"}, status=400)

        first_name = id_info.get("given_name", "")
        last_name = id_info.get("family_name", "")

        # ---------- FIND OR CREATE USER ----------
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            base_username = email.split("@")[0]
            username = base_username
            i = 1

            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}{i}"
                i += 1

            role = "admin" if email.lower() == "joelfrancisjoy@gmail.com" else "student"

            user = User.objects.create(
                username=username,
                email=email.lower(),
                first_name=first_name,
                last_name=last_name,
                role=role,
                is_active=True,
            )
            user.set_unusable_password()
            user.save()

        # ---------- HAND OFF TO AUTH AUTHORITY ----------
        from rest_framework_simplejwt.tokens import RefreshToken
        from users.services.auth_response import build_auth_response

        refresh = RefreshToken.for_user(user)

        return JsonResponse(
            build_auth_response(
                user=user,
                access=str(refresh.access_token),
                refresh=str(refresh),
                message="Google login successful",
            ),
            safe=False
        )

    except Exception as e:
        return JsonResponse(
            {"error": "Google authentication failed", "detail": str(e)},
            status=400
        )


# ---------- Admin Utilities ----------


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

    try:
        from users.services.admin_user_service import toggle_user_active
        user = toggle_user_active(
            user, target_state, acting_admin=request.user)
        return Response({'id': user.id, 'is_active': user.is_active})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_set_role(request, pk):
    """Set user role. Prevent removing last admin role."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    new_role = request.data.get('role')
    try:
        from users.services.admin_user_service import set_user_role
        user = set_user_role(user, new_role, acting_admin=request.user)
        return Response({'id': user.id, 'role': user.role})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_set_approval(request, pk):
    """Set approval_status for a user."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('approval_status')
    try:
        from users.services.admin_user_service import set_user_approval
        user = set_user_approval(user, new_status, acting_admin=request.user)
        return Response({'id': user.id, 'approval_status': user.approval_status})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Failed to set approval status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def admin_bulk_activate(request):
    """Bulk activate or deactivate users: { ids: [], is_active: true/false }"""
    ids = request.data.get('ids') or []
    target = request.data.get('is_active')
    if target not in [True, False, 'true', 'false', 'True', 'False', 1, 0, '1', '0']:
        return Response({'error': 'is_active must be boolean'}, status=status.HTTP_400_BAD_REQUEST)
    target_bool = str(target).lower() in ['true', '1']

    # Check if this bulk action would remove the last admin
    if not target_bool:
        active_admin_ids = list(User.objects.filter(
            role='admin', is_active=True).values_list('id', flat=True))
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
    valid_status = [choice[0]
                    for choice in User._meta.get_field('approval_status').choices]
    if new_status not in valid_status:
        return Response({'error': 'Invalid approval_status'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from users.services.admin_user_service import set_user_approval
        updated = 0
        with transaction.atomic():
            for user in User.objects.filter(id__in=ids):
                set_user_approval(user, new_status, acting_admin=request.user)
                updated += 1
        return Response({'updated': updated, 'approval_status': new_status})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response({'error': 'Failed to bulk set approval status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
