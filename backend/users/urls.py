from django.urls import path
from .views import (
    RegisterView, CurrentUserView, LoginView,
    AllowedEmailListCreateView, AllowedEmailDetailView,
    bulk_add_allowed_emails, check_email_allowed, check_email_registered, toggle_email_status,
    google_auth, accept_pending_password, set_new_password,
    AdminUserListView, AdminUserDetailView, SchoolListView,
    admin_toggle_user_active, admin_set_role, admin_set_approval,
    admin_bulk_activate, admin_bulk_set_approval,
    check_email_exists, check_username_exists,
)
from .workflow_views import (
    AdminCreateSchoolView, AdminGenerateIDView, IDSignupView,
    IDSignupRequestListView, IDSignupRequestDetailView,
    SchoolSubmitParticipantsView, SchoolGenerateStudentIDView,
    VolunteerSchoolParticipantsView,
    VolunteerVerifyStudentView, AdminAssignVolunteerToSchoolView,
    SchoolStandingsView, AdminIssuedIDListView, AdminIssuedIDDetailView,
    SchoolViewOwnParticipantsView, check_id_validity
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('current/', CurrentUserView.as_view(), name='current-user'),
    path('google/', google_auth, name="google_auth"),

    # Schools
    path('schools/', SchoolListView.as_view(), name='schools-list'),

    # Users (admin-only)
    path('users/', AdminUserListView.as_view(), name='admin-users-list'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-users-detail'),
    path('users/<int:pk>/toggle-active/', admin_toggle_user_active, name='admin-users-toggle-active'),
    path('users/<int:pk>/set-role/', admin_set_role, name='admin-users-set-role'),
    path('users/<int:pk>/set-approval/', admin_set_approval, name='admin-users-set-approval'),
    path('users/bulk/activate/', admin_bulk_activate, name='admin-bulk-activate'),
    path('users/bulk/set-approval/', admin_bulk_set_approval, name='admin-bulk-set-approval'),

    # Allowed Email Management
    path('allowed-emails/', AllowedEmailListCreateView.as_view(), name='allowed-emails-list'),
    path('allowed-emails/<int:pk>/', AllowedEmailDetailView.as_view(), name='allowed-email-detail'),
    path('allowed-emails/bulk-add/', bulk_add_allowed_emails, name='bulk-add-allowed-emails'),
    path('allowed-emails/check/', check_email_allowed, name='check-email-allowed'),
    path('allowed-emails/check-registered/', check_email_registered, name='check-email-registered'),
    path('allowed-emails/<int:pk>/toggle/', toggle_email_status, name='toggle-email-status'),
    
    # Password management
    path('password/accept-pending/', accept_pending_password, name='accept-pending-password'),
    path('password/set-new/', set_new_password, name='set-new-password'),
    
    # Email and username validation
    path('emails/exists/', check_email_exists, name='check-email-exists'),
    path('usernames/exists/', check_username_exists, name='check-username-exists'),
    
    # New Workflow Endpoints
    # Admin: School management
    path('admin/schools/create/', AdminCreateSchoolView.as_view(), name='admin-create-school'),
    path('admin/ids/generate/', AdminGenerateIDView.as_view(), name='admin-generate-id'),
    path('admin/ids/', AdminIssuedIDListView.as_view(), name='admin-issued-ids-list'),
    path('admin/ids/<int:pk>/', AdminIssuedIDDetailView.as_view(), name='admin-issued-id-detail'),
    
    # Public: ID-based signup
    path('register/with-id/', IDSignupView.as_view(), name='register-with-id'),
    path('ids/check/', check_id_validity, name='check-id-validity'),
    
    # Admin: Manage ID signup requests
    path('admin/signup-requests/', IDSignupRequestListView.as_view(), name='admin-signup-requests'),
    path('admin/signup-requests/<int:pk>/', IDSignupRequestDetailView.as_view(), name='admin-signup-request-detail'),
    
    # School: Submit participants and generate student IDs
    path('schools/participants/submit/', SchoolSubmitParticipantsView.as_view(), name='school-submit-participants'),
    path('schools/participants/', SchoolViewOwnParticipantsView.as_view(), name='school-view-own-participants'),
    path('schools/students/generate-ids/', SchoolGenerateStudentIDView.as_view(), name='school-generate-student-ids'),
    
    # Volunteer: View and verify participants
    path('volunteer/school-participants/', VolunteerSchoolParticipantsView.as_view(), name='volunteer-school-participants'),
    path('volunteer/verify-student/', VolunteerVerifyStudentView.as_view(), name='volunteer-verify-student'),
    
    # Admin: Assign volunteers to schools
    path('admin/assign-volunteer/', AdminAssignVolunteerToSchoolView.as_view(), name='admin-assign-volunteer'),
    
    # Public: School standings
    path('standings/', SchoolStandingsView.as_view(), name='school-standings'),
]
