from datetime import date, time

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from catalog.models import ArtCategory, EventDefinition, EventRule, EventVariant, Level, ParticipationType
from events.models import Event, EventRegistration, Venue
from users.models import School, User
from users.workflow_models import SchoolGroupEntry, SchoolParticipant
from users.workflow_views import _eligible_school_events_by_matrix


class SchoolGroupParticipantsFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.school_profile = School.objects.create(
            name='Group Workflow School',
            category='HS',
            is_active=True,
        )
        self.school_user = User.objects.create_user(
            username='group_school_user',
            email='group_school_user@test.com',
            password='testpass123',
            role='school',
            school=self.school_profile,
        )
        self.admin = User.objects.create_user(
            username='group_admin',
            email='group_admin@test.com',
            password='testpass123',
            role='admin',
        )
        self.group_leader_student = User.objects.create_user(
            username='group_leader_student',
            email='group_leader_student@test.com',
            password='testpass123',
            role='student',
            first_name='LEAD',
            last_name='ONE',
            school=self.school_profile,
            student_class=9,
            approval_status='approved',
            is_active=True,
        )
        self.other_student = User.objects.create_user(
            username='group_other_student',
            email='group_other_student@test.com',
            password='testpass123',
            role='student',
            first_name='OTHER',
            last_name='STUDENT',
            school=self.school_profile,
            student_class=9,
            approval_status='approved',
            is_active=True,
        )

        self.venue = Venue.objects.create(
            name='Group Workflow Venue',
            location='Group Workflow Location',
            capacity=120,
            event_limit=10,
        )

        dance_category, _ = ArtCategory.objects.get_or_create(category_name='DANCE')
        group_type, _ = ParticipationType.objects.get_or_create(type_name='GROUP')
        individual_type, _ = ParticipationType.objects.get_or_create(type_name='INDIVIDUAL')

        self.group_event_definition = EventDefinition.objects.create(
            event_code='GRP-001',
            event_name='Group Dance Event',
            category=dance_category,
            participation_type=group_type,
        )
        self.individual_event_definition = EventDefinition.objects.create(
            event_code='IND-001',
            event_name='Solo Dance Event',
            category=dance_category,
            participation_type=individual_type,
        )
        self.hs_level, _ = Level.objects.get_or_create(
            level_code='HS',
            defaults={'level_name': 'High School'},
        )
        self.up_level, _ = Level.objects.get_or_create(
            level_code='UP',
            defaults={'level_name': 'Upper Primary'},
        )
        EventRule.objects.create(
            event=self.group_event_definition,
            level=self.hs_level,
            gender_eligibility='MIXED',
            min_participants=2,
            max_participants=20,
        )
        self.boys_group_event_definition = EventDefinition.objects.create(
            event_code='GRP-002',
            event_name='Boys Group Dance Event',
            category=dance_category,
            participation_type=group_type,
        )
        self.up_group_event_definition = EventDefinition.objects.create(
            event_code='GRP-003',
            event_name='UP Group Dance Event',
            category=dance_category,
            participation_type=group_type,
        )
        self.girls_group_event_definition = EventDefinition.objects.create(
            event_code='GRP-004',
            event_name='Girls Group Dance Event',
            category=dance_category,
            participation_type=group_type,
        )
        EventRule.objects.create(
            event=self.boys_group_event_definition,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=2,
            max_participants=20,
        )
        EventRule.objects.create(
            event=self.up_group_event_definition,
            level=self.up_level,
            gender_eligibility='MIXED',
            min_participants=2,
            max_participants=20,
        )
        EventRule.objects.create(
            event=self.girls_group_event_definition,
            level=self.hs_level,
            gender_eligibility='GIRLS',
            min_participants=2,
            max_participants=20,
        )
        self.boys_variant = EventVariant.objects.create(
            event=self.group_event_definition,
            variant_name='Boys Variant',
        )
        EventRule.objects.create(
            event=self.group_event_definition,
            variant=self.boys_variant,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=2,
            max_participants=20,
        )

        self.group_event = Event.objects.create(
            name='Group Dance Event',
            description='Group event',
            category='dance',
            event_definition=self.group_event_definition,
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            venue=self.venue,
            max_participants=20,
            created_by=self.admin,
            status='published',
        )
        self.individual_event = Event.objects.create(
            name='Solo Dance Event',
            description='Individual event',
            category='dance',
            event_definition=self.individual_event_definition,
            date=date.today(),
            start_time=time(11, 0),
            end_time=time(12, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='published',
        )
        self.boys_group_event = Event.objects.create(
            name='Boys Group Dance Event',
            description='Boys group event',
            category='dance',
            event_definition=self.boys_group_event_definition,
            date=date.today(),
            start_time=time(12, 0),
            end_time=time(13, 0),
            venue=self.venue,
            max_participants=20,
            created_by=self.admin,
            status='published',
        )
        self.up_group_event = Event.objects.create(
            name='UP Group Dance Event',
            description='UP group event',
            category='dance',
            event_definition=self.up_group_event_definition,
            date=date.today(),
            start_time=time(13, 0),
            end_time=time(14, 0),
            venue=self.venue,
            max_participants=20,
            created_by=self.admin,
            status='published',
        )
        self.girls_group_event = Event.objects.create(
            name='Girls Group Dance Event',
            description='Girls group event',
            category='dance',
            event_definition=self.girls_group_event_definition,
            date=date.today(),
            start_time=time(13, 30),
            end_time=time(14, 30),
            venue=self.venue,
            max_participants=20,
            created_by=self.admin,
            status='published',
        )
        self.variant_group_event = Event.objects.create(
            name='Group Dance Event - Boys Variant',
            description='Variant restricted group event',
            category='dance',
            event_definition=self.group_event_definition,
            event_variant=self.boys_variant,
            date=date.today(),
            start_time=time(14, 0),
            end_time=time(15, 0),
            venue=self.venue,
            max_participants=20,
            created_by=self.admin,
            status='published',
        )
        self.draft_boys_group_event = Event.objects.create(
            name='Boys Group Dance Event Draft',
            description='Draft boys group event',
            category='dance',
            event_definition=self.boys_group_event_definition,
            date=date.today(),
            start_time=time(15, 0),
            end_time=time(16, 0),
            venue=self.venue,
            max_participants=20,
            created_by=self.admin,
            status='draft',
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _submit_group(self, group_id='GRP-A', event_ids=None, group_class='HS', gender_category='MIXED'):
        if event_ids is None:
            event_ids = [self.group_event.id]

        self._auth(self.school_user)
        payload = {
            'groups': [
                {
                    'group_id': group_id,
                    'group_class': group_class,
                    'gender_category': gender_category,
                    'participant_count': 3,
                    'leader_index': 2,
                    'participants': [
                        {'first_name': 'MEMBER', 'last_name': 'ONE'},
                        {'first_name': 'LEAD', 'last_name': 'ONE'},
                        {'first_name': 'MEMBER', 'last_name': 'THREE'},
                    ],
                    'event_ids': event_ids,
                }
            ]
        }
        return self.client.post(reverse('school-submit-group-participants'), payload, format='json')

    def _submit_individual(self, participant_id, event_ids, student_class=9, gender='BOYS'):
        self._auth(self.school_user)
        payload = {
            'participants': [
                {
                    'participant_id': participant_id,
                    'first_name': 'IND',
                    'last_name': 'STUDENT',
                    'student_class': student_class,
                    'gender': gender,
                    'event_ids': event_ids,
                }
            ]
        }
        return self.client.post(reverse('school-submit-participants'), payload, format='json')

    def test_school_can_submit_group_participants_for_group_events(self):
        response = self._submit_group(group_id='GRP-100')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data.get('count'), 1)

        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-100', school=self.school_user)
        self.assertEqual(group_entry.group_class, 'HS')
        self.assertEqual(group_entry.gender_category, 'MIXED')
        self.assertEqual(group_entry.participant_count, 3)
        self.assertEqual(group_entry.leader_full_name, 'LEAD ONE')
        self.assertEqual(group_entry.leader_user_id, self.group_leader_student.id)
        self.assertEqual(group_entry.members.count(), 3)
        self.assertEqual(group_entry.members.filter(is_leader=True).count(), 1)
        self.assertEqual(set(group_entry.events.values_list('id', flat=True)), {self.group_event.id})

    def test_submit_group_rejects_non_group_event_ids(self):
        response = self._submit_group(group_id='GRP-101', event_ids=[self.individual_event.id])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid group event ids', str(response.data).lower())

    def test_school_individual_events_requires_class_or_level_and_gender_filters(self):
        self._auth(self.school_user)

        missing_gender_response = self.client.get(
            reverse('school-individual-events'),
            {'student_class': 9},
        )
        self.assertEqual(missing_gender_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender_category', str(missing_gender_response.data).lower())

        missing_class_response = self.client.get(
            reverse('school-individual-events'),
            {'gender_category': 'BOYS'},
        )
        self.assertEqual(missing_class_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('student_class or level_code', str(missing_class_response.data).lower())

    def test_school_individual_events_partial_filters_with_level_code_only_or_camel_gender_only_return_400(self):
        self._auth(self.school_user)

        missing_gender_with_level_response = self.client.get(
            reverse('school-individual-events'),
            {'levelCode': 'HS'},
        )
        self.assertEqual(missing_gender_with_level_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender_category', str(missing_gender_with_level_response.data).lower())

        camel_gender_only_response = self.client.get(
            reverse('school-individual-events'),
            {'genderCategory': 'BOYS'},
        )
        self.assertEqual(camel_gender_only_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('student_class or level_code', str(camel_gender_only_response.data).lower())

    def test_school_individual_events_with_no_params_returns_published_individual_events(self):
        draft_individual_event = Event.objects.create(
            name='Draft Solo Event Startup Load',
            description='Draft individual event for startup load',
            category='dance',
            event_definition=self.individual_event_definition,
            date=date.today(),
            start_time=time(19, 0),
            end_time=time(20, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='draft',
        )

        self._auth(self.school_user)
        response = self.client.get(reverse('school-individual-events'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['id'] for item in response.data}, {self.individual_event.id})
        self.assertNotIn(draft_individual_event.id, {item['id'] for item in response.data})

    def test_school_individual_events_returns_published_matrix_eligible_individual_events(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )

        girls_event_definition = EventDefinition.objects.create(
            event_code='IND-002',
            event_name='Girls Solo Event',
            category=self.group_event_definition.category,
            participation_type=self.individual_event_definition.participation_type,
        )
        EventRule.objects.create(
            event=girls_event_definition,
            level=self.hs_level,
            gender_eligibility='GIRLS',
            min_participants=1,
            max_participants=1,
        )
        girls_event = Event.objects.create(
            name='Girls Solo Event',
            description='Girls individual event',
            category='dance',
            event_definition=girls_event_definition,
            date=date.today(),
            start_time=time(16, 0),
            end_time=time(17, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='published',
        )
        draft_individual_event = Event.objects.create(
            name='Draft Solo Event',
            description='Draft individual event',
            category='dance',
            event_definition=self.individual_event_definition,
            date=date.today(),
            start_time=time(17, 0),
            end_time=time(18, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='draft',
        )

        self._auth(self.school_user)
        class_response = self.client.get(
            reverse('school-individual-events'),
            {'studentClass': 9, 'genderCategory': 'BOYS'},
        )
        self.assertEqual(class_response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['id'] for item in class_response.data}, {self.individual_event.id})
        self.assertNotIn(draft_individual_event.id, {item['id'] for item in class_response.data})
        self.assertNotIn(girls_event.id, {item['id'] for item in class_response.data})

        level_response = self.client.get(
            reverse('school-individual-events'),
            {'levelCode': 'HS', 'gender_category': 'BOYS'},
        )
        self.assertEqual(level_response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['id'] for item in level_response.data}, {self.individual_event.id})

    def test_school_individual_events_accepts_snake_case_query_params(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )

        self._auth(self.school_user)
        response = self.client.get(
            reverse('school-individual-events'),
            {'student_class': 9, 'gender_category': 'BOYS'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['id'] for item in response.data}, {self.individual_event.id})

    def test_submit_individual_rejects_non_integer_non_individual_or_ineligible_event_ids(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )
        draft_individual_event = Event.objects.create(
            name='Draft Solo Validation Event',
            description='Draft individual validation event',
            category='dance',
            event_definition=self.individual_event_definition,
            date=date.today(),
            start_time=time(18, 0),
            end_time=time(19, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='draft',
        )
        up_individual_definition = EventDefinition.objects.create(
            event_code='IND-003',
            event_name='UP Solo Event',
            category=self.group_event_definition.category,
            participation_type=self.individual_event_definition.participation_type,
        )
        EventRule.objects.create(
            event=up_individual_definition,
            level=self.up_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )
        up_individual_event = Event.objects.create(
            name='UP Solo Event',
            description='UP individual event',
            category='dance',
            event_definition=up_individual_definition,
            date=date.today(),
            start_time=time(19, 0),
            end_time=time(20, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='published',
        )
        girls_individual_definition = EventDefinition.objects.create(
            event_code='IND-005',
            event_name='Girls HS Solo Event',
            category=self.group_event_definition.category,
            participation_type=self.individual_event_definition.participation_type,
        )
        EventRule.objects.create(
            event=girls_individual_definition,
            level=self.hs_level,
            gender_eligibility='GIRLS',
            min_participants=1,
            max_participants=1,
        )
        girls_individual_event = Event.objects.create(
            name='Girls HS Solo Event',
            description='Girls individual event',
            category='dance',
            event_definition=girls_individual_definition,
            date=date.today(),
            start_time=time(20, 0),
            end_time=time(21, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='published',
        )

        invalid_format_response = self._submit_individual(
            participant_id='IND-FMT',
            event_ids=['abc'],
        )
        self.assertEqual(invalid_format_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid event id format', str(invalid_format_response.data).lower())

        non_individual_response = self._submit_individual(
            participant_id='IND-TYPE',
            event_ids=[self.group_event.id],
        )
        self.assertEqual(non_individual_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid individual event ids', str(non_individual_response.data).lower())
        self.assertIn(str(self.group_event.id), str(non_individual_response.data))

        draft_response = self._submit_individual(
            participant_id='IND-DRAFT',
            event_ids=[draft_individual_event.id],
        )
        self.assertEqual(draft_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible individual event ids', str(draft_response.data).lower())
        self.assertIn(str(draft_individual_event.id), str(draft_response.data))

        ineligible_level_response = self._submit_individual(
            participant_id='IND-LEVEL',
            event_ids=[up_individual_event.id],
        )
        self.assertEqual(ineligible_level_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible individual event ids', str(ineligible_level_response.data).lower())
        self.assertIn(str(up_individual_event.id), str(ineligible_level_response.data))

        ineligible_gender_response = self._submit_individual(
            participant_id='IND-GENDER',
            event_ids=[girls_individual_event.id],
            gender='BOYS',
        )
        self.assertEqual(ineligible_gender_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible individual event ids', str(ineligible_gender_response.data).lower())
        self.assertIn(str(girls_individual_event.id), str(ineligible_gender_response.data))

    def test_submit_individual_accepts_published_eligible_individual_event_ids(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )
        second_individual_definition = EventDefinition.objects.create(
            event_code='IND-004',
            event_name='Second HS Solo Event',
            category=self.group_event_definition.category,
            participation_type=self.individual_event_definition.participation_type,
        )
        EventRule.objects.create(
            event=second_individual_definition,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )
        second_individual_event = Event.objects.create(
            name='Second HS Solo Event',
            description='Second eligible individual event',
            category='dance',
            event_definition=second_individual_definition,
            date=date.today(),
            start_time=time(20, 0),
            end_time=time(21, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='published',
        )

        response = self._submit_individual(
            participant_id='IND-OK',
            event_ids=[self.individual_event.id, second_individual_event.id],
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        participant = SchoolParticipant.objects.get(school=self.school_user, participant_id='IND-OK')
        self.assertEqual(
            set(participant.events.values_list('id', flat=True)),
            {self.individual_event.id, second_individual_event.id},
        )

    def test_submit_individual_accepts_variant_only_rules_for_non_variant_event(self):
        language_variant = EventVariant.objects.create(
            event=self.individual_event_definition,
            variant_name='Language A',
        )
        EventRule.objects.create(
            event=self.individual_event_definition,
            variant=language_variant,
            level=self.up_level,
            gender_eligibility='MIXED',
            min_participants=1,
            max_participants=1,
        )

        response = self._submit_individual(
            participant_id='IND-VARIANT-POOL',
            event_ids=[self.individual_event.id],
            student_class=5,
            gender='GIRLS',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        participant = SchoolParticipant.objects.get(school=self.school_user, participant_id='IND-VARIANT-POOL')
        self.assertEqual(set(participant.events.values_list('id', flat=True)), {self.individual_event.id})

    def test_submit_individual_accepts_camel_case_payload_keys(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )

        self._auth(self.school_user)
        payload = {
            'participants': [
                {
                    'participantId': 'IND-CAMEL-OK',
                    'firstName': 'IND',
                    'lastName': 'STUDENT',
                    'studentClass': 9,
                    'genderCategory': 'BOYS',
                    'eventIds': [self.individual_event.id],
                }
            ]
        }
        response = self.client.post(reverse('school-submit-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        participant = SchoolParticipant.objects.get(school=self.school_user, participant_id='IND-CAMEL-OK')
        self.assertEqual(participant.student_class, 9)
        self.assertEqual(participant.gender, 'BOYS')
        self.assertEqual(set(participant.events.values_list('id', flat=True)), {self.individual_event.id})

    def test_submit_individual_with_camel_case_keys_still_rejects_invalid_gender_value(self):
        self._auth(self.school_user)
        payload = {
            'participants': [
                {
                    'participantId': 'IND-CAMEL-GENDER',
                    'firstName': 'IND',
                    'lastName': 'STUDENT',
                    'studentClass': 9,
                    'genderCategory': 'MIXED',
                    'eventIds': [self.individual_event.id],
                }
            ]
        }

        response = self.client.post(reverse('school-submit-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid gender', str(response.data).lower())

    def test_submit_individual_with_camel_case_keys_still_rejects_invalid_student_class_range(self):
        self._auth(self.school_user)
        payload = {
            'participants': [
                {
                    'participantId': 'IND-CAMEL-CLASS',
                    'firstName': 'IND',
                    'lastName': 'STUDENT',
                    'studentClass': 13,
                    'genderCategory': 'BOYS',
                    'eventIds': [self.individual_event.id],
                }
            ]
        }

        response = self.client.post(reverse('school-submit-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('between 1 and 12', str(response.data).lower())

    def test_submit_individual_with_camel_case_keys_still_rejects_non_individual_event_ids(self):
        self._auth(self.school_user)
        payload = {
            'participants': [
                {
                    'participantId': 'IND-CAMEL-TYPE',
                    'firstName': 'IND',
                    'lastName': 'STUDENT',
                    'studentClass': 9,
                    'genderCategory': 'BOYS',
                    'eventIds': [self.group_event.id],
                }
            ]
        }

        response = self.client.post(reverse('school-submit-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid individual event ids', str(response.data).lower())
        self.assertIn(str(self.group_event.id), str(response.data))

    def test_submit_individual_with_camel_case_keys_still_rejects_matrix_ineligible_event_ids(self):
        up_individual_definition = EventDefinition.objects.create(
            event_code='IND-006',
            event_name='UP Boys Solo Event',
            category=self.group_event_definition.category,
            participation_type=self.individual_event_definition.participation_type,
        )
        EventRule.objects.create(
            event=up_individual_definition,
            level=self.up_level,
            gender_eligibility='BOYS',
            min_participants=1,
            max_participants=1,
        )
        up_individual_event = Event.objects.create(
            name='UP Boys Solo Event',
            description='UP-only individual event',
            category='dance',
            event_definition=up_individual_definition,
            date=date.today(),
            start_time=time(21, 0),
            end_time=time(22, 0),
            venue=self.venue,
            max_participants=1,
            created_by=self.admin,
            status='published',
        )

        self._auth(self.school_user)
        payload = {
            'participants': [
                {
                    'participantId': 'IND-CAMEL-MATRIX',
                    'firstName': 'IND',
                    'lastName': 'STUDENT',
                    'studentClass': 9,
                    'genderCategory': 'BOYS',
                    'eventIds': [up_individual_event.id],
                }
            ]
        }

        response = self.client.post(reverse('school-submit-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible individual event ids', str(response.data).lower())
        self.assertIn(str(up_individual_event.id), str(response.data))

    def test_submit_individual_batch_creates_valid_rows_and_reports_invalid_rows(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='MIXED',
            min_participants=1,
            max_participants=1,
        )

        self._auth(self.school_user)
        payload = {
            'participants': [
                {
                    'participant_id': 'IND-BATCH-OK',
                    'first_name': 'VALID',
                    'last_name': 'STUDENT',
                    'student_class': 9,
                    'gender': 'BOYS',
                    'event_ids': [self.individual_event.id],
                },
                {
                    'participant_id': 'IND-BATCH-BAD',
                    'first_name': 'INVALID',
                    'last_name': 'STUDENT',
                    'student_class': 9,
                    'gender': 'BOYS',
                    'event_ids': [self.group_event.id],
                },
            ]
        }

        response = self.client.post(reverse('school-submit-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data.get('count'), 1)
        self.assertEqual(response.data.get('error_count'), 1)
        self.assertEqual(len(response.data.get('errors', [])), 1)
        self.assertIn('invalid individual event ids', str(response.data.get('errors', [{}])[0].get('error', '')).lower())

        self.assertTrue(SchoolParticipant.objects.filter(school=self.school_user, participant_id='IND-BATCH-OK').exists())
        self.assertFalse(SchoolParticipant.objects.filter(school=self.school_user, participant_id='IND-BATCH-BAD').exists())

    def test_submit_group_batch_creates_valid_rows_and_reports_invalid_rows(self):
        self._auth(self.school_user)
        payload = {
            'groups': [
                {
                    'group_id': 'GRP-BATCH-OK',
                    'group_class': 'HS',
                    'gender_category': 'MIXED',
                    'participant_count': 3,
                    'leader_index': 2,
                    'participants': [
                        {'first_name': 'MEMBER', 'last_name': 'ONE'},
                        {'first_name': 'LEAD', 'last_name': 'ONE'},
                        {'first_name': 'MEMBER', 'last_name': 'THREE'},
                    ],
                    'event_ids': [self.group_event.id],
                },
                {
                    'group_id': 'GRP-BATCH-BAD',
                    'group_class': 'HS',
                    'gender_category': 'MIXED',
                    'participant_count': 3,
                    'leader_index': 2,
                    'participants': [
                        {'first_name': 'MEMBER', 'last_name': 'ONE'},
                        {'first_name': 'LEAD', 'last_name': 'ONE'},
                        {'first_name': 'MEMBER', 'last_name': 'THREE'},
                    ],
                    'event_ids': [self.individual_event.id],
                },
            ]
        }

        response = self.client.post(reverse('school-submit-group-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data.get('count'), 1)
        self.assertEqual(response.data.get('error_count'), 1)
        self.assertEqual(len(response.data.get('errors', [])), 1)
        self.assertIn('invalid group event ids', str(response.data.get('errors', [{}])[0].get('error', '')).lower())

        self.assertTrue(SchoolGroupEntry.objects.filter(school=self.school_user, group_id='GRP-BATCH-OK').exists())
        self.assertFalse(SchoolGroupEntry.objects.filter(school=self.school_user, group_id='GRP-BATCH-BAD').exists())

    def test_school_group_events_filters_by_class_and_gender(self):
        self._auth(self.school_user)
        boys_response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'HS', 'gender_category': 'BOYS'},
        )
        self.assertEqual(boys_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item['id'] for item in boys_response.data},
            {self.boys_group_event.id, self.variant_group_event.id},
        )

        mixed_response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'HS', 'gender_category': 'MIXED'},
        )
        self.assertEqual(mixed_response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['id'] for item in mixed_response.data}, {self.group_event.id})

        girls_response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'HS', 'gender_category': 'GIRLS'},
        )
        self.assertEqual(girls_response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['id'] for item in girls_response.data}, {self.girls_group_event.id})
        self.assertNotIn(self.draft_boys_group_event.id, {item['id'] for item in boys_response.data})

    def test_school_event_matrix_helper_respects_filters_and_variant_precedence(self):
        eligible_ids, metadata = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(
                id__in=[
                    self.group_event.id,
                    self.boys_group_event.id,
                    self.variant_group_event.id,
                    self.individual_event.id,
                    self.draft_boys_group_event.id,
                ]
            ),
            required_participation_type='GROUP',
            level_code='HS',
            gender_category='BOYS',
            include_metadata=True,
        )

        self.assertEqual(
            eligible_ids,
            {self.boys_group_event.id, self.variant_group_event.id},
        )
        self.assertEqual(metadata[self.group_event.id]['reason'], 'gender_mismatch')
        self.assertEqual(metadata[self.individual_event.id]['reason'], 'participation_type_mismatch')
        self.assertEqual(metadata[self.draft_boys_group_event.id]['reason'], 'event_not_published')
        self.assertEqual(metadata[self.variant_group_event.id]['rule_source'], 'variant_specific')

    def test_school_event_matrix_helper_falls_back_to_default_variant_rules(self):
        fallback_variant = EventVariant.objects.create(
            event=self.boys_group_event_definition,
            variant_name='HS Boys Variant',
        )
        fallback_event = Event.objects.create(
            name='Boys Group Dance Event - Variant',
            description='Variant with no variant-specific rule',
            category='dance',
            event_definition=self.boys_group_event_definition,
            event_variant=fallback_variant,
            date=date.today(),
            start_time=time(15, 0),
            end_time=time(16, 0),
            venue=self.venue,
            max_participants=20,
            created_by=self.admin,
            status='published',
        )

        boys_eligible, boys_metadata = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(id=fallback_event.id),
            required_participation_type='GROUP',
            level_code='HS',
            gender_category='BOYS',
            include_metadata=True,
        )
        self.assertEqual(boys_eligible, {fallback_event.id})
        self.assertEqual(boys_metadata[fallback_event.id]['rule_source'], 'default_variant')

        mixed_eligible = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(id=fallback_event.id),
            required_participation_type='GROUP',
            level_code='HS',
            gender_category='MIXED',
        )
        self.assertEqual(mixed_eligible, set())

    def test_school_event_matrix_helper_supports_individual_participation_type(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='GIRLS',
            min_participants=1,
            max_participants=1,
        )

        girls_ids = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(id=self.individual_event.id),
            required_participation_type='INDIVIDUAL',
            level_code='HS',
            gender_category='GIRLS',
        )
        self.assertEqual(girls_ids, {self.individual_event.id})

        boys_ids = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(id=self.individual_event.id),
            required_participation_type='INDIVIDUAL',
            level_code='HS',
            gender_category='BOYS',
        )
        self.assertEqual(boys_ids, set())

    def test_school_event_matrix_helper_treats_individual_mixed_as_gender_eligible(self):
        EventRule.objects.create(
            event=self.individual_event_definition,
            level=self.hs_level,
            gender_eligibility='MIXED',
            min_participants=1,
            max_participants=1,
        )

        boys_ids = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(id=self.individual_event.id),
            required_participation_type='INDIVIDUAL',
            level_code='HS',
            gender_category='BOYS',
        )
        self.assertEqual(boys_ids, {self.individual_event.id})

        girls_ids = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(id=self.individual_event.id),
            required_participation_type='INDIVIDUAL',
            level_code='HS',
            gender_category='GIRLS',
        )
        self.assertEqual(girls_ids, {self.individual_event.id})

    def test_school_event_matrix_helper_falls_back_to_variant_pool_for_non_variant_individual_event(self):
        language_variant = EventVariant.objects.create(
            event=self.individual_event_definition,
            variant_name='Language A',
        )
        EventRule.objects.create(
            event=self.individual_event_definition,
            variant=language_variant,
            level=self.up_level,
            gender_eligibility='MIXED',
            min_participants=1,
            max_participants=1,
        )

        eligible_ids, metadata = _eligible_school_events_by_matrix(
            events_queryset=Event.objects.filter(id=self.individual_event.id),
            required_participation_type='INDIVIDUAL',
            level_code='UP',
            gender_category='GIRLS',
            include_metadata=True,
        )
        self.assertEqual(eligible_ids, {self.individual_event.id})
        self.assertEqual(metadata[self.individual_event.id]['rule_source'], 'variant_pool_fallback')

    def test_school_group_events_accepts_camel_case_query_params(self):
        self._auth(self.school_user)

        response = self.client.get(
            reverse('school-group-events'),
            {'groupClass': 'HS', 'genderCategory': 'BOYS'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item['id'] for item in response.data},
            {self.boys_group_event.id, self.variant_group_event.id},
        )

    def test_school_group_events_with_no_params_returns_published_group_events(self):
        """No params should return 200 with all published group events."""
        self._auth(self.school_user)

        response = self.client.get(reverse('school-group-events'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item['id'] for item in response.data},
            {
                self.group_event.id,
                self.boys_group_event.id,
                self.up_group_event.id,
                self.girls_group_event.id,
                self.variant_group_event.id,
            },
        )
        self.assertNotIn(self.draft_boys_group_event.id, {item['id'] for item in response.data})
        self.assertNotIn(self.individual_event.id, {item['id'] for item in response.data})

    def test_school_group_events_with_only_group_class_returns_400(self):
        """Only group_class param should return 400."""
        self._auth(self.school_user)

        response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'HS'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender_category', str(response.data).lower())

    def test_school_group_events_with_only_gender_category_returns_400(self):
        """Only gender_category param should return 400."""
        self._auth(self.school_user)

        response = self.client.get(
            reverse('school-group-events'),
            {'gender_category': 'MIXED'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('group_class', str(response.data).lower())

    def test_school_group_events_with_only_camel_case_partial_filters_return_400(self):
        self._auth(self.school_user)

        missing_gender_response = self.client.get(
            reverse('school-group-events'),
            {'groupClass': 'HS'},
        )
        self.assertEqual(missing_gender_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender_category', str(missing_gender_response.data).lower())

        missing_group_class_response = self.client.get(
            reverse('school-group-events'),
            {'genderCategory': 'MIXED'},
        )
        self.assertEqual(missing_group_class_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('group_class', str(missing_group_class_response.data).lower())

    def test_school_group_events_rejects_invalid_group_class_or_gender_query_values(self):
        self._auth(self.school_user)

        invalid_group_class_response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'INVALID', 'gender_category': 'MIXED'},
        )
        self.assertEqual(invalid_group_class_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('group_class', str(invalid_group_class_response.data).lower())

        invalid_gender_response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'HS', 'gender_category': 'INVALID'},
        )
        self.assertEqual(invalid_gender_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender_category', str(invalid_gender_response.data).lower())

    def test_school_group_events_filters_when_both_params_provided(self):
        """Both params provided should return 200 with filtered events."""
        self._auth(self.school_user)

        response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'HS', 'gender_category': 'MIXED'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should be a list (possibly empty if no matching events)
        self.assertIsInstance(response.data, list)


    def test_submit_group_rejects_class_gender_ineligible_event_ids(self):
        response = self._submit_group(
            group_id='GRP-INELIGIBLE',
            event_ids=[self.variant_group_event.id],
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.variant_group_event.id), str(response.data))

    def test_submit_group_rejects_mixed_group_for_girls_only_event_ids(self):
        response = self._submit_group(
            group_id='GRP-MIXED-GIRLS',
            group_class='HS',
            gender_category='MIXED',
            event_ids=[self.girls_group_event.id],
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.girls_group_event.id), str(response.data))

    def test_submit_group_rejects_boys_group_for_mixed_only_event_ids(self):
        response = self._submit_group(
            group_id='GRP-BOYS-MIXED',
            group_class='HS',
            gender_category='BOYS',
            event_ids=[self.group_event.id],
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.group_event.id), str(response.data))

    def test_submit_group_rejects_class_mismatch_even_when_gender_matches(self):
        response = self._submit_group(
            group_id='GRP-CLASS-MISMATCH',
            group_class='HS',
            gender_category='MIXED',
            event_ids=[self.up_group_event.id],
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.up_group_event.id), str(response.data))

    def test_submit_group_rejects_draft_group_event_ids(self):
        response = self._submit_group(
            group_id='GRP-DRAFT',
            group_class='HS',
            gender_category='BOYS',
            event_ids=[self.draft_boys_group_event.id],
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.draft_boys_group_event.id), str(response.data))

    def test_submit_group_accepts_class_gender_eligible_event_ids(self):
        response = self._submit_group(
            group_id='GRP-ELIGIBLE',
            group_class='HS',
            gender_category='BOYS',
            event_ids=[self.variant_group_event.id, self.boys_group_event.id],
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-ELIGIBLE', school=self.school_user)
        self.assertEqual(
            set(group_entry.events.values_list('id', flat=True)),
            {self.variant_group_event.id, self.boys_group_event.id},
        )

    def test_submit_group_accepts_camel_case_payload_keys(self):
        self._auth(self.school_user)
        payload = {
            'groups': [
                {
                    'group_id': 'GRP-CAMEL-OK',
                    'groupClass': 'HS',
                    'genderCategory': 'BOYS',
                    'participantCount': 3,
                    'leaderIndex': 2,
                    'leaderName': 'LEAD ONE',
                    'participants': [
                        {'first_name': 'MEMBER', 'last_name': 'ONE'},
                        {'first_name': 'LEAD', 'last_name': 'ONE'},
                        {'first_name': 'MEMBER', 'last_name': 'THREE'},
                    ],
                    'eventIds': [self.variant_group_event.id, self.boys_group_event.id],
                }
            ]
        }

        response = self.client.post(reverse('school-submit-group-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-CAMEL-OK', school=self.school_user)
        self.assertEqual(group_entry.group_class, 'HS')
        self.assertEqual(group_entry.gender_category, 'BOYS')
        self.assertEqual(group_entry.participant_count, 3)
        self.assertEqual(group_entry.leader_full_name, 'LEAD ONE')
        self.assertEqual(
            set(group_entry.events.values_list('id', flat=True)),
            {self.variant_group_event.id, self.boys_group_event.id},
        )

    def test_submit_group_with_camel_case_keys_still_rejects_ineligible_event_ids(self):
        self._auth(self.school_user)
        payload = {
            'groups': [
                {
                    'group_id': 'GRP-CAMEL-BAD',
                    'groupClass': 'HS',
                    'genderCategory': 'BOYS',
                    'participantCount': 3,
                    'leaderIndex': 2,
                    'participants': [
                        {'first_name': 'MEMBER', 'last_name': 'ONE'},
                        {'first_name': 'LEAD', 'last_name': 'ONE'},
                        {'first_name': 'MEMBER', 'last_name': 'THREE'},
                    ],
                    'eventIds': [self.group_event.id],
                }
            ]
        }

        response = self.client.post(reverse('school-submit-group-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.group_event.id), str(response.data))

    def test_submit_group_rejects_participant_limit_exceeding_twenty(self):
        participants = [{'first_name': f'STUDENT{i}', 'last_name': 'TEST'} for i in range(1, 22)]
        self._auth(self.school_user)
        payload = {
            'groups': [
                {
                    'group_id': 'GRP-OVER',
                    'group_class': 'HS',
                    'gender_category': 'MIXED',
                    'participant_count': 21,
                    'leader_index': 1,
                    'participants': participants,
                    'event_ids': [self.group_event.id],
                }
            ]
        }
        response = self.client.post(reverse('school-submit-group-participants'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('between 1 and 20', str(response.data).lower())

    def test_bulk_import_groups_csv_partial_success(self):
        self._auth(self.school_user)
        csv_content = (
            'Group ID,Group Class,Gender,Number of Participants,Participant Names,Leader Name,Event IDs\n'
            f'GRP-CSV-1,HS,MIXED,2,LEAD ONE|MEMBER TWO,LEAD ONE,{self.group_event.id}\n'
            f'GRP-CSV-2,HS,MIXED,25,LEAD ONE|MEMBER TWO,LEAD ONE,{self.group_event.id}\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('groups.csv', csv_content, content_type='text/csv')

        response = self.client.post(
            reverse('school-import-group-participants'),
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data.get('imported_count'), 1)
        self.assertEqual(response.data.get('error_count'), 1)
        self.assertTrue(SchoolGroupEntry.objects.filter(group_id='GRP-CSV-1', school=self.school_user).exists())

    def test_bulk_import_groups_rejects_non_group_event_ids(self):
        self._auth(self.school_user)
        csv_content = (
            'Group ID,Group Class,Gender,Number of Participants,Participant Names,Leader Name,Event IDs\n'
            f'GRP-CSV-NON-GROUP,HS,BOYS,2,LEAD ONE|MEMBER TWO,LEAD ONE,{self.individual_event.id}\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('groups.csv', csv_content, content_type='text/csv')

        response = self.client.post(
            reverse('school-import-group-participants'),
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('imported_count'), 0)
        self.assertEqual(response.data.get('error_count'), 1)
        self.assertIn('invalid group event ids', str(response.data).lower())
        self.assertIn(str(self.individual_event.id), str(response.data))
        self.assertFalse(
            SchoolGroupEntry.objects.filter(group_id='GRP-CSV-NON-GROUP', school=self.school_user).exists()
        )

    def test_bulk_import_groups_rejects_ineligible_event_ids_with_matrix_rules(self):
        self._auth(self.school_user)
        csv_content = (
            'Group ID,Group Class,Gender,Number of Participants,Participant Names,Leader Name,Event IDs\n'
            f'GRP-CSV-INELIGIBLE,HS,MIXED,2,LEAD ONE|MEMBER TWO,LEAD ONE,{self.up_group_event.id}\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('groups.csv', csv_content, content_type='text/csv')

        response = self.client.post(
            reverse('school-import-group-participants'),
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('imported_count'), 0)
        self.assertEqual(response.data.get('error_count'), 1)
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.up_group_event.id), str(response.data))
        self.assertFalse(
            SchoolGroupEntry.objects.filter(group_id='GRP-CSV-INELIGIBLE', school=self.school_user).exists()
        )

    def test_bulk_import_groups_partial_success_with_mixed_matrix_conditions(self):
        self._auth(self.school_user)
        csv_content = (
            'Group ID,Group Class,Gender,Number of Participants,Participant Names,Leader Name,Event IDs\n'
            f'GRP-CSV-MATRIX-OK,HS,BOYS,2,LEAD ONE|MEMBER TWO,LEAD ONE,{self.boys_group_event.id}\n'
            f'GRP-CSV-MATRIX-DRAFT,HS,BOYS,2,LEAD ONE|MEMBER TWO,LEAD ONE,{self.draft_boys_group_event.id}\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('groups.csv', csv_content, content_type='text/csv')

        response = self.client.post(
            reverse('school-import-group-participants'),
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data.get('imported_count'), 1)
        self.assertEqual(response.data.get('error_count'), 1)
        self.assertTrue(
            SchoolGroupEntry.objects.filter(group_id='GRP-CSV-MATRIX-OK', school=self.school_user).exists()
        )
        imported_entry = SchoolGroupEntry.objects.get(group_id='GRP-CSV-MATRIX-OK', school=self.school_user)
        self.assertEqual(set(imported_entry.events.values_list('id', flat=True)), {self.boys_group_event.id})
        self.assertFalse(
            SchoolGroupEntry.objects.filter(group_id='GRP-CSV-MATRIX-DRAFT', school=self.school_user).exists()
        )
        self.assertIn('ineligible group event ids', str(response.data).lower())
        self.assertIn(str(self.draft_boys_group_event.id), str(response.data))

    def test_admin_can_approve_and_reject_group_entries(self):
        submit_response = self._submit_group(group_id='GRP-APPROVE')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-APPROVE', school=self.school_user)

        self._auth(self.admin)
        list_response = self.client.get(reverse('admin-school-group-participants-list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == group_entry.id for item in list_response.data))
        explicit_pending_response = self.client.get(
            reverse('admin-school-group-participants-list'),
            {'status': 'pending'},
        )
        self.assertEqual(explicit_pending_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == group_entry.id for item in explicit_pending_response.data))

        approve_response = self.client.post(
            reverse('admin-approve-school-group-participant', args=[group_entry.id]),
            {'notes': 'Looks good'},
            format='json',
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        group_entry.refresh_from_db()
        self.assertEqual(group_entry.status, 'approved')
        default_pending_after_approval = self.client.get(reverse('admin-school-group-participants-list'))
        self.assertEqual(default_pending_after_approval.status_code, status.HTTP_200_OK)
        self.assertFalse(any(item['id'] == group_entry.id for item in default_pending_after_approval.data))
        approved_response = self.client.get(
            reverse('admin-school-group-participants-list'),
            {'status': 'approved'},
        )
        self.assertEqual(approved_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == group_entry.id for item in approved_response.data))

        second_response = self._submit_group(group_id='GRP-REJECT')
        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        second_group = SchoolGroupEntry.objects.get(group_id='GRP-REJECT', school=self.school_user)

        self._auth(self.admin)
        reject_response = self.client.post(
            reverse('admin-reject-school-group-participant', args=[second_group.id]),
            {'notes': 'Missing documents'},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)
        second_group.refresh_from_db()
        self.assertEqual(second_group.status, 'rejected')
        self.assertIn('missing documents', second_group.review_notes.lower())

    def test_school_group_listing_exposes_group_leader_credentials_until_password_reset(self):
        submit_response = self._submit_group(group_id='GRP-SCHOOL-CREDS')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-SCHOOL-CREDS', school=self.school_user)

        self._auth(self.admin)
        approve_response = self.client.post(
            reverse('admin-approve-school-group-participant', args=[group_entry.id]),
            {'notes': 'Approved for credentials check'},
            format='json',
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK, approve_response.data)
        approved_temp_password = approve_response.data['user_credentials']['password']

        self._auth(self.school_user)
        school_list_response = self.client.get(
            reverse('school-view-own-group-participants'),
            {'status': 'approved'},
        )
        self.assertEqual(school_list_response.status_code, status.HTTP_200_OK)
        target_entry = next(
            (item for item in school_list_response.data if item['id'] == group_entry.id),
            None,
        )
        self.assertIsNotNone(target_entry)
        leader_user_details = target_entry.get('leader_user_details') or {}
        self.assertEqual(leader_user_details.get('temporary_password'), approved_temp_password)
        self.assertTrue(leader_user_details.get('username'))

        approved_user = User.objects.get(id=approve_response.data['user_credentials']['user_id'])
        self.client.force_authenticate(user=approved_user)
        password_change_response = self.client.post(
            reverse('set-new-password'),
            {'new_password': 'NewPass123!'},
            format='json',
        )
        self.assertEqual(password_change_response.status_code, status.HTTP_200_OK, password_change_response.data)

        self._auth(self.school_user)
        school_list_after_reset = self.client.get(
            reverse('school-view-own-group-participants'),
            {'status': 'approved'},
        )
        self.assertEqual(school_list_after_reset.status_code, status.HTTP_200_OK)
        target_entry_after_reset = next(
            (item for item in school_list_after_reset.data if item['id'] == group_entry.id),
            None,
        )
        self.assertIsNotNone(target_entry_after_reset)
        leader_user_details_after_reset = target_entry_after_reset.get('leader_user_details') or {}
        self.assertIsNone(leader_user_details_after_reset.get('temporary_password'))

    def test_group_leader_temporary_password_not_exposed_to_admin_group_listing(self):
        submit_response = self._submit_group(group_id='GRP-ADMIN-PRIVACY')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-ADMIN-PRIVACY', school=self.school_user)

        self._auth(self.admin)
        approve_response = self.client.post(
            reverse('admin-approve-school-group-participant', args=[group_entry.id]),
            {'notes': 'Approved'},
            format='json',
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK, approve_response.data)

        admin_list_response = self.client.get(
            reverse('admin-school-group-participants-list'),
            {'status': 'approved'},
        )
        self.assertEqual(admin_list_response.status_code, status.HTTP_200_OK)
        approved_item = next((item for item in admin_list_response.data if item['id'] == group_entry.id), None)
        self.assertIsNotNone(approved_item)
        leader_user_details = approved_item.get('leader_user_details') or {}
        self.assertIsNone(leader_user_details.get('temporary_password'))

    def test_admin_group_listing_accepts_status_filter_aliases(self):
        approve_submit_response = self._submit_group(group_id='GRP-ALIAS-APPROVED')
        self.assertEqual(approve_submit_response.status_code, status.HTTP_201_CREATED)
        approve_group = SchoolGroupEntry.objects.get(group_id='GRP-ALIAS-APPROVED', school=self.school_user)

        reject_submit_response = self._submit_group(group_id='GRP-ALIAS-REJECTED')
        self.assertEqual(reject_submit_response.status_code, status.HTTP_201_CREATED)
        reject_group = SchoolGroupEntry.objects.get(group_id='GRP-ALIAS-REJECTED', school=self.school_user)

        self._auth(self.admin)
        approve_response = self.client.post(
            reverse('admin-approve-school-group-participant', args=[approve_group.id]),
            {'notes': 'Approved for alias test'},
            format='json',
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK, approve_response.data)

        reject_response = self.client.post(
            reverse('admin-reject-school-group-participant', args=[reject_group.id]),
            {'notes': 'Rejected for alias test'},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK, reject_response.data)

        accepted_response = self.client.get(
            reverse('admin-school-group-participants-list'),
            {'status': 'accepted'},
        )
        self.assertEqual(accepted_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == approve_group.id for item in accepted_response.data))
        self.assertFalse(any(item['id'] == reject_group.id for item in accepted_response.data))

        rejected_alias_response = self.client.get(
            reverse('admin-school-group-participants-list'),
            {'status': 'declined'},
        )
        self.assertEqual(rejected_alias_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == reject_group.id for item in rejected_alias_response.data))
        self.assertFalse(any(item['id'] == approve_group.id for item in rejected_alias_response.data))

    def test_admin_group_listing_apply_filters_intersection(self):
        hs_boys_submit = self._submit_group(
            group_id='GRP-FILTER-HS-BOYS',
            group_class='HS',
            gender_category='BOYS',
            event_ids=[self.boys_group_event.id],
        )
        self.assertEqual(hs_boys_submit.status_code, status.HTTP_201_CREATED, hs_boys_submit.data)

        hs_mixed_submit = self._submit_group(
            group_id='GRP-FILTER-HS-MIXED',
            group_class='HS',
            gender_category='MIXED',
            event_ids=[self.group_event.id],
        )
        self.assertEqual(hs_mixed_submit.status_code, status.HTTP_201_CREATED, hs_mixed_submit.data)

        hs_boys_group = SchoolGroupEntry.objects.get(group_id='GRP-FILTER-HS-BOYS', school=self.school_user)
        hs_mixed_group = SchoolGroupEntry.objects.get(group_id='GRP-FILTER-HS-MIXED', school=self.school_user)

        self._auth(self.admin)
        filter_response = self.client.get(
            reverse('admin-school-group-participants-list'),
            {
                'status': 'pending',
                'group_class': 'HS',
                'gender_category': 'BOYS',
                'school': str(self.school_user.id),
                'event': str(self.boys_group_event.id),
            },
        )
        self.assertEqual(filter_response.status_code, status.HTTP_200_OK)
        filtered_ids = {item['id'] for item in filter_response.data}
        self.assertIn(hs_boys_group.id, filtered_ids)
        self.assertNotIn(hs_mixed_group.id, filtered_ids)

    def test_admin_pending_participants_list_includes_submitted_individual_entries(self):
        submit_response = self._submit_individual(
            participant_id='IND-APPROVE',
            event_ids=[],
            student_class=9,
            gender='BOYS',
        )
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED, submit_response.data)
        participant = SchoolParticipant.objects.get(participant_id='IND-APPROVE', school=self.school_user)

        self._auth(self.admin)
        explicit_pending_response = self.client.get(
            reverse('admin-school-participants-list'),
            {'status': 'pending'},
        )
        self.assertEqual(explicit_pending_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == participant.id for item in explicit_pending_response.data))

        default_pending_response = self.client.get(reverse('admin-school-participants-list'))
        self.assertEqual(default_pending_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == participant.id for item in default_pending_response.data))

        approve_response = self.client.post(
            reverse('admin-approve-school-participant', args=[participant.id]),
            {},
            format='json',
        )
        self.assertEqual(approve_response.status_code, status.HTTP_201_CREATED, approve_response.data)
        participant.refresh_from_db()
        self.assertTrue(participant.verified_by_volunteer)

        default_pending_after_approval = self.client.get(reverse('admin-school-participants-list'))
        self.assertEqual(default_pending_after_approval.status_code, status.HTTP_200_OK)
        self.assertFalse(any(item['id'] == participant.id for item in default_pending_after_approval.data))

        approved_response = self.client.get(
            reverse('admin-school-participants-list'),
            {'status': 'approved'},
        )
        self.assertEqual(approved_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == participant.id for item in approved_response.data))

    def test_student_allowed_events_includes_approved_group_entries(self):
        submit_response = self._submit_group(group_id='GRP-ALLOWED')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-ALLOWED', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.group_leader_student)
        response = self.client.get(reverse('student-allowed-events'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.group_event.id, response.data.get('group_event_ids', []))
        self.assertTrue(any(item['group_id'] == 'GRP-ALLOWED' for item in response.data.get('group_entries', [])))
        allowed_entry = next((item for item in response.data.get('group_entries', []) if item['group_id'] == 'GRP-ALLOWED'), None)
        self.assertIsNotNone(allowed_entry)
        self.assertNotIn('members', allowed_entry)
        self.assertIn('group_entry_id', allowed_entry)

    def test_group_event_registration_requires_group_id_and_links_entry(self):
        submit_response = self._submit_group(group_id='GRP-REGISTER')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-REGISTER', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.group_leader_student)
        missing_group_response = self.client.post(
            reverse('event-registration'),
            {
                'event': self.group_event.id,
                'first_name': 'LEAD',
                'last_name': 'ONE',
            },
            format='json',
        )
        self.assertEqual(missing_group_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('group_id', str(missing_group_response.data).lower())

        success_response = self.client.post(
            reverse('event-registration'),
            {
                'event': self.group_event.id,
                'first_name': 'LEAD',
                'last_name': 'ONE',
                'group_id': 'GRP-REGISTER',
            },
            format='json',
        )
        self.assertEqual(success_response.status_code, status.HTTP_201_CREATED, success_response.data)

        registration = EventRegistration.objects.get(event=self.group_event, participant=self.group_leader_student)
        self.assertEqual(registration.school_group_entry_id, group_entry.id)
        self.assertEqual(registration.group_reference_id, 'GRP-REGISTER')
        self.assertEqual(registration.group_leader_name, 'LEAD ONE')

    def test_student_can_update_own_profile(self):
        self._auth(self.group_leader_student)
        response = self.client.patch(
            reverse('current-user-profile-update'),
            {
                'first_name': 'leader',
                'last_name': 'updated',
                'phone': '9876543210',
                'student_class': 10,
                'gender': 'boys',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data.get('first_name'), 'Leader')
        self.assertEqual(response.data.get('last_name'), 'Updated')
        self.assertEqual(response.data.get('phone'), '9876543210')
        self.assertEqual(response.data.get('student_class'), 10)
        self.assertEqual(response.data.get('gender'), 'BOYS')

        self.group_leader_student.refresh_from_db()
        self.assertEqual(self.group_leader_student.first_name, 'Leader')
        self.assertEqual(self.group_leader_student.last_name, 'Updated')
        self.assertEqual(self.group_leader_student.phone, '9876543210')
        self.assertEqual(self.group_leader_student.student_class, 10)
        self.assertEqual(self.group_leader_student.gender, 'BOYS')

    def test_non_student_cannot_update_student_profile_endpoint(self):
        self._auth(self.school_user)
        response = self.client.patch(
            reverse('current-user-profile-update'),
            {'first_name': 'School'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('only students', str(response.data).lower())

    def test_group_leader_can_get_and_update_group_profile(self):
        submit_response = self._submit_group(group_id='GRP-PROFILE-EDIT')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-PROFILE-EDIT', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.group_leader_student)
        get_response = self.client.get(reverse('student-group-profile', args=[group_entry.id]))
        self.assertEqual(get_response.status_code, status.HTTP_200_OK, get_response.data)
        members = get_response.data.get('members', [])
        self.assertEqual(len(members), 3)

        updated_members = []
        for member in members:
            first_name = member['first_name']
            last_name = member['last_name']
            if member.get('is_leader'):
                first_name = 'LEADERX'
                last_name = 'UPDATED'
            else:
                first_name = f"{first_name}X"

            updated_members.append({
                'id': member['id'],
                'first_name': first_name,
                'last_name': last_name,
                'gender': 'BOYS',
                'student_class': 9,
                'phone': '9876543210',
            })

        patch_response = self.client.patch(
            reverse('student-group-profile', args=[group_entry.id]),
            {
                'gender_category': 'BOYS',
                'participants': updated_members,
            },
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK, patch_response.data)
        self.assertEqual(patch_response.data.get('gender_category'), 'BOYS')
        self.assertEqual(patch_response.data.get('leader_full_name'), 'LEADERX UPDATED')
        updated_leader = next((member for member in patch_response.data.get('members', []) if member.get('is_leader')), None)
        self.assertIsNotNone(updated_leader)
        self.assertEqual(updated_leader.get('gender'), 'BOYS')
        self.assertEqual(updated_leader.get('student_class'), 9)
        self.assertEqual(updated_leader.get('phone'), '9876543210')

        group_entry.refresh_from_db()
        self.assertEqual(group_entry.gender_category, 'BOYS')
        self.assertEqual(group_entry.leader_full_name, 'LEADERX UPDATED')
        self.assertTrue(
            group_entry.members.filter(
                first_name='LEADERX',
                last_name='UPDATED',
                gender='BOYS',
                student_class=9,
                phone='9876543210',
                is_leader=True,
            ).exists()
        )

    def test_non_leader_student_cannot_access_or_update_group_profile(self):
        submit_response = self._submit_group(group_id='GRP-PROFILE-UNAUTH')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-PROFILE-UNAUTH', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.other_student)
        get_response = self.client.get(reverse('student-group-profile', args=[group_entry.id]))
        self.assertEqual(get_response.status_code, status.HTTP_404_NOT_FOUND)

        patch_response = self.client.patch(
            reverse('student-group-profile', args=[group_entry.id]),
            {'gender_category': 'GIRLS'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(patch_response.data.get('detail'), patch_response.data.get('error'))

    def test_group_profile_rejects_invalid_gender_category(self):
        submit_response = self._submit_group(group_id='GRP-PROFILE-GENDER')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-PROFILE-GENDER', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.group_leader_student)
        response = self.client.patch(
            reverse('student-group-profile', args=[group_entry.id]),
            {'gender_category': 'INVALID'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender_category', str(response.data).lower())

    def test_group_profile_participant_updates_require_all_group_members(self):
        submit_response = self._submit_group(group_id='GRP-PROFILE-PARTIAL')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-PROFILE-PARTIAL', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        member = group_entry.members.order_by('member_order').first()
        self._auth(self.group_leader_student)
        response = self.client.patch(
            reverse('student-group-profile', args=[group_entry.id]),
            {
                'participants': [
                    {
                        'id': member.id,
                        'first_name': 'ONLY',
                        'last_name': 'ONE',
                    }
                ]
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('all participants', str(response.data).lower())

    def test_student_group_profile_updates_extended_member_fields(self):
        submit_response = self._submit_group(group_id='GRP-PROFILE-MEMBER-FIELDS')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-PROFILE-MEMBER-FIELDS', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.group_leader_student)
        members_payload = []
        for member in group_entry.members.order_by('member_order'):
            members_payload.append({
                'id': member.id,
                'first_name': member.first_name,
                'last_name': member.last_name,
                'gender': 'BOYS' if member.member_order % 2 else 'GIRLS',
                'student_class': 9,
                'phone': f'98765432{member.member_order:02d}',
            })
        response = self.client.patch(
            reverse('student-group-profile', args=[group_entry.id]),
            {'participants': members_payload},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        refreshed_members = {m.id: m for m in group_entry.members.all()}
        for payload in members_payload:
            refreshed = refreshed_members[payload['id']]
            self.assertEqual(refreshed.gender, payload['gender'])
            self.assertEqual(refreshed.student_class, payload['student_class'])
            self.assertEqual(refreshed.phone, payload['phone'])

    def test_admin_can_update_all_group_member_fields(self):
        submit_response = self._submit_group(group_id='GRP-ADMIN-EDIT')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-ADMIN-EDIT', school=self.school_user)

        self._auth(self.admin)
        members_payload = []
        for member in group_entry.members.order_by('member_order'):
            members_payload.append({
                'id': member.id,
                'first_name': f"{member.first_name}A",
                'last_name': f"{member.last_name}B",
                'gender': 'GIRLS',
                'student_class': 8,
                'phone': f'98765433{member.member_order:02d}',
            })

        response = self.client.patch(
            reverse('admin-update-school-group-participant', args=[group_entry.id]),
            {
                'gender_category': 'GIRLS',
                'participants': members_payload,
                'notes': 'Updated all members from admin panel',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data.get('gender_category'), 'GIRLS')

        group_entry.refresh_from_db()
        self.assertEqual(group_entry.gender_category, 'GIRLS')
        self.assertIn('updated all members', group_entry.review_notes.lower())
        self.assertEqual(
            group_entry.members.filter(gender='GIRLS', student_class=8).count(),
            group_entry.participant_count
        )

    def test_admin_group_member_update_validates_phone_and_class(self):
        submit_response = self._submit_group(group_id='GRP-ADMIN-INVALID-FIELDS')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-ADMIN-INVALID-FIELDS', school=self.school_user)

        first_member = group_entry.members.order_by('member_order').first()
        self._auth(self.admin)
        invalid_class_response = self.client.patch(
            reverse('admin-update-school-group-participant', args=[group_entry.id]),
            {
                'participants': [
                    {
                        'id': first_member.id,
                        'first_name': first_member.first_name,
                        'last_name': first_member.last_name,
                        'gender': 'BOYS',
                        'student_class': 13,
                        'phone': '9876543210',
                    }
                ]
            },
            format='json',
        )
        self.assertEqual(invalid_class_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('student_class', str(invalid_class_response.data).lower())

        invalid_phone_response = self.client.patch(
            reverse('admin-update-school-group-participant', args=[group_entry.id]),
            {
                'participants': [
                    {
                        'id': first_member.id,
                        'first_name': first_member.first_name,
                        'last_name': first_member.last_name,
                        'gender': 'BOYS',
                        'student_class': 9,
                        'phone': '12345',
                    }
                ]
            },
            format='json',
        )
        self.assertEqual(invalid_phone_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone', str(invalid_phone_response.data).lower())

    def test_school_can_update_pending_group_member_fields(self):
        submit_response = self._submit_group(group_id='GRP-SCHOOL-EDIT')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-SCHOOL-EDIT', school=self.school_user)

        members_payload = []
        for member in group_entry.members.order_by('member_order'):
            members_payload.append({
                'id': member.id,
                'first_name': f"{member.first_name}S",
                'last_name': f"{member.last_name}T",
                'gender': 'BOYS' if member.member_order % 2 else 'GIRLS',
                'student_class': 8,
                'phone': f'98765012{member.member_order:02d}',
            })

        self._auth(self.school_user)
        response = self.client.patch(
            reverse('school-update-group-participant', args=[group_entry.id]),
            {
                'gender_category': 'MIXED',
                'participants': members_payload,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data.get('participant_count'), 3)
        self.assertEqual(len(response.data.get('members', [])), 3)

        group_entry.refresh_from_db()
        self.assertEqual(group_entry.gender_category, 'MIXED')
        refreshed_members = {member.id: member for member in group_entry.members.all()}
        for payload in members_payload:
            refreshed = refreshed_members[payload['id']]
            self.assertEqual(refreshed.first_name, payload['first_name'])
            self.assertEqual(refreshed.last_name, payload['last_name'])
            self.assertEqual(refreshed.gender, payload['gender'])
            self.assertEqual(refreshed.student_class, payload['student_class'])
            self.assertEqual(refreshed.phone, payload['phone'])

    def test_school_group_member_update_requires_all_members(self):
        submit_response = self._submit_group(group_id='GRP-SCHOOL-PARTIAL')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-SCHOOL-PARTIAL', school=self.school_user)

        first_member = group_entry.members.order_by('member_order').first()
        self._auth(self.school_user)
        response = self.client.patch(
            reverse('school-update-group-participant', args=[group_entry.id]),
            {
                'participants': [
                    {
                        'id': first_member.id,
                        'first_name': first_member.first_name,
                        'last_name': first_member.last_name,
                        'gender': 'BOYS',
                        'student_class': 8,
                        'phone': '9876543210',
                    }
                ]
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('all participants', str(response.data).lower())

    def test_school_cannot_edit_approved_group_entry(self):
        submit_response = self._submit_group(group_id='GRP-SCHOOL-APPROVED')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-SCHOOL-APPROVED', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.school_user)
        response = self.client.patch(
            reverse('school-update-group-participant', args=[group_entry.id]),
            {'gender_category': 'BOYS'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be edited', str(response.data).lower())
        self.assertEqual(response.data.get('detail'), response.data.get('error'))

    def test_other_school_cannot_edit_group_entry(self):
        submit_response = self._submit_group(group_id='GRP-SCHOOL-OWNERSHIP')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-SCHOOL-OWNERSHIP', school=self.school_user)

        other_school_profile = School.objects.create(
            name='Other Ownership School',
            category='HS',
            is_active=True,
        )
        other_school_user = User.objects.create_user(
            username='other_school_editor',
            email='other_school_editor@test.com',
            password='testpass123',
            role='school',
            school=other_school_profile,
        )

        self._auth(other_school_user)
        response = self.client.patch(
            reverse('school-update-group-participant', args=[group_entry.id]),
            {'gender_category': 'BOYS'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data.get('detail'), response.data.get('error'))

    def test_admin_group_update_accepts_notes_field_in_serializer(self):
        submit_response = self._submit_group(group_id='GRP-ADMIN-NOTES-SERIALIZER')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-ADMIN-NOTES-SERIALIZER', school=self.school_user)

        self._auth(self.admin)
        response = self.client.patch(
            reverse('admin-update-school-group-participant', args=[group_entry.id]),
            {
                'notes': 'Serializer should accept notes on update',
                'gender_category': 'MIXED',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        group_entry.refresh_from_db()
        self.assertIn('serializer should accept notes', (group_entry.review_notes or '').lower())

    def test_student_group_profile_rejects_invalid_member_phone(self):
        submit_response = self._submit_group(group_id='GRP-STUDENT-INVALID-PHONE')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-STUDENT-INVALID-PHONE', school=self.school_user)
        group_entry.status = 'approved'
        group_entry.reviewed_by = self.admin
        group_entry.reviewed_at = timezone.now()
        group_entry.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        self._auth(self.group_leader_student)
        members_payload = []
        for member in group_entry.members.order_by('member_order'):
            members_payload.append({
                'id': member.id,
                'first_name': member.first_name,
                'last_name': member.last_name,
                'gender': 'BOYS',
                'student_class': 9,
                'phone': '12345',
            })
        response = self.client.patch(
            reverse('student-group-profile', args=[group_entry.id]),
            {'participants': members_payload},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone', str(response.data).lower())

