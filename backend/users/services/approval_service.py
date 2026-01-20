import secrets
from django.core.mail import send_mail


def approve_user(user):
    temp_password = secrets.token_urlsafe(8)

    user.set_password(temp_password)
    user.is_active = True
    user.must_reset_password = True
    user.approval_status = "approved"
    user.save()

    send_mail(
        "Approval Granted",
        f"Temporary password: {temp_password}",
        "noreply@kalolsavam.in",
        [user.email],
        fail_silently=True,
    )


def reject_user(user):
    send_mail(
        "Registration Rejected",
        "Your registration was rejected.",
        "noreply@kalolsavam.in",
        [user.email],
        fail_silently=True,
    )

    user.delete()
