import requests
import json

print("=" * 70)
print("TESTING ADMIN LOGIN WITH CORRECT PASSWORD")
print("=" * 70)
print()

# Test admin login with the password we just set
print("Testing admin login...")
print("-" * 70)

try:
    response = requests.post(
        'http://localhost:8000/api/auth/login/',
        json={
            'username': 'admin',
            'password': 'AdminPass123'
        }
    )
    
    print(f"Status Code: {response.status_code}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        user = data['user']
        
        print("✅ LOGIN SUCCESSFUL!")
        print()
        print("User Details:")
        print(f"  Username: {user['username']}")
        print(f"  Email: {user['email']}")
        print(f"  Role: {user['role']}")
        print(f"  First Name: {user.get('first_name', 'N/A')}")
        print(f"  Last Name: {user.get('last_name', 'N/A')}")
        print()
        
        # Check redirect logic
        print("Frontend Redirect Analysis:")
        print("-" * 70)
        
        role = user['role']
        username = user['username'].lower()
        email = user['email']
        
        print(f"User role field: '{role}'")
        print(f"Username (lowercase): '{username}'")
        print(f"Email: '{email}'")
        print()
        
        # Simulate frontend redirect logic
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
            reason = f"Default fallback (role='{role}' is empty or unknown)"
        
        print(f"Expected Redirect: {redirect}")
        print(f"Reason: {reason}")
        print()
        
        if redirect == '/admin':
            print("✅ ✅ ✅ SUCCESS! ✅ ✅ ✅")
            print("Admin user WILL redirect to /admin panel correctly!")
        else:
            print("❌ ❌ ❌ FAILURE! ❌ ❌ ❌")
            print(f"Admin user will redirect to {redirect} instead of /admin")
            print(f"Role field value: '{role}'")
            print()
            print("To fix, run:")
            print("  cd backend")
            print("  python manage.py fix_admin_roles")
        
        print()
        print("=" * 70)
        print("JWT Tokens:")
        print("-" * 70)
        print(f"Access Token: {data['access'][:50]}...")
        print(f"Refresh Token: {data['refresh'][:50]}...")
        
    else:
        print(f"❌ Login failed with status {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response: {response.text}")

except requests.exceptions.ConnectionError:
    print("❌ ERROR: Cannot connect to backend server")
    print()
    print("Make sure the backend is running:")
    print("  cd backend")
    print("  python manage.py runserver")
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 70)
