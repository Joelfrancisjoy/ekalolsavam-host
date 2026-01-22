# users/services/auth_service.py

from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User
from core.exceptions import DomainError
from .auth_response import build_auth_response


def login_user(identifier: str, password: str):
    """
    Central authentication authority.
    Handles normal login + Google login.
    """

    if not identifier:
        raise DomainError("Username or email required")

    identifier = identifier.strip()

    # ---------- GOOGLE LOGIN ----------
    if password == "__google__":
        user = User.objects.filter(username__iexact=identifier).first()
        if not user:
            raise DomainError("Google authentication failed")

    # ---------- PASSWORD LOGIN ----------
    else:
        user = authenticate(username=identifier, password=password)

        if not user:
            # fallback: case-insensitive username, then email
            user = User.objects.filter(username__iexact=identifier).first()
            if not user:
                user = User.objects.filter(email__iexact=identifier).first()
            if not user or not user.check_password(password):
                raise DomainError("Invalid credentials")

    # ---------- ACCOUNT STATE ENFORCEMENT ----------
    role = (user.role or "").strip().lower()
    approval_status = (user.approval_status or "").strip().lower()

    if role in ["judge", "volunteer"] and approval_status != "approved":
        raise DomainError("Unauthorized login")

    if role == "student" and approval_status == "rejected":
        raise DomainError("Account has been blacklisted")

    if not user.is_active:
        raise DomainError("Account is inactive")

    # ---------- TOKEN ISSUE ----------
    refresh = RefreshToken.for_user(user)

    return build_auth_response(
        user=user,
        access=str(refresh.access_token),
        refresh=str(refresh),
        message="Login successful",
    )
