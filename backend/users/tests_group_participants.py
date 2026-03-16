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
from users.workflow_models import SchoolGroupEntry


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

    def test_school_group_events_filters_by_class_and_gender(self):
        self._auth(self.school_user)
        unfiltered_response = self.client.get(reverse('school-group-events'))
        self.assertEqual(unfiltered_response.status_code, status.HTTP_200_OK)
        unfiltered_ids = {item['id'] for item in unfiltered_response.data}
        self.assertIn(self.draft_boys_group_event.id, unfiltered_ids)

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

    def test_school_group_events_requires_both_group_class_and_gender_query_params(self):
        self._auth(self.school_user)

        missing_gender_response = self.client.get(
            reverse('school-group-events'),
            {'group_class': 'HS'},
        )
        self.assertEqual(missing_gender_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender_category', str(missing_gender_response.data).lower())

        missing_class_response = self.client.get(
            reverse('school-group-events'),
            {'gender_category': 'MIXED'},
        )
        self.assertEqual(missing_class_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('group_class', str(missing_class_response.data).lower())

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

    def test_admin_can_approve_and_reject_group_entries(self):
        submit_response = self._submit_group(group_id='GRP-APPROVE')
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        group_entry = SchoolGroupEntry.objects.get(group_id='GRP-APPROVE', school=self.school_user)

        self._auth(self.admin)
        list_response = self.client.get(reverse('admin-school-group-participants-list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == group_entry.id for item in list_response.data))

        approve_response = self.client.post(
            reverse('admin-approve-school-group-participant', args=[group_entry.id]),
            {'notes': 'Looks good'},
            format='json',
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        group_entry.refresh_from_db()
        self.assertEqual(group_entry.status, 'approved')

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

