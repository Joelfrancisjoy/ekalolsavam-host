import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
django.setup()

from users.models import User

print("=" * 70)
print("FIX ADMIN USER ROLE")
print("=" * 70)
print()

# Find all users with admin privileges but missing role
admin_users = User.objects.filter(
    is_staff=True,
    is_superuser=True
).exclude(role='admin')

print(f"Found {admin_users.count()} admin user(s) with missing or incorrect role")
print()

for user in admin_users:
    print(f"Fixing user: {user.username} ({user.email})")
    print(f"  Current role: '{user.role}' (empty or incorrect)")
    
    # Update the role to 'admin'
    user.role = 'admin'
    user.save(update_fields=['role'])
    
    print(f"  ✓ Updated role to: 'admin'")
    print()

# Verify the fix
print("-" * 70)
print("Verification:")
print("-" * 70)

admins = User.objects.filter(role='admin')
print(f"Total admin users with correct role: {admins.count()}")

for admin in admins:
    print(f"  ✓ {admin.username} ({admin.email})")
    print(f"    - role: {admin.role}")
    print(f"    - is_staff: {admin.is_staff}")
    print(f"    - is_superuser: {admin.is_superuser}")
    print(f"    - is_active: {admin.is_active}")

print()
print("=" * 70)
print("FIX COMPLETE!")
print("=" * 70)
print()
print("The admin user should now redirect to /admin instead of /dashboard")
