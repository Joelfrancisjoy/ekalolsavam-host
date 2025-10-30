"""
Quick script to display all seeded user credentials
Run: python show_credentials.py
"""

def show_credentials():
    from users.models import User
    print("\n" + "="*80)
    print("🎭 KALOLSAVAM - SEEDED USER CREDENTIALS")
    print("="*80)
    
    roles = ['admin', 'judge', 'volunteer', 'school', 'student']
    
    for role in roles:
        users = User.objects.filter(role=role).order_by('username')
        
        if not users.exists():
            continue
        
        print(f"\n{'='*80}")
        print(f"{role.upper()} ACCOUNTS ({users.count()} total)")
        print(f"{'='*80}")
        
        if role == 'admin':
            password = 'admin123'
        elif role == 'judge':
            password = 'judge123'
        elif role == 'volunteer':
            password = 'volunteer123'
        elif role == 'school':
            password = 'school123'
        else:
            password = 'student123'
        
        for user in users[:10]:  # Show first 10 of each role
            print(f"\nUsername: {user.username}")
            print(f"Password: {password}")
            print(f"Email:    {user.email}")
            
            if role == 'judge':
                from events.models import Judge
                try:
                    judge_obj = Judge.objects.get(user=user)
                    print(f"Specialization: {judge_obj.specialization}")
                except Judge.DoesNotExist:
                    pass
            
            elif role == 'school':
                if user.school:
                    print(f"School: {user.school.name}")
            
            elif role == 'student':
                if user.school:
                    print(f"School: {user.school.name}")
                if user.student_class:
                    print(f"Class:  {user.student_class}")
        
        if users.count() > 10:
            remaining = users.count() - 10
            print(f"\n... and {remaining} more {role} accounts")
            print(f"(All use password: {password})")
    
    print("\n" + "="*80)
    print("DATABASE SUMMARY")
    print("="*80)
    
    from events.models import Event, EventRegistration
    from scores.models import Score, Result
    
    total_users = User.objects.count()
    total_events = Event.objects.count()
    total_registrations = EventRegistration.objects.count()
    total_scores = Score.objects.count()
    total_results = Result.objects.filter(published=True).count()
    
    print(f"\nUsers:         {total_users}")
    print(f"Events:        {total_events}")
    print(f"Registrations: {total_registrations}")
    print(f"Scores:        {total_scores}")
    print(f"Published Results: {total_results}")
    
    # Event status
    from scores.models import Result
    completed = Event.objects.filter(result__published=True).distinct().count()
    ongoing = Event.objects.filter(is_published=True).exclude(result__published=True).distinct().count()
    upcoming = Event.objects.filter(is_published=False).count()
    
    print(f"\nEvent Status:")
    print(f"  Completed (with results): {completed}")
    print(f"  Ongoing (being judged):   {ongoing}")
    print(f"  Upcoming:                 {upcoming}")
    
    print("\n" + "="*80)
    print("\n✅ For complete documentation, see:")
    print("   - QUICK_CREDENTIALS.md")
    print("   - SEEDED_DATABASE_CREDENTIALS.md")
    print("   - DATABASE_STATUS.md")
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    import os
    import sys
    import django
    
    # Add the backend directory to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
    django.setup()
    
    from users.models import User
    
    show_credentials()
