import os
import sys
import django

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
django.setup()

print("=" * 70)
print("ID MANAGEMENT - BACKEND TEST")
print("=" * 70)
print()

# Test imports
print("Testing imports...")
try:
    from users.workflow_models import AdminIssuedID, IDSignupRequest
    print("✓ workflow_models imports successful")
except Exception as e:
    print(f"✗ workflow_models import failed: {e}")
    sys.exit(1)

try:
    from users.workflow_serializers import AdminIssuedIDSerializer, IDSignupRequestSerializer
    print("✓ workflow_serializers imports successful")
except Exception as e:
    print(f"✗ workflow_serializers import failed: {e}")
    sys.exit(1)

try:
    from users.workflow_views import AdminGenerateIDView, IDSignupRequestListView
    print("✓ workflow_views imports successful")
except Exception as e:
    print(f"✗ workflow_views import failed: {e}")
    sys.exit(1)

print()

# Test database
print("Testing database...")
try:
    count = AdminIssuedID.objects.count()
    print(f"✓ AdminIssuedID table accessible ({count} records)")
except Exception as e:
    print(f"✗ AdminIssuedID table error: {e}")

try:
    count = IDSignupRequest.objects.count()
    print(f"✓ IDSignupRequest table accessible ({count} records)")
except Exception as e:
    print(f"✗ IDSignupRequest table error: {e}")

print()

# Test URL routing
print("Testing URL patterns...")
try:
    from django.urls import reverse
    urls_to_test = [
        'admin-generate-id',
        'admin-signup-requests',
        'register-with-id'
    ]
    
    for url_name in urls_to_test:
        try:
            url = reverse(url_name)
            print(f"✓ {url_name}: {url}")
        except Exception as e:
            print(f"✗ {url_name}: {e}")
except Exception as e:
    print(f"✗ URL test failed: {e}")

print()
print("=" * 70)
print("TEST COMPLETE")
print("=" * 70)
