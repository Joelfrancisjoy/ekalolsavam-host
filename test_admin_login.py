import requests
import json

print("=" * 70)
print("TESTING ADMIN LOGIN AND REDIRECT")
print("=" * 70)
print()

# Test admin login
print("1. Testing admin login...")
print("-" * 70)

try:
    response = requests.post(
        'http://localhost:8000/api/auth/login/',
        json={
            'username': 'admin',
            'password': 'admin'  # Try common password
        }
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        user = data['user']
        
        print("✓ Login successful!")
        print()
        print("User Details:")
        print(f"  Username: {user['username']}")
        print(f"  Email: {user['email']}")
        print(f"  Role: {user['role']}")
        print()
        
        # Check redirect logic
        print("Frontend Redirect Logic Check:")
        print("-" * 70)
        
        role = user['role']
        username = user['username'].lower()
        email = user['email']
        
        # Check special handling first
        if username == 'cenadmin' or email == 'joelfrancisjoy@gmail.com':
            redirect = '/admin'
            reason = f"Special handling for {username} or {email}"
        elif role == 'admin':
            redirect = '/admin'
            reason = "Role is 'admin'"
        elif role == 'judge':
            redirect = '/judge'
            reason = "Role is 'judge'"
        elif role == 'volunteer':
            redirect = '/volunteer'
            reason = "Role is 'volunteer'"
        elif role == 'student':
            redirect = '/dashboard'
            reason = "Role is 'student'"
        else:
            redirect = '/dashboard'
            reason = f"Default fallback (role='{role}')"
        
        print(f"Expected Redirect: {redirect}")
        print(f"Reason: {reason}")
        print()
        
        if redirect == '/admin':
            print("✅ SUCCESS: Admin user will redirect to admin panel")
        else:
            print(f"❌ ERROR: Admin user will redirect to {redirect} instead of /admin")
            print(f"   This is wrong! Role is: '{role}'")
        
    elif response.status_code == 401:
        print("❌ Login failed: Invalid credentials")
        print()
        print("The default admin password might not be 'admin'")
        print("Try one of these:")
        print("  - Use the password you set when creating the admin user")
        print("  - Reset the password using: python manage.py changepassword admin")
    else:
        print(f"❌ Login failed with status {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

except requests.exceptions.ConnectionError:
    print("❌ ERROR: Cannot connect to backend server")
    print()
    print("Make sure the backend is running:")
    print("  cd backend")
    print("  python manage.py runserver")
except Exception as e:
    print(f"❌ ERROR: {e}")

print()
print("=" * 70)
print("TEST COMPLETE")
print("=" * 70)
