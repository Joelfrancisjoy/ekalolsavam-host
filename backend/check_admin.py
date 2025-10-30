import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
django.setup()

from users.models import User

print("Checking database users...")
print("=" * 60)

users = User.objects.all()
print(f"Total users in database: {users.count()}")
print()

if users.count() == 0:
    print("❌ Database is empty! No users found.")
else:
    print("Users in database:")
    for user in users:
        print(f"  ID: {user.id}")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Role: {user.role}")
        print(f"  is_staff: {user.is_staff}")
        print(f"  is_superuser: {user.is_superuser}")
        print(f"  is_active: {user.is_active}")
        print("-" * 60)

print()
admins = User.objects.filter(role='admin')
print(f"Admin users: {admins.count()}")

if admins.count() == 0:
    print("❌ No admin users found!")
    print("\nThe database needs an admin user.")
else:
    for admin in admins:
        print(f"✓ Admin found: {admin.username} ({admin.email})")
