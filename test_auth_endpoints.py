import requests
import json

# Test 1: Standard Login Test
print("=" * 60)
print("TEST 1: Standard Login Endpoint")
print("=" * 60)

try:
    response = requests.post(
        'http://localhost:8000/api/auth/login/',
        json={
            'username': 'testuser',
            'password': 'testpass123'
        }
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

print("\n")

# Test 2: Google OAuth Endpoint Check
print("=" * 60)
print("TEST 2: Google OAuth Endpoint Availability")
print("=" * 60)

try:
    response = requests.post(
        'http://localhost:8000/api/auth/google/',
        json={
            'token': 'fake_token_for_testing'
        }
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

print("\n")

# Test 3: Check current user endpoint
print("=" * 60)
print("TEST 3: Current User Endpoint (No Auth)")
print("=" * 60)

try:
    response = requests.get('http://localhost:8000/api/auth/current/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 401:
        print("✓ Correctly requires authentication")
    else:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

print("\n")

# Test 4: Check schools endpoint
print("=" * 60)
print("TEST 4: Schools Endpoint (Public)")
print("=" * 60)

try:
    response = requests.get('http://localhost:8000/api/auth/schools/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Schools loaded: {len(data)} schools")
    else:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

print("\n")
print("=" * 60)
print("Test Summary Complete")
print("=" * 60)
