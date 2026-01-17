from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, School
from events.models import Event, Venue, EventRegistration
from scores.models import Result, RecheckRequest
from datetime import date, time


class StudentRecheckEndpointsTestCase(TestCase):
    """Test cases for student recheck workflow endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create a school
        self.school = School.objects.create(
            name="Test School",
            category="HS"
        )
        
        # Create a student user
        self.student = User.objects.create_user(
            username='teststudent',
            email='student@test.com',
            password='testpass123',
            role='student',
            first_name='Test',
            last_name='Student',
            school=self.school,
            student_class=10
        )
        
        # Create a volunteer user
        self.volunteer = User.objects.create_user(
            username='testvolunteer',
            email='volunteer@test.com',
            password='testpass123',
            role='volunteer'
        )
        
        # Create a venue
        self.venue = Venue.objects.create(
            name="Test Venue",
            location="Test Location",
            capacity=100,
            event_limit=10
        )
        
        # Create an admin user for event creation
        self.admin = User.objects.create_user(
            username='testadmin',
            email='admin@test.com',
            password='testpass123',
            role='admin'
        )
        
        # Create an event
        self.event = Event.objects.create(
            name="Test Event",
            description="Test Description",
            category="dance",
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(12, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin
        )
        
        # Assign volunteer to event
        self.event.volunteers.add(self.volunteer)
        
        # Create event registration with chest number
        self.registration = EventRegistration.objects.create(
            event=self.event,
            participant=self.student,
            chess_number="CH001",
            status="confirmed"
        )
        
        # Create a result for the student
        self.result = Result.objects.create(
            event=self.event,
            participant=self.student,
            total_score=85.50,
            rank=1,
            published=True
        )
        
        # Set up API client
        self.client = APIClient()
    
    def test_student_result_details_success(self):
        """Test successful retrieval of result details"""
        self.client.force_authenticate(user=self.student)
        
        url = reverse('student-result-details', args=[self.result.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.result.id)
        self.assertEqual(response.data['event_name'], self.event.name)
        self.assertEqual(response.data['category'], self.event.category)
        self.assertEqual(response.data['chest_number'], "CH001")
        self.assertEqual(float(response.data['total_score']), 85.50)
        self.assertTrue(response.data['is_recheck_allowed'])
    
    def test_student_result_details_not_own_result(self):
        """Test that student cannot access another student's result"""
        # Create another student
        other_student = User.objects.create_user(
            username='otherstudent',
            email='other@test.com',
            password='testpass123',
            role='student',
            school=self.school,
            student_class=10
        )
        
        self.client.force_authenticate(user=other_student)
        
        url = reverse('student-result-details', args=[self.result.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_student_result_details_non_student_forbidden(self):
        """Test that non-students cannot access student result details"""
        self.client.force_authenticate(user=self.volunteer)
        
        url = reverse('student-result-details', args=[self.result.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_submit_recheck_request_success(self):
        """Test successful submission of recheck request"""
        self.client.force_authenticate(user=self.student)
        
        url = reverse('submit-recheck-request')
        data = {'result': self.result.id}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('recheck_request', response.data)
        
        # Verify recheck request was created
        recheck_request = RecheckRequest.objects.get(result=self.result)
        self.assertEqual(recheck_request.participant, self.student)
        self.assertEqual(recheck_request.assigned_volunteer, self.volunteer)
        self.assertEqual(recheck_request.status, 'Pending')
        self.assertEqual(recheck_request.event_name, self.event.name)
        self.assertEqual(recheck_request.chest_number, "CH001")
    
    def test_submit_recheck_request_duplicate_prevention(self):
        """Test that duplicate recheck requests are prevented"""
        self.client.force_authenticate(user=self.student)
        
        # Create first recheck request
        RecheckRequest.objects.create(
            result=self.result,
            participant=self.student,
            assigned_volunteer=self.volunteer
        )
        
        # Try to create duplicate
        url = reverse('submit-recheck-request')
        data = {'result': self.result.id}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_submit_recheck_request_non_student_forbidden(self):
        """Test that non-students cannot submit recheck requests"""
        self.client.force_authenticate(user=self.volunteer)
        
        url = reverse('submit-recheck-request')
        data = {'result': self.result.id}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_is_recheck_allowed_flag(self):
        """Test that is_recheck_allowed flag updates correctly"""
        # Initially should be True
        self.assertTrue(self.result.is_recheck_allowed)
        
        # Create recheck request
        RecheckRequest.objects.create(
            result=self.result,
            participant=self.student,
            assigned_volunteer=self.volunteer
        )
        
        # Refresh result from database
        self.result.refresh_from_db()
        
        # Should now be False
        self.assertFalse(self.result.is_recheck_allowed)


class VolunteerRecheckEndpointsTestCase(TestCase):
    """Test cases for volunteer recheck workflow endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create a school
        self.school = School.objects.create(
            name="Test School",
            category="HS"
        )
        
        # Create a student user
        self.student = User.objects.create_user(
            username='teststudent',
            email='student@test.com',
            password='testpass123',
            role='student',
            first_name='Test',
            last_name='Student',
            school=self.school,
            student_class=10
        )
        
        # Create volunteer users
        self.volunteer1 = User.objects.create_user(
            username='testvolunteer1',
            email='volunteer1@test.com',
            password='testpass123',
            role='volunteer'
        )
        
        self.volunteer2 = User.objects.create_user(
            username='testvolunteer2',
            email='volunteer2@test.com',
            password='testpass123',
            role='volunteer'
        )
        
        # Create a venue
        self.venue = Venue.objects.create(
            name="Test Venue",
            location="Test Location",
            capacity=100,
            event_limit=10
        )
        
        # Create an admin user for event creation
        self.admin = User.objects.create_user(
            username='testadmin',
            email='admin@test.com',
            password='testpass123',
            role='admin'
        )
        
        # Create events
        self.event1 = Event.objects.create(
            name="Test Event 1",
            description="Test Description 1",
            category="dance",
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(12, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin
        )
        
        self.event2 = Event.objects.create(
            name="Test Event 2",
            description="Test Description 2",
            category="music",
            date=date.today(),
            start_time=time(14, 0),
            end_time=time(16, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin
        )
        
        # Assign volunteers to events
        self.event1.volunteers.add(self.volunteer1)
        self.event2.volunteers.add(self.volunteer2)
        
        # Create event registrations
        self.registration1 = EventRegistration.objects.create(
            event=self.event1,
            participant=self.student,
            chess_number="CH001",
            status="confirmed"
        )
        
        self.registration2 = EventRegistration.objects.create(
            event=self.event2,
            participant=self.student,
            chess_number="CH002",
            status="confirmed"
        )
        
        # Create results
        self.result1 = Result.objects.create(
            event=self.event1,
            participant=self.student,
            total_score=85.50,
            rank=1,
            published=True
        )
        
        self.result2 = Result.objects.create(
            event=self.event2,
            participant=self.student,
            total_score=78.25,
            rank=2,
            published=True
        )
        
        # Create recheck requests
        self.recheck_request1 = RecheckRequest.objects.create(
            result=self.result1,
            participant=self.student,
            assigned_volunteer=self.volunteer1
        )
        
        self.recheck_request2 = RecheckRequest.objects.create(
            result=self.result2,
            participant=self.student,
            assigned_volunteer=self.volunteer2
        )
        
        # Set up API client
        self.client = APIClient()
    
    def test_volunteer_recheck_requests_success(self):
        """Test successful retrieval of assigned recheck requests"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-recheck-requests')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        request_data = response.data[0]
        self.assertEqual(request_data['recheck_request_id'], str(self.recheck_request1.recheck_request_id))
        self.assertEqual(request_data['event_name'], self.event1.name)
        self.assertEqual(request_data['category'], self.event1.category)
        self.assertEqual(request_data['status'], 'Pending')
    
    def test_volunteer_recheck_requests_only_assigned(self):
        """Test that volunteers only see requests assigned to them"""
        self.client.force_authenticate(user=self.volunteer2)
        
        url = reverse('volunteer-recheck-requests')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        request_data = response.data[0]
        self.assertEqual(request_data['recheck_request_id'], str(self.recheck_request2.recheck_request_id))
        self.assertEqual(request_data['event_name'], self.event2.name)
    
    def test_volunteer_recheck_requests_non_volunteer_forbidden(self):
        """Test that non-volunteers cannot access recheck requests"""
        self.client.force_authenticate(user=self.student)
        
        url = reverse('volunteer-recheck-requests')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_volunteer_recheck_request_details_success(self):
        """Test successful retrieval of specific recheck request details"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-recheck-request-details', args=[self.recheck_request1.recheck_request_id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['recheck_request_id'], str(self.recheck_request1.recheck_request_id))
        self.assertEqual(response.data['event_name'], self.event1.name)
        self.assertEqual(response.data['full_name'], f"{self.student.first_name} {self.student.last_name}")
        self.assertEqual(response.data['chest_number'], "CH001")
        self.assertEqual(response.data['status'], 'Pending')
    
    def test_volunteer_recheck_request_details_not_assigned(self):
        """Test that volunteers cannot access requests not assigned to them"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-recheck-request-details', args=[self.recheck_request2.recheck_request_id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_volunteer_accept_recheck_request_success(self):
        """Test successful acceptance of recheck request"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-recheck-request', args=[self.recheck_request1.recheck_request_id])
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['recheck_request']['status'], 'Accepted')
        self.assertIsNotNone(response.data['recheck_request']['accepted_at'])
        
        # Verify database was updated
        self.recheck_request1.refresh_from_db()
        self.assertEqual(self.recheck_request1.status, 'Accepted')
        self.assertIsNotNone(self.recheck_request1.accepted_at)
    
    def test_volunteer_accept_recheck_request_already_accepted(self):
        """Test that already accepted requests cannot be accepted again"""
        # First acceptance
        self.client.force_authenticate(user=self.volunteer1)
        url = reverse('volunteer-accept-recheck-request', args=[self.recheck_request1.recheck_request_id])
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to accept again
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_volunteer_accept_recheck_request_not_assigned(self):
        """Test that volunteers cannot accept requests not assigned to them"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-recheck-request', args=[self.recheck_request2.recheck_request_id])
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_volunteer_accept_recheck_request_non_volunteer_forbidden(self):
        """Test that non-volunteers cannot accept recheck requests"""
        self.client.force_authenticate(user=self.student)
        
        url = reverse('volunteer-accept-recheck-request', args=[self.recheck_request1.recheck_request_id])
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RecheckWorkflowIntegrationTestCase(TestCase):
    """Integration test for the complete recheck workflow"""
    
    def setUp(self):
        """Set up test data for integration test"""
        # Create a school
        self.school = School.objects.create(
            name="Integration Test School",
            category="HS"
        )
        
        # Create users
        self.student = User.objects.create_user(
            username='integrationstudent',
            email='integration@test.com',
            password='testpass123',
            role='student',
            first_name='Integration',
            last_name='Student',
            school=self.school,
            student_class=10
        )
        
        self.volunteer = User.objects.create_user(
            username='integrationvolunteer',
            email='integrationvolunteer@test.com',
            password='testpass123',
            role='volunteer'
        )
        
        # Create venue and admin
        self.venue = Venue.objects.create(
            name="Integration Venue",
            location="Integration Location",
            capacity=100,
            event_limit=10
        )
        
        self.admin = User.objects.create_user(
            username='integrationadmin',
            email='integrationadmin@test.com',
            password='testpass123',
            role='admin'
        )
        
        # Create event
        self.event = Event.objects.create(
            name="Integration Event",
            description="Integration Test Event",
            category="dance",
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(12, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin
        )
        
        # Assign volunteer to event
        self.event.volunteers.add(self.volunteer)
        
        # Create event registration
        self.registration = EventRegistration.objects.create(
            event=self.event,
            participant=self.student,
            chess_number="INT001",
            status="confirmed"
        )
        
        # Create result
        self.result = Result.objects.create(
            event=self.event,
            participant=self.student,
            total_score=82.75,
            rank=3,
            published=True
        )
        
        # Set up API client
        self.client = APIClient()
    
    def test_complete_recheck_workflow(self):
        """Test the complete workflow from student submission to volunteer acceptance"""
        
        # Step 1: Student checks result details and sees recheck is allowed
        self.client.force_authenticate(user=self.student)
        
        result_url = reverse('student-result-details', args=[self.result.id])
        response = self.client.get(result_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_recheck_allowed'])
        self.assertEqual(response.data['event_name'], self.event.name)
        self.assertEqual(response.data['chest_number'], "INT001")
        
        # Step 2: Student submits recheck request
        recheck_url = reverse('submit-recheck-request')
        recheck_data = {'result': self.result.id}
        response = self.client.post(recheck_url, recheck_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('recheck_request', response.data)
        
        recheck_request_id = response.data['recheck_request']['recheck_request_id']
        
        # Step 3: Verify recheck is no longer allowed
        response = self.client.get(result_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_recheck_allowed'])
        
        # Step 4: Volunteer sees the recheck request in their list
        self.client.force_authenticate(user=self.volunteer)
        
        volunteer_requests_url = reverse('volunteer-recheck-requests')
        response = self.client.get(volunteer_requests_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['recheck_request_id'], recheck_request_id)
        self.assertEqual(response.data[0]['status'], 'Pending')
        
        # Step 5: Volunteer views detailed request information
        volunteer_details_url = reverse('volunteer-recheck-request-details', args=[recheck_request_id])
        response = self.client.get(volunteer_details_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['recheck_request_id'], recheck_request_id)
        self.assertEqual(response.data['full_name'], "Integration Student")
        self.assertEqual(response.data['event_name'], self.event.name)
        self.assertEqual(response.data['chest_number'], "INT001")
        self.assertEqual(float(response.data['final_score']), 82.75)
        self.assertEqual(response.data['status'], 'Pending')
        
        # Step 6: Volunteer accepts the recheck request
        volunteer_accept_url = reverse('volunteer-accept-recheck-request', args=[recheck_request_id])
        response = self.client.put(volunteer_accept_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['recheck_request']['status'], 'Accepted')
        self.assertIsNotNone(response.data['recheck_request']['accepted_at'])
        
        # Step 7: Verify the request is now accepted in the database
        recheck_request = RecheckRequest.objects.get(recheck_request_id=recheck_request_id)
        self.assertEqual(recheck_request.status, 'Accepted')
        self.assertIsNotNone(recheck_request.accepted_at)
        self.assertEqual(recheck_request.assigned_volunteer, self.volunteer)
        self.assertEqual(recheck_request.participant, self.student)
        
        # Step 8: Verify volunteer cannot accept the same request again
        response = self.client.put(volunteer_accept_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class RecheckRequestServiceTestCase(TestCase):
    """Test cases for RecheckRequestService business logic"""
    
    def setUp(self):
        """Set up test data for service tests"""
        # Create a school
        self.school = School.objects.create(
            name="Service Test School",
            category="HS"
        )
        
        # Create users
        self.student = User.objects.create_user(
            username='servicestudent',
            email='service@test.com',
            password='testpass123',
            role='student',
            first_name='Service',
            last_name='Student',
            school=self.school,
            student_class=10
        )
        
        self.volunteer = User.objects.create_user(
            username='servicevolunteer',
            email='servicevolunteer@test.com',
            password='testpass123',
            role='volunteer'
        )
        
        # Create venue and admin
        self.venue = Venue.objects.create(
            name="Service Venue",
            location="Service Location",
            capacity=100,
            event_limit=10
        )
        
        self.admin = User.objects.create_user(
            username='serviceadmin',
            email='serviceadmin@test.com',
            password='testpass123',
            role='admin'
        )
        
        # Create event
        self.event = Event.objects.create(
            name="Service Event",
            description="Service Test Event",
            category="dance",
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(12, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin
        )
        
        # Assign volunteer to event
        self.event.volunteers.add(self.volunteer)
        
        # Create event registration
        self.registration = EventRegistration.objects.create(
            event=self.event,
            participant=self.student,
            chess_number="SRV001",
            status="confirmed"
        )
        
        # Create result
        self.result = Result.objects.create(
            event=self.event,
            participant=self.student,
            total_score=88.50,
            rank=2,
            published=True
        )
    
    def test_create_recheck_request_success(self):
        """Test successful creation of recheck request using service"""
        from scores.services import RecheckRequestService
        
        recheck_request = RecheckRequestService.create_recheck_request(self.result, self.student)
        
        self.assertIsNotNone(recheck_request)
        self.assertEqual(recheck_request.result, self.result)
        self.assertEqual(recheck_request.participant, self.student)
        self.assertEqual(recheck_request.assigned_volunteer, self.volunteer)
        self.assertEqual(recheck_request.status, 'Pending')
        self.assertEqual(recheck_request.event_name, self.event.name)
        self.assertEqual(recheck_request.chest_number, "SRV001")
    
    def test_create_recheck_request_wrong_participant(self):
        """Test that service prevents creating recheck request for wrong participant"""
        from scores.services import RecheckRequestService
        from django.core.exceptions import ValidationError
        
        other_student = User.objects.create_user(
            username='otherstudent',
            email='other@test.com',
            password='testpass123',
            role='student',
            school=self.school,
            student_class=10
        )
        
        with self.assertRaises(ValidationError):
            RecheckRequestService.create_recheck_request(self.result, other_student)
    
    def test_create_recheck_request_duplicate_prevention(self):
        """Test that service prevents duplicate recheck requests"""
        from scores.services import RecheckRequestService
        from django.core.exceptions import ValidationError
        
        # Create first request
        RecheckRequestService.create_recheck_request(self.result, self.student)
        
        # Try to create duplicate
        with self.assertRaises(ValidationError):
            RecheckRequestService.create_recheck_request(self.result, self.student)
    
    def test_get_assigned_volunteer(self):
        """Test volunteer assignment lookup"""
        from scores.services import RecheckRequestService
        
        volunteer = RecheckRequestService.get_assigned_volunteer(self.event)
        self.assertEqual(volunteer, self.volunteer)
    
    def test_get_volunteer_recheck_requests(self):
        """Test getting recheck requests for volunteer"""
        from scores.services import RecheckRequestService
        
        # Create recheck request
        recheck_request = RecheckRequestService.create_recheck_request(self.result, self.student)
        
        # Get requests for volunteer
        requests = RecheckRequestService.get_volunteer_recheck_requests(self.volunteer)
        
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0], recheck_request)
    
    def test_accept_recheck_request_success(self):
        """Test successful acceptance of recheck request"""
        from scores.services import RecheckRequestService
        
        # Create recheck request
        recheck_request = RecheckRequestService.create_recheck_request(self.result, self.student)
        
        # Accept the request
        success, message, updated_request = RecheckRequestService.accept_recheck_request(
            str(recheck_request.recheck_request_id), self.volunteer
        )
        
        self.assertTrue(success)
        self.assertIn("accepted successfully", message)
        self.assertEqual(updated_request.status, 'Accepted')
        self.assertIsNotNone(updated_request.accepted_at)
    
    def test_accept_recheck_request_already_accepted(self):
        """Test that already accepted requests cannot be accepted again"""
        from scores.services import RecheckRequestService
        
        # Create and accept recheck request
        recheck_request = RecheckRequestService.create_recheck_request(self.result, self.student)
        RecheckRequestService.accept_recheck_request(
            str(recheck_request.recheck_request_id), self.volunteer
        )
        
        # Try to accept again
        success, message, updated_request = RecheckRequestService.accept_recheck_request(
            str(recheck_request.recheck_request_id), self.volunteer
        )
        
        self.assertFalse(success)
        self.assertIn("Cannot accept", message)
    
    def test_status_transition_validation(self):
        """Test status transition validation"""
        from scores.services import RecheckRequestService
        
        # Valid transitions
        self.assertTrue(RecheckRequestService.is_valid_status_transition('Pending', 'Accepted'))
        
        # Invalid transitions
        self.assertFalse(RecheckRequestService.is_valid_status_transition('Accepted', 'Pending'))
        self.assertFalse(RecheckRequestService.is_valid_status_transition('Accepted', 'Accepted'))
    
    def test_validate_recheck_request_data(self):
        """Test recheck request data validation"""
        from scores.services import RecheckRequestService
        
        # Create valid recheck request
        recheck_request = RecheckRequestService.create_recheck_request(self.result, self.student)
        
        # Validate data
        is_valid, errors = RecheckRequestService.validate_recheck_request_data(recheck_request)
        
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)
    
    def test_get_completion_confirmation(self):
        """Test completion confirmation generation"""
        from scores.services import RecheckRequestService
        
        # Create and accept recheck request
        recheck_request = RecheckRequestService.create_recheck_request(self.result, self.student)
        success, message, updated_request = RecheckRequestService.accept_recheck_request(
            str(recheck_request.recheck_request_id), self.volunteer
        )
        
        # Use the updated request returned by the service
        self.assertTrue(success)
        
        # Get completion confirmation
        confirmation = RecheckRequestService.get_completion_confirmation(updated_request)
        
        self.assertTrue(confirmation['is_completed'])
        self.assertIn('completed successfully', confirmation['message'])
        self.assertEqual(confirmation['status'], 'Accepted')
        self.assertIsNotNone(confirmation['accepted_at'])


class VolunteerAssignmentServiceTestCase(TestCase):
    """Test cases for VolunteerAssignmentService"""
    
    def setUp(self):
        """Set up test data for volunteer assignment service tests"""
        # Create users
        self.volunteer = User.objects.create_user(
            username='assignmentvolunteer',
            email='assignment@test.com',
            password='testpass123',
            role='volunteer'
        )
        
        self.admin = User.objects.create_user(
            username='assignmentadmin',
            email='assignmentadmin@test.com',
            password='testpass123',
            role='admin'
        )
        
        # Create venue
        self.venue = Venue.objects.create(
            name="Assignment Venue",
            location="Assignment Location",
            capacity=100,
            event_limit=10
        )
        
        # Create event
        self.event = Event.objects.create(
            name="Assignment Event",
            description="Assignment Test Event",
            category="music",
            date=date.today(),
            start_time=time(14, 0),
            end_time=time(16, 0),
            venue=self.venue,
            max_participants=50,
            created_by=self.admin
        )
        
        # Assign volunteer to event
        self.event.volunteers.add(self.volunteer)
    
    def test_get_events_for_volunteer(self):
        """Test getting events assigned to volunteer"""
        from scores.services import VolunteerAssignmentService
        
        events = VolunteerAssignmentService.get_events_for_volunteer(self.volunteer)
        
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0], self.event)
    
    def test_is_volunteer_assigned_to_event(self):
        """Test checking if volunteer is assigned to event"""
        from scores.services import VolunteerAssignmentService
        
        # Should be assigned
        self.assertTrue(
            VolunteerAssignmentService.is_volunteer_assigned_to_event(self.volunteer, self.event)
        )
        
        # Create another volunteer not assigned
        other_volunteer = User.objects.create_user(
            username='othervolunteer',
            email='other@test.com',
            password='testpass123',
            role='volunteer'
        )
        
        # Should not be assigned
        self.assertFalse(
            VolunteerAssignmentService.is_volunteer_assigned_to_event(other_volunteer, self.event)
        )
    
    def test_get_volunteers_for_event(self):
        """Test getting volunteers assigned to event"""
        from scores.services import VolunteerAssignmentService
        
        volunteers = VolunteerAssignmentService.get_volunteers_for_event(self.event)
        
        self.assertEqual(len(volunteers), 1)
        self.assertEqual(volunteers[0], self.volunteer)
