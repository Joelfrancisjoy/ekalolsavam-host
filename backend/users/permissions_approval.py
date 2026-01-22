from rest_framework.permissions import BasePermission


class IsApprovedUser(BasePermission):
    """
    Blocks users whose approval status is invalid even if JWT is valid.
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        role = (getattr(user, "role", "") or "").strip().lower()
        approval_status = (getattr(user, "approval_status", "") or "").strip().lower()

        # Judges & volunteers must be approved
        if role in ["judge", "volunteer"]:
            return approval_status == "approved"

        # Rejected students are blocked
        if role == "student":
            return approval_status != "rejected"

        return True
