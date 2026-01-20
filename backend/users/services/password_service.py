from django.core import signing
from rest_framework_simplejwt.tokens import RefreshToken


def accept_pending_password(user):
    if not user.pending_password_encrypted:
        raise ValueError("No pending password")

    payload = signing.loads(user.pending_password_encrypted)
    password = payload.get("p")

    if not password:
        raise ValueError("Invalid pending password")

    user.set_password(password)
    user.pending_password_encrypted = ""
    user.must_reset_password = False
    user.save()

    refresh = RefreshToken.for_user(user)
    return refresh


def set_new_password(user, new_password):
    if len(new_password) < 8:
        raise ValueError("Password must be at least 8 characters")

    user.set_password(new_password)
    user.pending_password_encrypted = ""
    user.must_reset_password = False
    user.save()

    refresh = RefreshToken.for_user(user)
    return refresh
