from django.urls import path
from .views import (
    VenueListCreateView, VenueDetailView,
    EventListCreateView, EventDetailView,
    EventRegistrationView, UserEventRegistrationsView,
    JudgeListCreateView, JudgeDetailView,
    transition_event_status,
    MyAssignedEventsView, ParticipantsByEventForJudgeView,
    ParticipantVerificationView, verify_participant_by_chess_number,
    get_volunteer_assignments, volunteer_check_in,
    assign_volunteers,
)

urlpatterns = [
    path('venues/', VenueListCreateView.as_view(), name='venue-list'),
    path('venues/<int:pk>/', VenueDetailView.as_view(), name='venue-detail'),
    path('judges/', JudgeListCreateView.as_view(), name='judge-list'),
    path('judges/<int:pk>/', JudgeDetailView.as_view(), name='judge-detail'),
    path('', EventListCreateView.as_view(), name='event-list'),
    path('<int:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('<int:pk>/transition/', transition_event_status, name='event-transition'),
    path('registrations/', EventRegistrationView.as_view(),
         name='event-registration'),
    path('my-registrations/', UserEventRegistrationsView.as_view(),
         name='my-registrations'),
    # Judge helpers
    path('my-assigned/', MyAssignedEventsView.as_view(), name='my-assigned-events'),
    path('<int:pk>/participants/', ParticipantsByEventForJudgeView.as_view(),
         name='event-participants-for-judge'),
    # Volunteer helpers
    path('participant-verifications/', ParticipantVerificationView.as_view(),
         name='participant-verifications'),
    path('verify-participant/', verify_participant_by_chess_number,
         name='verify-participant'),
    path('volunteer-assignments/', get_volunteer_assignments,
         name='volunteer-assignments'),
    path('volunteer-check-in/', volunteer_check_in, name='volunteer-check-in'),
    path('<int:pk>/assign-volunteers/',
         assign_volunteers, name='assign-volunteers'),
]
