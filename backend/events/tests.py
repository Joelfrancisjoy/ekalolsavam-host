from datetime import date, datetime, time
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import School, User
from users.workflow_models import SchoolParticipant
from volunteers.models import VolunteerAssignment, VolunteerShift
from scores.models import Result, RecheckRequest, Score
from catalog.models import ArtCategory, EventDefinition, EventRule, EventVariant, Level, ParticipationType

from events.management.commands.provision_group_events import (
    AUTO_PROVISION_DESCRIPTION_PREFIX,
    DEFAULT_FALLBACK_MAX_PARTICIPANTS,
    DEFAULT_VENUE_NAME,
    TARGET_GROUP_EVENT_NAMES,
)
from events.services.catalog_sync import (
    build_canonical_event_name_from_models,
    map_event_definition_category_to_event_category,
)

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


class CompleteEventLifecycleTestCase(TestCase):
    """
    End-to-end lifecycle coverage:
    draft -> published -> registration_closed -> in_progress ->
    scoring_closed -> results_published -> archived
    including school-linked student registration and recheck flow.
    """

    def setUp(self):
        self.client = APIClient()

        self.school = School.objects.create(
            name="Lifecycle Test School",
            category="HS",
            is_active=True,
        )

        self.admin = User.objects.create_user(
            username="lifecycle_admin",
            email="lifecycle_admin@test.com",
            password="testpass123",
            role="admin",
        )

        self.judge = User.objects.create_user(
            username="lifecycle_judge",
            email="lifecycle_judge@test.com",
            password="testpass123",
            role="judge",
        )

        self.volunteer = User.objects.create_user(
            username="lifecycle_volunteer",
            email="lifecycle_volunteer@test.com",
            password="testpass123",
            role="volunteer",
        )

        self.school_user = User.objects.create_user(
            username="lifecycle_school_user",
            email="lifecycle_school_user@test.com",
            password="testpass123",
            role="school",
            contact_email="school-contact@test.com",
        )

        self.venue = Venue.objects.create(
            name="Lifecycle Venue",
            location="Lifecycle Location",
            capacity=200,
            event_limit=10,
        )

        self.event = Event.objects.create(
            name="Lifecycle Event",
            description="Complete lifecycle integration event",
            category="dance",
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(12, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin,
            status="draft",
        )
        self.event.judges.add(self.judge)
        self.event.volunteers.add(self.volunteer)

        self.student, self.student_school_participant = self._create_school_mapped_student(
            username="lifecycle_student",
            first_name="LIFE",
            last_name="STUDENT",
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _transition(self, target_status, expected_status=status.HTTP_200_OK):
        self._auth(self.admin)
        url = reverse("event-transition", args=[self.event.id])
        response = self.client.post(url, {"to": target_status}, format="json")
        self.assertEqual(response.status_code, expected_status, response.data)
        self.event.refresh_from_db()
        return response

    def _create_school_mapped_student(self, username, first_name, last_name):
        student = User.objects.create_user(
            username=username,
            email=f"{username}@test.com",
            password="testpass123",
            role="student",
            first_name=first_name,
            last_name=last_name,
            school=self.school,
            student_class=10,
        )

        school_participant = SchoolParticipant.objects.create(
            school=self.school_user,
            participant_id=f"SP-{username.upper()}",
            first_name=first_name,
            last_name=last_name,
            student_class=10,
        )
        school_participant.events.add(self.event)

        student.registration_id = f"SPP-{school_participant.id}"
        student.save(update_fields=["registration_id"])
        return student, school_participant

    def _registration_payload(self, student):
        return {
            "event": self.event.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
        }

    def _legacy_score_payload(self, participant_id):
        return {
            "event": self.event.id,
            "participant": participant_id,
            "technical_skill": 21.5,
            "artistic_expression": 22.0,
            "stage_presence": 20.0,
            "overall_impression": 21.0,
            "notes": "Lifecycle score submission",
        }

    def test_complete_event_lifecycle_with_school_registration(self):
        register_url = reverse("event-registration")
        participants_url = reverse("event-participants-for-judge", args=[self.event.id])
        verify_url = reverse("verify-participant")
        submit_scores_url = reverse("submit-scores")

        # School linkage should exist before registration.
        self.assertEqual(self.student.school_id, self.school.id)
        self.assertTrue(School.objects.filter(id=self.student.school_id, is_active=True).exists())
        self.assertEqual(self.student_school_participant.school_id, self.school_user.id)

        # 1) draft: student registration is blocked
        self._auth(self.student)
        draft_registration = self.client.post(
            register_url, self._registration_payload(self.student), format="json"
        )
        self.assertEqual(draft_registration.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("published", str(draft_registration.data).lower())
        self.assertFalse(
            EventRegistration.objects.filter(event=self.event, participant=self.student).exists()
        )

        # 2) draft -> published
        self._transition("published")

        # 3) published: student registration succeeds, response includes school details
        self._auth(self.student)
        published_registration = self.client.post(
            register_url, self._registration_payload(self.student), format="json"
        )
        self.assertEqual(published_registration.status_code, status.HTTP_201_CREATED)

        registration = EventRegistration.objects.get(event=self.event, participant=self.student)
        self.assertTrue(bool(registration.chess_number))
        self.assertEqual(registration.participant.school_id, self.school.id)

        registered_school = (
            published_registration.data.get("participant_details", {}).get("school", {})
        )
        self.assertEqual(registered_school.get("id"), self.school.id)
        self.assertEqual(registered_school.get("name"), self.school.name)
        self.assertEqual(registered_school.get("category"), self.school.category)

        # Judge cannot see participants until volunteer verification.
        self._auth(self.judge)
        judge_before_verify = self.client.get(participants_url)
        self.assertEqual(judge_before_verify.status_code, status.HTTP_200_OK)
        self.assertEqual(len(judge_before_verify.data), 0)

        # 4) published: volunteer verifies participant
        self._auth(self.volunteer)
        verify_response = self.client.post(
            verify_url,
            {
                "chess_number": registration.chess_number,
                "event_id": self.event.id,
                "notes": "Verified at registration stage",
            },
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_201_CREATED)
        verification = ParticipantVerification.objects.get(
            event=self.event, participant=self.student, volunteer=self.volunteer
        )
        self.assertEqual(verification.status, "verified")

        verified_school = verify_response.data.get("participant_details", {}).get("school", {})
        self.assertEqual(verified_school.get("id"), self.school.id)

        # Judge now sees the verified participant and school details.
        self._auth(self.judge)
        judge_after_verify = self.client.get(participants_url)
        self.assertEqual(judge_after_verify.status_code, status.HTTP_200_OK)
        self.assertEqual(len(judge_after_verify.data), 1)
        judge_school = judge_after_verify.data[0].get("participant_details", {}).get("school", {})
        self.assertEqual(judge_school.get("id"), self.school.id)
        self.assertEqual(judge_school.get("name"), self.school.name)

        # 5) published -> registration_closed and new registrations blocked
        self._transition("registration_closed")
        blocked_student, _ = self._create_school_mapped_student(
            username="lifecycle_blocked_student",
            first_name="SECOND",
            last_name="STUDENT",
        )
        self._auth(blocked_student)
        closed_registration = self.client.post(
            register_url, self._registration_payload(blocked_student), format="json"
        )
        self.assertEqual(closed_registration.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("published", str(closed_registration.data).lower())

        # 6) registration_closed -> in_progress and judge can score
        self._transition("in_progress")
        self._auth(self.judge)
        scoring_open = self.client.post(
            submit_scores_url, self._legacy_score_payload(self.student.id), format="json"
        )
        self.assertIn(scoring_open.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertTrue(
            Score.objects.filter(event=self.event, participant=self.student, judge=self.judge).exists()
        )

        # 7) in_progress -> scoring_closed and scoring is blocked
        self._transition("scoring_closed")
        self._auth(self.judge)
        scoring_closed = self.client.post(
            submit_scores_url, self._legacy_score_payload(self.student.id), format="json"
        )
        self.assertEqual(scoring_closed.status_code, status.HTTP_400_BAD_REQUEST)

        # Prepare published result, then move to results_published for recheck eligibility
        result = Result.objects.create(
            event=self.event,
            participant=self.student,
            total_score=84.50,
            rank=1,
            published=True,
        )
        self._transition("results_published")

        # 8) results_published: student submits recheck
        self._auth(self.student)
        result_details_url = reverse("student-result-details", args=[result.id])
        result_details = self.client.get(result_details_url)
        self.assertEqual(result_details.status_code, status.HTTP_200_OK)
        self.assertTrue(result_details.data.get("is_recheck_allowed"))

        recheck_submit_url = reverse("submit-recheck-request")
        recheck_submit = self.client.post(
            recheck_submit_url,
            {"result": result.id, "reason": "Please re-evaluate"},
            format="json",
        )
        self.assertEqual(recheck_submit.status_code, status.HTTP_201_CREATED)
        recheck_id = recheck_submit.data["recheck_request"]["recheck_request_id"]

        recheck_request = RecheckRequest.objects.get(recheck_request_id=recheck_id)
        self.assertEqual(recheck_request.status, "Pending")
        self.assertEqual(recheck_request.assigned_volunteer, self.volunteer)

        # Volunteer accepts recheck request
        self._auth(self.volunteer)
        accept_url = reverse("volunteer-accept-recheck-request", args=[recheck_id])
        accept_response = self.client.put(accept_url, {}, format="json")
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
        recheck_request.refresh_from_db()
        self.assertEqual(recheck_request.status, "Accepted")

        # Judge can see accepted recheck requests
        self._auth(self.judge)
        judge_recheck_url = reverse("judge-recheck-requests")
        judge_rechecks = self.client.get(judge_recheck_url)
        self.assertEqual(judge_rechecks.status_code, status.HTTP_200_OK)
        returned_ids = {item.get("recheck_request_id") for item in judge_rechecks.data}
        self.assertIn(str(recheck_id), returned_ids)

        # 9) results_published -> archived
        self._transition("archived")
        self.assertEqual(self.event.status, "archived")

        # archived: scoring remains blocked
        self._auth(self.judge)
        scoring_archived = self.client.post(
            submit_scores_url, self._legacy_score_payload(self.student.id), format="json"
        )
        self.assertEqual(scoring_archived.status_code, status.HTTP_400_BAD_REQUEST)

        # archived: verification blocked by stage
        late_student, _ = self._create_school_mapped_student(
            username="lifecycle_late_student",
            first_name="LATE",
            last_name="STUDENT",
        )
        late_registration = EventRegistration.objects.create(
            event=self.event,
            participant=late_student,
            status="confirmed",
            chess_number="00990001",
        )
        self._auth(self.volunteer)
        verify_archived = self.client.post(
            verify_url,
            {"chess_number": late_registration.chess_number, "event_id": self.event.id, "notes": ""},
            format="json",
        )
        self.assertEqual(verify_archived.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not allowed", str(verify_archived.data).lower())

        # archived: registration endpoint blocked
        self._auth(late_student)
        archived_registration = self.client.post(
            register_url, self._registration_payload(late_student), format="json"
        )
        self.assertEqual(archived_registration.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid transition from archived back to published
        self._transition("published", expected_status=status.HTTP_400_BAD_REQUEST)


class EventRegistrationGenderEligibilityTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.school = School.objects.create(
            name="Eligibility School",
            category="HS",
            is_active=True,
        )

        self.school_user = User.objects.create_user(
            username="eligibility_school_user",
            email="eligibility_school_user@test.com",
            password="testpass123",
            role="school",
        )

        self.admin = User.objects.create_user(
            username="eligibility_admin",
            email="eligibility_admin@test.com",
            password="testpass123",
            role="admin",
        )

        self.venue = Venue.objects.create(
            name="Eligibility Venue",
            location="Eligibility Location",
            capacity=120,
            event_limit=10,
        )

        category, _ = ArtCategory.objects.get_or_create(category_name="DANCE")
        participation_type, _ = ParticipationType.objects.get_or_create(type_name="INDIVIDUAL")
        self.level_hs, _ = Level.objects.get_or_create(
            level_code="HS",
            defaults={"level_name": "High School"},
        )

        self.event_definition = EventDefinition.objects.create(
            event_code="ELG-001",
            event_name="Eligibility Dance",
            category=category,
            participation_type=participation_type,
        )

        self.catalog_event = Event.objects.create(
            name="Eligibility Dance",
            description="Catalog-linked event with gender rule",
            category="dance",
            event_definition=self.event_definition,
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="published",
        )

        self.gender_rule = EventRule.objects.create(
            event=self.event_definition,
            level=self.level_hs,
            gender_eligibility="BOYS",
        )

    def _create_school_mapped_student(self, username, first_name, last_name, event, gender=None):
        student = User.objects.create_user(
            username=username,
            email=f"{username}@test.com",
            password="testpass123",
            role="student",
            first_name=first_name,
            last_name=last_name,
            school=self.school,
            student_class=10,
            gender=gender,
        )

        school_participant = SchoolParticipant.objects.create(
            school=self.school_user,
            participant_id=f"SP-{username.upper()}",
            first_name=first_name,
            last_name=last_name,
            student_class=10,
            gender=gender,
        )
        school_participant.events.add(event)

        student.registration_id = f"SPP-{school_participant.id}"
        student.save(update_fields=["registration_id"])
        return student

    def _registration_payload(self, student, event):
        return {
            "event": event.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
        }

    def test_registration_allows_matching_gender_for_catalog_linked_event(self):
        student = self._create_school_mapped_student(
            username="eligible_boy",
            first_name="ELIGIBLE",
            last_name="BOY",
            event=self.catalog_event,
            gender="BOYS",
        )

        self.client.force_authenticate(user=student)
        response = self.client.post(
            reverse("event-registration"),
            self._registration_payload(student, self.catalog_event),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            EventRegistration.objects.filter(event=self.catalog_event, participant=student).exists()
        )

    def test_registration_blocks_mismatched_gender_for_catalog_linked_event(self):
        student = self._create_school_mapped_student(
            username="ineligible_girl",
            first_name="INELIGIBLE",
            last_name="GIRL",
            event=self.catalog_event,
            gender="GIRLS",
        )

        self.client.force_authenticate(user=student)
        response = self.client.post(
            reverse("event-registration"),
            self._registration_payload(student, self.catalog_event),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("gender", str(response.data).lower())
        self.assertFalse(
            EventRegistration.objects.filter(event=self.catalog_event, participant=student).exists()
        )

    def test_registration_blocks_missing_gender_for_boys_or_girls_rule(self):
        student = self._create_school_mapped_student(
            username="missing_gender",
            first_name="MISSING",
            last_name="GENDER",
            event=self.catalog_event,
            gender=None,
        )

        self.client.force_authenticate(user=student)
        response = self.client.post(
            reverse("event-registration"),
            self._registration_payload(student, self.catalog_event),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("gender", str(response.data).lower())

    def test_registration_allows_missing_gender_for_mixed_rule(self):
        self.gender_rule.gender_eligibility = "MIXED"
        self.gender_rule.save(update_fields=["gender_eligibility"])

        student = self._create_school_mapped_student(
            username="mixed_without_gender",
            first_name="MIXED",
            last_name="NOGENDER",
            event=self.catalog_event,
            gender=None,
        )

        self.client.force_authenticate(user=student)
        response = self.client.post(
            reverse("event-registration"),
            self._registration_payload(student, self.catalog_event),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            EventRegistration.objects.filter(event=self.catalog_event, participant=student).exists()
        )

    def test_registration_skips_gender_enforcement_for_unlinked_events(self):
        legacy_event = Event.objects.create(
            name="Legacy Event",
            description="No catalog definition",
            category="dance",
            date=date.today(),
            start_time=time(12, 0),
            end_time=time(13, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="published",
        )

        student = self._create_school_mapped_student(
            username="legacy_without_gender",
            first_name="LEGACY",
            last_name="PARTICIPANT",
            event=legacy_event,
            gender=None,
        )

        self.client.force_authenticate(user=student)
        response = self.client.post(
            reverse("event-registration"),
            self._registration_payload(student, legacy_event),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            EventRegistration.objects.filter(event=legacy_event, participant=student).exists()
        )

    def test_variant_specific_rule_takes_precedence_over_generic_rule(self):
        variant = EventVariant.objects.create(event=self.event_definition, variant_name="Solo")
        self.gender_rule.gender_eligibility = "MIXED"
        self.gender_rule.save(update_fields=["gender_eligibility"])
        EventRule.objects.create(
            event=self.event_definition,
            variant=variant,
            level=self.level_hs,
            gender_eligibility="GIRLS",
        )

        variant_event = Event.objects.create(
            name="Variant Event",
            description="Variant specific rule should win",
            category="dance",
            event_definition=self.event_definition,
            event_variant=variant,
            date=date.today(),
            start_time=time(14, 0),
            end_time=time(15, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="published",
        )

        student = self._create_school_mapped_student(
            username="variant_boy",
            first_name="VARIANT",
            last_name="BOY",
            event=variant_event,
            gender="BOYS",
        )

        self.client.force_authenticate(user=student)
        response = self.client.post(
            reverse("event-registration"),
            self._registration_payload(student, variant_event),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("gender", str(response.data).lower())

    def test_variant_without_specific_rule_falls_back_to_generic_rule(self):
        variant = EventVariant.objects.create(event=self.event_definition, variant_name="Group A")
        variant_event = Event.objects.create(
            name="Variant Fallback Event",
            description="Fallback to generic rule",
            category="dance",
            event_definition=self.event_definition,
            event_variant=variant,
            date=date.today(),
            start_time=time(15, 0),
            end_time=time(16, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="published",
        )

        student = self._create_school_mapped_student(
            username="variant_fallback_boy",
            first_name="FALLBACK",
            last_name="BOY",
            event=variant_event,
            gender="BOYS",
        )

        self.client.force_authenticate(user=student)
        response = self.client.post(
            reverse("event-registration"),
            self._registration_payload(student, variant_event),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            EventRegistration.objects.filter(event=variant_event, participant=student).exists()
        )


class EventCatalogAlignmentTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(
            username="catalog_admin",
            email="catalog_admin@test.com",
            password="testpass123",
            role="admin",
        )
        self.viewer = User.objects.create_user(
            username="catalog_viewer",
            email="catalog_viewer@test.com",
            password="testpass123",
            role="volunteer",
        )
        self.judge = User.objects.create_user(
            username="catalog_judge",
            email="catalog_judge@test.com",
            password="testpass123",
            role="judge",
        )

        self.venue = Venue.objects.create(
            name="Catalog Venue",
            location="Catalog Location",
            capacity=150,
            event_limit=10,
        )

        dance_category, _ = ArtCategory.objects.get_or_create(category_name="DANCE")
        music_category, _ = ArtCategory.objects.get_or_create(category_name="MUSIC")
        individual_type, _ = ParticipationType.objects.get_or_create(type_name="INDIVIDUAL")

        self.level_lp, _ = Level.objects.get_or_create(level_code="LP", defaults={"level_name": "Lower Primary"})
        self.level_up, _ = Level.objects.get_or_create(level_code="UP", defaults={"level_name": "Upper Primary"})
        self.level_hs, _ = Level.objects.get_or_create(level_code="HS", defaults={"level_name": "High School"})

        self.event_definition = EventDefinition.objects.create(
            event_code="SYNC-001",
            event_name="Canonical Dance",
            category=dance_category,
            participation_type=individual_type,
        )
        self.variant_solo = EventVariant.objects.create(event=self.event_definition, variant_name="Solo")

        self.other_definition = EventDefinition.objects.create(
            event_code="SYNC-002",
            event_name="Other Event",
            category=music_category,
            participation_type=individual_type,
        )
        self.other_variant = EventVariant.objects.create(event=self.other_definition, variant_name="Wrong Variant")

        EventRule.objects.create(
            event=self.event_definition,
            level=self.level_lp,
            gender_eligibility="MIXED",
        )
        EventRule.objects.create(
            event=self.event_definition,
            level=self.level_up,
            gender_eligibility="MIXED",
        )
        EventRule.objects.create(
            event=self.event_definition,
            variant=self.variant_solo,
            level=self.level_hs,
            gender_eligibility="MIXED",
        )

    def test_events_list_includes_catalog_details_and_effective_levels(self):
        variant_event = Event.objects.create(
            name="Legacy Wrong Name",
            description="Legacy wrong description",
            category="music",
            event_definition=self.event_definition,
            event_variant=self.variant_solo,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(10, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="published",
        )
        base_event = Event.objects.create(
            name="Another Wrong Name",
            description="Legacy base description",
            category="music",
            event_definition=self.event_definition,
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="published",
        )

        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(reverse("event-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items = {item["id"]: item for item in response.data}
        self.assertIn(variant_event.id, items)
        self.assertIn(base_event.id, items)

        variant_payload = items[variant_event.id]
        self.assertIsNotNone(variant_payload.get("event_definition_details"))
        self.assertIsNotNone(variant_payload.get("event_variant_details"))
        self.assertEqual(variant_payload.get("effective_level_codes"), ["HS"])

        base_payload = items[base_event.id]
        self.assertIsNotNone(base_payload.get("event_definition_details"))
        self.assertIsNone(base_payload.get("event_variant_details"))
        self.assertEqual(base_payload.get("effective_level_codes"), ["LP", "UP"])

    def test_event_create_canonicalizes_name_and_category(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Manual Wrong Name",
            "description": "Manual description",
            "category": "music",
            "event_definition": self.event_definition.id,
            "event_variant": self.variant_solo.id,
            "date": str(date.today()),
            "start_time": "11:00:00",
            "end_time": "12:00:00",
            "venue": self.venue.id,
            "max_participants": 1,
            "judges": [self.judge.id],
            "volunteers": [],
            "status": "draft",
        }

        response = self.client.post(reverse("event-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        event = Event.objects.get(pk=response.data["id"])
        self.assertEqual(event.name, "Canonical Dance - Solo")
        self.assertEqual(event.category, "dance")

        self.assertIsNotNone(response.data.get("event_definition_details"))
        self.assertIsNotNone(response.data.get("event_variant_details"))
        self.assertEqual(response.data.get("effective_level_codes"), ["HS"])

    def test_event_create_rejects_variant_from_different_definition(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Should fail",
            "description": "Should fail",
            "category": "dance",
            "event_definition": self.event_definition.id,
            "event_variant": self.other_variant.id,
            "date": str(date.today()),
            "start_time": "13:00:00",
            "end_time": "14:00:00",
            "venue": self.venue.id,
            "max_participants": 1,
            "judges": [self.judge.id],
            "volunteers": [],
            "status": "draft",
        }

        response = self.client.post(reverse("event-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("event_variant", str(response.data).lower())

    def test_repair_management_command_backfills_existing_bad_records(self):
        valid_variant_event = Event.objects.create(
            name="Old Wrong Name",
            description="Old",
            category="music",
            event_definition=self.event_definition,
            event_variant=self.variant_solo,
            date=date.today(),
            start_time=time(15, 0),
            end_time=time(16, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="draft",
        )
        invalid_variant_event = Event.objects.create(
            name="Wrong Invalid Variant",
            description="Old invalid variant",
            category="music",
            event_definition=self.event_definition,
            event_variant=self.other_variant,
            date=date.today(),
            start_time=time(16, 0),
            end_time=time(17, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="draft",
        )
        orphan_variant_event = Event.objects.create(
            name="Orphan Variant",
            description="Old orphan variant",
            category="dance",
            event_variant=self.other_variant,
            date=date.today(),
            start_time=time(17, 0),
            end_time=time(18, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status="draft",
        )

        call_command("repair_event_catalog_backfill", verbosity=0)

        valid_variant_event.refresh_from_db()
        invalid_variant_event.refresh_from_db()
        orphan_variant_event.refresh_from_db()

        self.assertEqual(valid_variant_event.name, "Canonical Dance - Solo")
        self.assertEqual(valid_variant_event.category, "dance")
        self.assertEqual(valid_variant_event.event_variant_id, self.variant_solo.id)

        self.assertEqual(invalid_variant_event.name, "Canonical Dance")
        self.assertEqual(invalid_variant_event.category, "dance")
        self.assertIsNone(invalid_variant_event.event_variant_id)

        self.assertIsNone(orphan_variant_event.event_variant_id)

        # Idempotency check
        call_command("repair_event_catalog_backfill", verbosity=0)
        valid_variant_event.refresh_from_db()
        invalid_variant_event.refresh_from_db()
        orphan_variant_event.refresh_from_db()

        self.assertEqual(valid_variant_event.name, "Canonical Dance - Solo")
        self.assertEqual(invalid_variant_event.name, "Canonical Dance")
        self.assertIsNone(invalid_variant_event.event_variant_id)
        self.assertIsNone(orphan_variant_event.event_variant_id)


class GroupEventsProvisionCommandTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("load_catalog_seed", verbosity=0)
        cls.primary_admin = User.objects.create_user(
            username="group_admin_primary",
            email="group_admin_primary@test.com",
            password="testpass123",
            role="admin",
        )
        cls.secondary_admin = User.objects.create_user(
            username="group_admin_secondary",
            email="group_admin_secondary@test.com",
            password="testpass123",
            role="admin",
        )

    def _auto_events(self):
        return (
            Event.objects.filter(description__startswith=AUTO_PROVISION_DESCRIPTION_PREFIX)
            .select_related("event_definition", "venue", "created_by")
            .order_by("date", "start_time", "id")
        )

    def _expected_max_participants(self, event_definition):
        base_max_values = [
            value
            for value in event_definition.rules.filter(variant__isnull=True).values_list(
                "max_participants",
                flat=True,
            )
            if value is not None
        ]
        if base_max_values:
            return max(base_max_values)

        fallback_values = [
            value
            for value in event_definition.rules.values_list("max_participants", flat=True)
            if value is not None
        ]
        if fallback_values:
            return max(fallback_values)

        return DEFAULT_FALLBACK_MAX_PARTICIPANTS

    def test_provision_group_events_creates_published_catalog_aligned_rows(self):
        call_command(
            "provision_group_events",
            "--skip-catalog-seed",
            "--admin-username",
            self.primary_admin.username,
            "--start-date",
            "2025-01-10",
            "--start-time",
            "09:00",
            "--slot-minutes",
            "120",
            verbosity=0,
        )

        auto_events = list(self._auto_events())
        self.assertEqual(len(auto_events), len(TARGET_GROUP_EVENT_NAMES))

        names_found = {event.event_definition.event_name for event in auto_events}
        self.assertEqual(set(TARGET_GROUP_EVENT_NAMES), names_found)

        for event in auto_events:
            event_definition = event.event_definition
            self.assertIsNotNone(event_definition)
            self.assertIsNone(event.event_variant)
            self.assertEqual(event.status, "published")
            self.assertEqual(event.created_by_id, self.primary_admin.id)
            self.assertEqual(event.venue.name, DEFAULT_VENUE_NAME)
            self.assertEqual(
                event.name,
                build_canonical_event_name_from_models(event_definition, event_variant=None),
            )
            self.assertEqual(
                event.category,
                map_event_definition_category_to_event_category(event_definition, strict=True),
            )
            self.assertEqual(
                event.max_participants,
                self._expected_max_participants(event_definition),
            )

        for previous_event, current_event in zip(auto_events, auto_events[1:]):
            previous_end = datetime.combine(previous_event.date, previous_event.end_time)
            current_start = datetime.combine(current_event.date, current_event.start_time)
            self.assertGreaterEqual(current_start, previous_end)

        venue = Venue.objects.get(name=DEFAULT_VENUE_NAME)
        self.assertGreaterEqual(venue.capacity, len(TARGET_GROUP_EVENT_NAMES))
        self.assertGreaterEqual(venue.event_limit, len(TARGET_GROUP_EVENT_NAMES))

    def test_provision_group_events_is_idempotent_and_updates_existing_auto_rows(self):
        call_command(
            "provision_group_events",
            "--skip-catalog-seed",
            "--admin-username",
            self.primary_admin.username,
            "--start-date",
            "2025-01-10",
            "--start-time",
            "09:00",
            "--slot-minutes",
            "120",
            verbosity=0,
        )

        first_pass_events = {
            event.event_definition.event_name: event
            for event in self._auto_events()
        }

        call_command(
            "provision_group_events",
            "--skip-catalog-seed",
            "--admin-username",
            self.secondary_admin.username,
            "--start-date",
            "2025-01-12",
            "--start-time",
            "10:30",
            "--slot-minutes",
            "90",
            verbosity=0,
        )

        second_pass_events = {
            event.event_definition.event_name: event
            for event in self._auto_events()
        }

        self.assertEqual(
            Event.objects.filter(description__startswith=AUTO_PROVISION_DESCRIPTION_PREFIX).count(),
            len(TARGET_GROUP_EVENT_NAMES),
        )

        for event_name in TARGET_GROUP_EVENT_NAMES:
            self.assertIn(event_name, first_pass_events)
            self.assertIn(event_name, second_pass_events)
            self.assertEqual(first_pass_events[event_name].id, second_pass_events[event_name].id)
            self.assertEqual(second_pass_events[event_name].created_by_id, self.secondary_admin.id)

        first_event = second_pass_events[TARGET_GROUP_EVENT_NAMES[0]]
        self.assertEqual(str(first_event.date), "2025-01-12")
        self.assertEqual(first_event.start_time, time(10, 30))

    def test_provision_group_events_supports_dry_run_without_writes(self):
        output = StringIO()

        call_command(
            "provision_group_events",
            "--skip-catalog-seed",
            "--dry-run",
            stdout=output,
            verbosity=0,
        )

        command_output = output.getvalue()
        self.assertIn("DRY RUN", command_output)
        self.assertIn("create:", command_output)
        self.assertFalse(Venue.objects.filter(name=DEFAULT_VENUE_NAME).exists())
        self.assertEqual(
            Event.objects.filter(description__startswith=AUTO_PROVISION_DESCRIPTION_PREFIX).count(),
            0,
        )

    def test_provision_group_events_raises_when_no_active_admin(self):
        User.objects.filter(role="admin").update(is_active=False)

        with self.assertRaisesMessage(CommandError, "No active admin user found."):
            call_command(
                "provision_group_events",
                "--skip-catalog-seed",
                "--dry-run",
                verbosity=0,
            )
