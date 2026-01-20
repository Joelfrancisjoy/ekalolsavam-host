from django.core.mail import send_mail
from users.models import User
from rest_framework_simplejwt.tokens import RefreshToken


def register_user(serializer):
    user = serializer.save()

    # Judge registration → approval flow
    if user.role == "judge":
        _notify_judge_pending(user)
        return {
            "user": user,
            "tokens": None,
            "message": "Registration submitted. Await admin approval."
        }

    # Normal registration
    _send_success_email(user)

    refresh = RefreshToken.for_user(user)
    return {
        "user": user,
        "tokens": {
            "refresh": str(refresh),
            "access": str(refresh.access_token)
        }
    }


def _notify_judge_pending(user):
    try:
        send_mail(
            "Judge Registration Received",
            "Your judge registration is pending admin approval.",
            "noreply@kalolsavam.in",
            [user.email],
            fail_silently=True,
        )
    except Exception:
        pass


def _send_success_email(user):
    try:
        send_mail(
            "Registration Successful",
            "Welcome to E-Kalolsavam.",
            "noreply@kalolsavam.in",
            [user.email],
            fail_silently=True,
        )
    except Exception:
        pass
