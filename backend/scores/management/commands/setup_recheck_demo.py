"""
Management command to set up demo data for recheck requests workflow.

This command:
1. Ensures there are volunteers assigned to events
2. Creates sample recheck requests for testing
3. Provides debug information about the current state
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User
from events.models import Event
from scores.models import Result, RecheckRequest


class Command(BaseCommand):
    help = 'Set up demo data for recheck requests workflow'

    def add_arguments(self, parser):
        parser.add_argument(
            '--assign-volunteers',
            action='store_true',
            help='Assign existing volunteers to all events',
        )
        parser.add_argument(
            '--create-requests',
            action='store_true',
            help='Create sample recheck requests',
        )
        parser.add_argument(
            '--make-volunteer',
            type=str,
            help='Make user with given email a volunteer and assign to events',
        )
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Show debug information about current state',
        )

    def handle(self, *args, **options):
        if options['debug']:
            self.show_debug_info()
        
        if options['make_volunteer']:
            self.make_user_volunteer(options['make_volunteer'])
        
        if options['assign_volunteers']:
            self.assign_volunteers_to_events()
        
        if options['create_requests']:
            self.create_sample_requests()

    def show_debug_info(self):
        """Show current state of the system"""
        self.stdout.write(self.style.SUCCESS('=== RECHECK REQUESTS DEBUG INFO ==='))
        
        # Check volunteers
        volunteers = User.objects.filter(role='volunteer')
        self.stdout.write(f"Total volunteers: {volunteers.count()}")
        
        for volunteer in volunteers:
            events = volunteer.assigned_events.all()
            self.stdout.write(f"  {volunteer.first_name} {volunteer.last_name} ({volunteer.email}): {events.count()} events")
        
        # Check events
        events = Event.objects.all()
        self.stdout.write(f"\nTotal events: {events.count()}")
        
        for event in events:
            volunteer_count = event.volunteers.count()
            self.stdout.write(f"  {event.name}: {volunteer_count} volunteers")
        
        # Check recheck requests
        requests = RecheckRequest.objects.all()
        self.stdout.write(f"\nTotal recheck requests: {requests.count()}")
        
        for request in requests:
            self.stdout.write(f"  {request.event_name} - {request.full_name} - {request.status}")
        
        # Check results eligible for recheck
        eligible_results = []
        for result in Result.objects.select_related('participant', 'event'):
            if result.is_recheck_allowed:
                eligible_results.append(result)
        
        self.stdout.write(f"\nResults eligible for recheck: {len(eligible_results)}")

    def make_user_volunteer(self, email):
        """Make a user a volunteer and assign to all events"""
        try:
            user = User.objects.get(email=email)
            user.role = 'volunteer'
            user.save()
            
            # Assign to all events
            events = Event.objects.all()
            for event in events:
                event.volunteers.add(user)
            
            self.stdout.write(
                self.style.SUCCESS(f'Made {user.first_name} {user.last_name} a volunteer and assigned to {events.count()} events')
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email {email} not found')
            )

    def assign_volunteers_to_events(self):
        """Assign existing volunteers to all events"""
        volunteers = User.objects.filter(role='volunteer')
        events = Event.objects.all()
        
        if not volunteers.exists():
            self.stdout.write(
                self.style.WARNING('No volunteers found. Use --make-volunteer to create one.')
            )
            return
        
        assignments_made = 0
        for event in events:
            for volunteer in volunteers:
                if not event.volunteers.filter(id=volunteer.id).exists():
                    event.volunteers.add(volunteer)
                    assignments_made += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Made {assignments_made} volunteer-event assignments')
        )

    def create_sample_requests(self):
        """Create sample recheck requests for testing"""
        # Find results that can have recheck requests
        eligible_results = []
        
        for result in Result.objects.select_related('participant', 'event'):
            if result.is_recheck_allowed and result.event.volunteers.exists():
                eligible_results.append(result)
        
        if not eligible_results:
            self.stdout.write(
                self.style.WARNING('No eligible results found. Make sure volunteers are assigned to events.')
            )
            return
        
        created_count = 0
        
        # Create up to 3 sample requests
        for result in eligible_results[:3]:
            volunteer = result.event.volunteers.first()
            
            try:
                with transaction.atomic():
                    recheck_request = RecheckRequest.objects.create(
                        result=result,
                        participant=result.participant,
                        assigned_volunteer=volunteer,
                        status='Pending'
                    )
                    created_count += 1
                    self.stdout.write(f'Created recheck request: {recheck_request.recheck_request_id}')
            except Exception as e:
                self.stdout.write(f'Failed to create request for result {result.id}: {e}')
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {created_count} sample recheck requests')
        )