from django.urls import path

from .views import (
    public_initiate_emergency,
    list_active_emergencies,
    volunteer_create_emergency,
    volunteer_complete_emergency,
)


urlpatterns = [
    # Public entry point (no auth) used by LandingPage /emergency UI
    path("public-initiate/", public_initiate_emergency, name="emergency-public-initiate"),

    # Authenticated helpers for volunteers / admins
    path("active/", list_active_emergencies, name="emergency-active-list"),
    path("volunteer/", volunteer_create_emergency, name="emergency-volunteer-create"),
    path("<int:pk>/volunteer-complete/", volunteer_complete_emergency, name="emergency-volunteer-complete"),
]
