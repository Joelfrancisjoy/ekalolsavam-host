from datetime import date, time

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import School, User
from volunteers.models import VolunteerAssignment, VolunteerShift

from .models import Event, EventRegistration, ParticipantVerification, Venue


class VolunteerParticipantFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.school = School.objects.create(
            name="Test School",
            category="HS",
        )

        self.admin = User.objects.create_user(
            username="admin_user",
            email="admin@test.com",
            password="testpass123",
            role="admin",
        )

        self.volunteer = User.objects.create_user(
            username="vol_user",
            email="vol@test.com",
            password="testpass123",
            role="volunteer",
        )

        self.student = User.objects.create_user(
            username="student_user",
            email="student@test.com",
            password="testpass123",
            role="student",
            first_name="TEST",
            last_name="STUDENT",
            school=self.school,
            student_class=10,
        )

        self.venue = Venue.objects.create(
            name="Test Venue",
            location="Test Location",
            capacity=100,
            event_limit=10,
        )

        self.event = Event.objects.create(
            name="Folk Dance",
            description="Test",
            category="dance",
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(12, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin,
            status="published",
        )

        self.registration = EventRegistration.objects.create(
            event=self.event,
            participant=self.student,
            status="confirmed",
            chess_number="00600019",
        )

        self.shift = VolunteerShift.objects.create(
            event=self.event,
            date=self.event.date,
            start_time=self.event.start_time,
            end_time=self.event.end_time,
            description="Test shift",
            required_volunteers=1,
            status="assigned",
        )

        VolunteerAssignment.objects.create(
            volunteer=self.volunteer,
            shift=self.shift,
        )

    def test_volunteer_participants_list_visible_when_assigned_by_shift(self):
        self.client.force_authenticate(user=self.volunteer)
        url = reverse("event-participants-for-judge", args=[self.event.id])
        res = self.client.get(url)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(res.data, list))
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0].get("chess_number"), "00600019")

    def test_volunteer_participants_list_filters_by_chess_number(self):
        self.client.force_authenticate(user=self.volunteer)
        url = reverse("event-participants-for-judge", args=[self.event.id])
        res = self.client.get(url, {"chess_number": " 00600019 "})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(res.data, list))
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0].get("chess_number"), "00600019")

    def test_volunteer_can_verify_participant_by_chess_number_when_event_published(self):
        self.client.force_authenticate(user=self.volunteer)
        url = reverse("verify-participant")
        res = self.client.post(
            url,
            {"chess_number": " 00600019 ", "event_id": self.event.id, "notes": ""},
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data.get("chess_number"), "00600019")
        self.assertEqual(res.data.get("status"), "verified")

        self.assertTrue(
            ParticipantVerification.objects.filter(
                event=self.event,
                participant=self.student,
                volunteer=self.volunteer,
                chess_number="00600019",
                status="verified",
            ).exists()
        )

        verifications_url = reverse("participant-verifications")
        list_res = self.client.get(verifications_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(list_res.data, list))
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0].get("chess_number"), "00600019")
