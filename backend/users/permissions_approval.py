from rest_framework.permissions import BasePermission


class IsApprovedUser(BasePermission):
    """
    Blocks users whose approval status is invalid even if JWT is valid.
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Judges & volunteers must be approved
        if user.role in ["judge", "volunteer"]:
            return user.approval_status == "approved"

        # Rejected students are blocked
        if user.role == "student":
            return user.approval_status != "rejected"

        return True
