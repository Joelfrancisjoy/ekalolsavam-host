from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'Fix admin users with missing or incorrect role field'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('FIX ADMIN USER ROLES'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write('')

        # Find all users with admin privileges (is_staff=True AND is_superuser=True)
        # but missing or incorrect role
        admin_users = User.objects.filter(
            is_staff=True,
            is_superuser=True
        ).exclude(role='admin')

        count = admin_users.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('✓ All admin users have correct role assigned'))
            self.stdout.write('')
            
            # Show current admin users
            admins = User.objects.filter(role='admin')
            if admins.exists():
                self.stdout.write(self.style.SUCCESS(f'Current admin users ({admins.count()}):'))
                for admin in admins:
                    self.stdout.write(f'  • {admin.username} ({admin.email})')
            else:
                self.stdout.write(self.style.WARNING('⚠ No admin users found in database!'))
            
            self.stdout.write('')
            return

        self.stdout.write(self.style.WARNING(f'Found {count} admin user(s) with missing or incorrect role'))
        self.stdout.write('')

        fixed_count = 0
        for user in admin_users:
            self.stdout.write(f'Fixing user: {user.username} ({user.email})')
            old_role = user.role if user.role else '(empty)'
            self.stdout.write(f'  Current role: {old_role}')
            
            # Update the role to 'admin'
            user.role = 'admin'
            user.save(update_fields=['role'])
            fixed_count += 1
            
            self.stdout.write(self.style.SUCCESS(f'  ✓ Updated role to: admin'))
            self.stdout.write('')

        # Verification
        self.stdout.write('-' * 70)
        self.stdout.write(self.style.SUCCESS('Verification:'))
        self.stdout.write('-' * 70)

        admins = User.objects.filter(role='admin')
        self.stdout.write(self.style.SUCCESS(f'Total admin users with correct role: {admins.count()}'))
        self.stdout.write('')

        for admin in admins:
            self.stdout.write(f'  ✓ {admin.username} ({admin.email})')
            self.stdout.write(f'    - role: {admin.role}')
            self.stdout.write(f'    - is_staff: {admin.is_staff}')
            self.stdout.write(f'    - is_superuser: {admin.is_superuser}')
            self.stdout.write(f'    - is_active: {admin.is_active}')
            self.stdout.write('')

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS(f'FIX COMPLETE! Fixed {fixed_count} admin user(s)'))
        self.stdout.write('=' * 70)
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Admin users should now redirect to /admin correctly'))
