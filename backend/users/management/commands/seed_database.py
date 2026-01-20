from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import datetime, timedelta, date
from decimal import Decimal
import random

from users.models import User, School, AllowedEmail
from events.models import Event, Venue, EventRegistration, Judge, ParticipantVerification
from scores.models import Score, Result
from volunteers.models import VolunteerShift, VolunteerAssignment


class Command(BaseCommand):
    help = 'Seed database with realistic data - users, events, scores, etc.'

    def __init__(self):
        super().__init__()
        self.users_created = {
            'admin': [],
            'student': [],
            'judge': [],
            'volunteer': [],
            'school': []
        }
        self.schools = []
        self.venues = []
        self.events = []
        self.credentials = []

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            self.clear_data()

        self.stdout.write(self.style.SUCCESS('Starting database seeding...'))

        # Seed in order
        self.seed_schools()
        self.seed_venues()
        self.seed_users()
        self.seed_events()
        self.seed_registrations()
        self.seed_scores()
        self.seed_results()
        self.seed_volunteer_shifts()

        # Print credentials
        self.print_credentials()

        self.stdout.write(self.style.SUCCESS(
            'Database seeding completed successfully!'))

    def clear_data(self):
        """Clear all data except superuser"""
        VolunteerAssignment.objects.all().delete()
        VolunteerShift.objects.all().delete()
        Result.objects.all().delete()
        Score.objects.all().delete()
        ParticipantVerification.objects.all().delete()
        EventRegistration.objects.all().delete()
        Judge.objects.all().delete()
        Event.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        AllowedEmail.objects.all().delete()
        School.objects.all().delete()
        # Keep venues as they're already seeded
        self.stdout.write(self.style.SUCCESS('Data cleared successfully'))

    def seed_schools(self):
        """Create schools"""
        self.stdout.write('Creating schools...')

        school_data = [
            ('Government HSS Manacaud', 'HSS'),
            ('St. Joseph\'s HSS Palayam', 'HSS'),
            ('Government Model Girls HSS Pattom', 'HSS'),
            ('Nirmala Bhavan HSS Kowdiar', 'HSS'),
            ('Government HSS Cotton Hill', 'HS'),
            ('Carmel HSS Vazhuthacaud', 'HSS'),
            ('Government Model Boys HSS Thycaud', 'HSS'),
            ('St. Mary\'s HSS Pattom', 'HSS'),
            ('Government HS Chala', 'HS'),
            ('Loyola School Trivandrum', 'HSS'),
            ('Government UPS Palayam', 'UP'),
            ('Christ Nagar School', 'HSS'),
            ('Kendriya Vidyalaya Pattom', 'HSS'),
            ('Sainik School Kazhakootam', 'HSS'),
            ('SNDP HSS Vazhuthacaud', 'HSS'),
        ]

        for name, category in school_data:
            school, created = School.objects.get_or_create(
                name=name,
                defaults={'category': category, 'is_active': True}
            )
            self.schools.append(school)
            if created:
                self.stdout.write(f'  Created school: {name}')

    def seed_venues(self):
        """Get existing venues"""
        self.stdout.write('Loading venues...')
        self.venues = list(Venue.objects.all())
        if not self.venues:
            self.stdout.write(self.style.WARNING(
                'No venues found. Run: python manage.py seed_venues'))
        else:
            self.stdout.write(f'  Loaded {len(self.venues)} venues')

    def seed_users(self):
        """Create users across all roles"""
        self.stdout.write('Creating users...')

        # Admin users
        admin_users = [
            {'username': 'admin', 'email': 'admin@kalolsavam.edu',
                'first_name': 'System', 'last_name': 'Admin'},
            {'username': 'coordinator', 'email': 'coordinator@kalolsavam.edu',
                'first_name': 'Event', 'last_name': 'Coordinator'},
        ]

        for user_data in admin_users:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    **user_data,
                    'role': 'admin',
                    'approval_status': 'approved',
                    'password': make_password('admin123'),
                    'is_staff': True,
                }
            )
            if created:
                self.users_created['admin'].append(user)
                self.credentials.append({
                    'role': 'Admin',
                    'username': user_data['username'],
                    'password': 'admin123',
                    'email': user_data['email']
                })

        # Judge users
        judge_data = [
            {'username': 'judge_music', 'email': 'judge.music@kalolsavam.edu',
                'first_name': 'Ramesh', 'last_name': 'Kumar', 'spec': 'Music'},
            {'username': 'judge_dance', 'email': 'judge.dance@kalolsavam.edu',
                'first_name': 'Priya', 'last_name': 'Nair', 'spec': 'Dance'},
            {'username': 'judge_theatre', 'email': 'judge.theatre@kalolsavam.edu',
                'first_name': 'Suresh', 'last_name': 'Menon', 'spec': 'Theatre'},
            {'username': 'judge_literary', 'email': 'judge.literary@kalolsavam.edu',
                'first_name': 'Lakshmi', 'last_name': 'Pillai', 'spec': 'Literary'},
            {'username': 'judge_arts', 'email': 'judge.arts@kalolsavam.edu',
                'first_name': 'Vinod', 'last_name': 'Krishnan', 'spec': 'Visual Arts'},
            {'username': 'judge_music2', 'email': 'judge.music2@kalolsavam.edu',
                'first_name': 'Maya', 'last_name': 'Sharma', 'spec': 'Music'},
        ]

        for jdata in judge_data:
            spec = jdata.pop('spec')
            user, created = User.objects.get_or_create(
                username=jdata['username'],
                defaults={
                    **jdata,
                    'role': 'judge',
                    'approval_status': 'approved',
                    'password': make_password('judge123'),
                    'phone': f'+91{random.randint(7000000000, 9999999999)}',
                }
            )
            if created:
                self.users_created['judge'].append(user)
                Judge.objects.get_or_create(
                    user=user, defaults={'specialization': spec})
                self.credentials.append({
                    'role': 'Judge',
                    'username': jdata['username'],
                    'password': 'judge123',
                    'email': jdata['email'],
                    'specialization': spec
                })

        # Volunteer users
        volunteer_data = [
            {'username': 'volunteer1', 'email': 'volunteer1@kalolsavam.edu',
                'first_name': 'Arun', 'last_name': 'Das'},
            {'username': 'volunteer2', 'email': 'volunteer2@kalolsavam.edu',
                'first_name': 'Sneha', 'last_name': 'Raj'},
            {'username': 'volunteer3', 'email': 'volunteer3@kalolsavam.edu',
                'first_name': 'Kiran', 'last_name': 'Thomas'},
            {'username': 'volunteer4', 'email': 'volunteer4@kalolsavam.edu',
                'first_name': 'Anjali', 'last_name': 'Varma'},
        ]

        for vdata in volunteer_data:
            user, created = User.objects.get_or_create(
                username=vdata['username'],
                defaults={
                    **vdata,
                    'role': 'volunteer',
                    'approval_status': 'approved',
                    'password': make_password('volunteer123'),
                    'phone': f'+91{random.randint(7000000000, 9999999999)}',
                }
            )
            if created:
                self.users_created['volunteer'].append(user)
                self.credentials.append({
                    'role': 'Volunteer',
                    'username': vdata['username'],
                    'password': 'volunteer123',
                    'email': vdata['email']
                })

        # School users
        for i, school in enumerate(self.schools[:5], 1):
            username = f'school{i}'
            email = f'{username}@kalolsavam.edu'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': school.name.split()[0],
                    'last_name': 'Admin',
                    'role': 'school',
                    'school': school,
                    'approval_status': 'approved',
                    'password': make_password('school123'),
                    'contact_email': email,
                    'phone': f'+91{random.randint(7000000000, 9999999999)}',
                }
            )
            if created:
                self.users_created['school'].append(user)
                self.credentials.append({
                    'role': 'School',
                    'username': username,
                    'password': 'school123',
                    'email': email,
                    'school': school.name
                })

        # Student users
        first_names = ['Rahul', 'Priya', 'Aditya', 'Sneha', 'Arjun', 'Divya', 'Karthik', 'Meera', 'Rohan', 'Anjali',
                       'Vikram', 'Kavya', 'Nikhil', 'Riya', 'Suraj', 'Nandini', 'Akash', 'Pooja', 'Amit', 'Shruti']
        last_names = ['Kumar', 'Nair', 'Menon', 'Pillai',
                      'Sharma', 'Varma', 'Das', 'Krishnan', 'Raj', 'Thomas']

        for i in range(1, 51):  # 50 students
            school = random.choice(self.schools)
            student_class = random.randint(8, 12)  # HS and HSS students
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            username = f'student{i}'
            email = f'{username}@student.kalolsavam.edu'

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'student',
                    'school': school,
                    'student_class': student_class,
                    'approval_status': 'approved',
                    'password': make_password('student123'),
                    'phone': f'+91{random.randint(7000000000, 9999999999)}',
                }
            )
            if created:
                self.users_created['student'].append(user)
                if i <= 5:  # Only show first 5 student credentials
                    self.credentials.append({
                        'role': 'Student',
                        'username': username,
                        'password': 'student123',
                        'email': email,
                        'school': school.name,
                        'class': student_class
                    })

        self.stdout.write(
            f'  Created {sum(len(v) for v in self.users_created.values())} users')

    def seed_events(self):
        """Create events at different stages"""
        self.stdout.write('Creating events...')

        if not self.venues:
            self.stdout.write(self.style.WARNING(
                'No venues available, skipping events'))
            return

        admin = self.users_created['admin'][0] if self.users_created['admin'] else User.objects.filter(
            role='admin').first()

        # Event templates
        event_templates = [
            # Completed events (with results)
            {'name': 'Classical Dance Competition', 'category': 'dance',
                'days_ago': 15, 'status': 'completed'},
            {'name': 'Group Song', 'category': 'music',
                'days_ago': 14, 'status': 'completed'},
            {'name': 'Mono Act', 'category': 'theatre',
                'days_ago': 13, 'status': 'completed'},
            {'name': 'Painting Competition', 'category': 'visual_arts',
                'days_ago': 12, 'status': 'completed'},
            {'name': 'Essay Writing', 'category': 'literary',
                'days_ago': 11, 'status': 'completed'},

            # Ongoing events (scores being entered)
            {'name': 'Folk Dance', 'category': 'dance',
                'days_ago': 1, 'status': 'ongoing'},
            {'name': 'Solo Singing', 'category': 'music',
                'days_ago': 0, 'status': 'ongoing'},
            {'name': 'Mime', 'category': 'theatre',
                'days_ago': 0, 'status': 'ongoing'},

            # Upcoming events
            {'name': 'Western Dance', 'category': 'dance',
                'days_ago': -2, 'status': 'upcoming'},
            {'name': 'Instrumental Music', 'category': 'music',
                'days_ago': -3, 'status': 'upcoming'},
            {'name': 'Skit', 'category': 'theatre',
                'days_ago': -4, 'status': 'upcoming'},
            {'name': 'Pencil Drawing', 'category': 'visual_arts',
                'days_ago': -5, 'status': 'upcoming'},
            {'name': 'Poetry Recitation', 'category': 'literary',
                'days_ago': -6, 'status': 'upcoming'},
        ]

        for template in event_templates:
            event_date = date.today() + timedelta(days=template['days_ago'])
            venue = random.choice(self.venues)

            # Get judges for this category
            available_judges = [u for u in self.users_created['judge']]
            selected_judges = random.sample(
                available_judges, min(2, len(available_judges)))

            event, created = Event.objects.get_or_create(
                name=template['name'],
                defaults={
                    'description': f'{template["name"]} - Annual Kalolsavam Event',
                    'category': template['category'],
                    'date': event_date,
                    'start_time': '10:00:00',
                    'end_time': '14:00:00',
                    'venue': venue,
                    'max_participants': 30,
                    'created_by': admin,
                    'status': 'draft' if template['status'] == 'upcoming' else 'published',
                }
            )

            if created:
                event.judges.set(selected_judges)
                event.volunteers.set(random.sample(self.users_created['volunteer'],
                                                   min(2, len(self.users_created['volunteer']))))
                self.events.append(
                    {'event': event, 'status': template['status']})
                self.stdout.write(
                    f'  Created event: {template["name"]} ({template["status"]})')

    def seed_registrations(self):
        """Create event registrations"""
        self.stdout.write('Creating event registrations...')

        chess_counter = 1000

        for event_data in self.events:
            event = event_data['event']
            status = event_data['status']

            # Determine number of participants based on status
            if status == 'completed':
                num_participants = random.randint(15, 25)
            elif status == 'ongoing':
                num_participants = random.randint(10, 20)
            else:  # upcoming
                num_participants = random.randint(5, 15)

            # Select random students
            participants = random.sample(self.users_created['student'],
                                         min(num_participants, len(self.users_created['student'])))

            for participant in participants:
                chess_number = f'KAL{chess_counter}'
                chess_counter += 1

                reg, created = EventRegistration.objects.get_or_create(
                    event=event,
                    participant=participant,
                    defaults={
                        'status': 'confirmed',
                        'chess_number': chess_number,
                    }
                )

                # Add participant verification for completed/ongoing events
                if status in ['completed', 'ongoing'] and self.users_created['volunteer']:
                    volunteer = random.choice(self.users_created['volunteer'])
                    ParticipantVerification.objects.get_or_create(
                        event=event,
                        participant=participant,
                        volunteer=volunteer,
                        defaults={
                            'chess_number': chess_number,
                            'status': 'verified',
                            'notes': 'Verified and ready to perform'
                        }
                    )

        self.stdout.write(
            f'  Created registrations for {len(self.events)} events')

    def seed_scores(self):
        """Create scores for completed and ongoing events"""
        self.stdout.write('Creating scores...')

        for event_data in self.events:
            event = event_data['event']
            status = event_data['status']

            if status not in ['completed', 'ongoing']:
                continue

            # Get all registrations for this event
            registrations = EventRegistration.objects.filter(event=event)
            judges = list(event.judges.all())

            if not judges:
                continue

            for reg in registrations:
                # For completed events, all judges have scored
                # For ongoing events, some judges have scored
                judges_to_score = judges if status == 'completed' else random.sample(
                    judges, random.randint(1, len(judges)))

                for judge in judges_to_score:
                    # Create dynamic scores
                    criteria_scores = {
                        'technical_skill': round(random.uniform(15, 25), 1),
                        'creativity': round(random.uniform(15, 25), 1),
                        'presentation': round(random.uniform(15, 25), 1),
                        'overall_impact': round(random.uniform(15, 25), 1),
                    }

                    Score.objects.get_or_create(
                        event=event,
                        participant=reg.participant,
                        judge=judge,
                        defaults={
                            'criteria_scores': criteria_scores,
                            'notes': random.choice([
                                'Excellent performance!',
                                'Good effort, needs improvement in timing',
                                'Outstanding creativity',
                                'Well executed',
                                'Impressive presentation'
                            ])
                        }
                    )

        self.stdout.write(f'  Created scores for completed and ongoing events')

    def seed_results(self):
        """Create and publish results for completed events"""
        self.stdout.write('Creating results...')

        for event_data in self.events:
            event = event_data['event']
            status = event_data['status']

            if status != 'completed':
                continue

            # Calculate average scores for each participant
            registrations = EventRegistration.objects.filter(event=event)
            participant_scores = []

            for reg in registrations:
                scores = Score.objects.filter(
                    event=event, participant=reg.participant)
                if scores.exists():
                    avg_score = sum(
                        s.total_score for s in scores) / len(scores)
                    participant_scores.append((reg.participant, avg_score))

            # Sort by score (descending)
            participant_scores.sort(key=lambda x: x[1], reverse=True)

            # Create results
            for rank, (participant, total_score) in enumerate(participant_scores, 1):
                Result.objects.get_or_create(
                    event=event,
                    participant=participant,
                    defaults={
                        'total_score': total_score,
                        'rank': rank,
                        'published': True,
                        'published_at': timezone.now() - timedelta(days=random.randint(1, 5))
                    }
                )

        self.stdout.write(f'  Created results for completed events')

    def seed_volunteer_shifts(self):
        """Create volunteer shifts and assignments"""
        self.stdout.write('Creating volunteer shifts...')

        for event_data in self.events:
            event = event_data['event']

            # Create 1-2 shifts per event
            for shift_num in range(random.randint(1, 2)):
                shift, created = VolunteerShift.objects.get_or_create(
                    event=event,
                    date=event.date,
                    start_time=event.start_time,
                    defaults={
                        'end_time': event.end_time,
                        'description': f'Event management and participant coordination - Shift {shift_num + 1}',
                        'required_volunteers': 2,
                        'status': 'completed' if event_data['status'] == 'completed' else 'assigned'
                    }
                )

                if created and self.users_created['volunteer']:
                    # Assign volunteers
                    assigned_volunteers = random.sample(self.users_created['volunteer'],
                                                        min(2, len(self.users_created['volunteer'])))
                    for volunteer in assigned_volunteers:
                        VolunteerAssignment.objects.get_or_create(
                            volunteer=volunteer,
                            shift=shift,
                            defaults={
                                'checked_in': event_data['status'] in ['completed', 'ongoing'],
                                'checked_out': event_data['status'] == 'completed',
                                'check_in_time': timezone.now() - timedelta(hours=5) if event_data['status'] in ['completed', 'ongoing'] else None,
                                'check_out_time': timezone.now() - timedelta(hours=1) if event_data['status'] == 'completed' else None,
                            }
                        )

        self.stdout.write(f'  Created volunteer shifts')

    def print_credentials(self):
        """Print all credentials"""
        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS('DATABASE SEEDED SUCCESSFULLY!'))
        self.stdout.write('='*80)
        self.stdout.write('\nUSER CREDENTIALS:')
        self.stdout.write('-'*80)

        for cred in self.credentials:
            self.stdout.write(f"\n{cred['role'].upper()}:")
            self.stdout.write(f"  Username: {cred['username']}")
            self.stdout.write(f"  Password: {cred['password']}")
            self.stdout.write(f"  Email: {cred['email']}")
            if 'specialization' in cred:
                self.stdout.write(
                    f"  Specialization: {cred['specialization']}")
            if 'school' in cred:
                self.stdout.write(f"  School: {cred['school']}")
            if 'class' in cred:
                self.stdout.write(f"  Class: {cred['class']}")

        self.stdout.write(
            f"\n\nNOTE: 50 students created (student1 to student50), all with password 'student123'")
        self.stdout.write(
            f"      Only first 5 student credentials shown above for brevity")

        self.stdout.write('\n' + '='*80)
        self.stdout.write('\nDATA SUMMARY:')
        self.stdout.write('-'*80)
        self.stdout.write(f"Schools: {len(self.schools)}")
        self.stdout.write(f"Venues: {len(self.venues)}")
        self.stdout.write(f"Admins: {len(self.users_created['admin'])}")
        self.stdout.write(f"Judges: {len(self.users_created['judge'])}")
        self.stdout.write(
            f"Volunteers: {len(self.users_created['volunteer'])}")
        self.stdout.write(
            f"School Accounts: {len(self.users_created['school'])}")
        self.stdout.write(f"Students: {len(self.users_created['student'])}")
        self.stdout.write(f"Events: {len(self.events)}")
        self.stdout.write(
            f"  - Completed (with results): {len([e for e in self.events if e['status'] == 'completed'])}")
        self.stdout.write(
            f"  - Ongoing (being scored): {len([e for e in self.events if e['status'] == 'ongoing'])}")
        self.stdout.write(
            f"  - Upcoming: {len([e for e in self.events if e['status'] == 'upcoming'])}")
        self.stdout.write('='*80 + '\n')
