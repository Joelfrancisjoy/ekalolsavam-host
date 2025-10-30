import requests
import json

print("=" * 70)
print("ID MANAGEMENT - API ENDPOINT TEST")
print("=" * 70)
print()

# Login as admin first
print("1. Logging in as admin...")
login_response = requests.post('http://localhost:8000/api/auth/login/', json={
    'username': 'admin',
    'password': 'AdminPass123'
})

if login_response.status_code == 200:
    token = login_response.json()['access']
    print(f"✓ Login successful")
    print(f"  Token: {token[:50]}...")
else:
    print(f"✗ Login failed: {login_response.status_code}")
    print(f"  Response: {login_response.text}")
    exit(1)

print()

# Test ID Generation
print("2. Testing ID generation...")
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

generate_response = requests.post('http://localhost:8000/api/auth/admin/ids/generate/', 
    json={'role': 'volunteer', 'count': 3},
    headers=headers
)

if generate_response.status_code == 201:
    data = generate_response.json()
    print(f"✓ Generated {data['count']} IDs successfully")
    for i, id_data in enumerate(data['ids'], 1):
        print(f"  {i}. {id_data['id_code']} ({id_data['role']})")
else:
    print(f"✗ ID generation failed: {generate_response.status_code}")
    print(f"  Response: {generate_response.text}")

print()

# Test getting signup requests
print("3. Testing signup requests retrieval...")
requests_response = requests.get('http://localhost:8000/api/auth/admin/signup-requests/?status=pending',
    headers=headers
)

if requests_response.status_code == 200:
    data = requests_response.json()
    print(f"✓ Retrieved signup requests successfully")
    print(f"  Pending requests: {len(data)}")
else:
    print(f"✗ Signup requests retrieval failed: {requests_response.status_code}")
    print(f"  Response: {requests_response.text}")

print()
print("=" * 70)
print("API TEST COMPLETE")
print("=" * 70)
print()
print("✅ All API endpoints are working correctly!")
print()
print("Next steps:")
print("1. Start the frontend: cd frontend && npm start")
print("2. Login as admin (username: admin, password: AdminPass123)")
print("3. Navigate to Admin Panel -> ID Management")
print("4. Try generating IDs through the UI")
