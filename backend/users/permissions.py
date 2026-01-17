from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow access only to authenticated users with role == 'admin' or specific admin users."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        # Allow if role is admin
        if getattr(user, 'role', None) == 'admin':
            return True
        # Allow specific admin users
        if user.email == 'joelfrancisjoy@gmail.com' or user.username.lower() == 'cenadmin':
            return True
        return False


class IsAdminOrVolunteerRole(BasePermission):
    """Allow access to authenticated users with role == 'admin' or 'volunteer'."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        # Allow if role is admin or volunteer
        return getattr(user, 'role', None) in ['admin', 'volunteer']


class IsAdminOrStudentSignupVolunteer(BasePermission):
    """Allow access to authenticated users with role == 'admin' or 'volunteer' for student signup requests only."""
    
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        
        # Admins can always access
        if getattr(user, 'role', None) == 'admin':
            return True
        
        # Volunteers can only access if the request is for a student
        if getattr(user, 'role', None) == 'volunteer':
            # For list view, we can't check the specific request, so allow access
            if hasattr(view, 'action') and view.action == 'list':
                return True
            
            # For detail/update views, we need to check the specific request
            # This will be handled in the object-level permissions
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        
        # Admins can always access
        if getattr(user, 'role', None) == 'admin':
            return True
        
        # Volunteers can only access student signup requests
        if getattr(user, 'role', None) == 'volunteer':
            # Check if the signup request is for a student role
            if hasattr(obj, 'issued_id') and hasattr(obj.issued_id, 'role'):
                return obj.issued_id.role == 'student'
            return False
        
        return False