"""
Test script to verify the ID generation fix for volunteers and judges.
This script tests:
1. Authentication with admin credentials
2. Generation of volunteer IDs with VOL<4-digit-number> format
3. Generation of judge IDs with JUD<4-digit-number> format
"""

import requests
import json

# Configuration
API_URL = 'http://localhost:8000'
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'AdminPass123'

def test_id_generation():
    print("=" * 60)
    print("ID Generation Fix Test")
    print("=" * 60)
    
    # Step 1: Login as admin
    print("\n1. Logging in as admin...")
    login_response = requests.post(
        f'{API_URL}/api/auth/login/',
        json={
            'username': ADMIN_USERNAME,
            'password': ADMIN_PASSWORD
        }
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        return False
    
    login_data = login_response.json()
    access_token = login_data.get('access')
    
    if not access_token:
        print("❌ No access token received")
        return False
    
    print(f"✅ Login successful")
    print(f"   User: {login_data.get('user', {}).get('username')}")
    print(f"   Role: {login_data.get('user', {}).get('role')}")
    
    # Headers for authenticated requests
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Step 2: Generate Volunteer IDs
    print("\n2. Generating Volunteer IDs...")
    volunteer_response = requests.post(
        f'{API_URL}/api/auth/admin/ids/generate/',
        json={
            'role': 'volunteer',
            'count': 3
        },
        headers=headers
    )
    
    if volunteer_response.status_code != 201:
        print(f"❌ Volunteer ID generation failed: {volunteer_response.status_code}")
        print(f"   Response: {volunteer_response.text}")
        return False
    
    volunteer_data = volunteer_response.json()
    print(f"✅ Generated {volunteer_data.get('count')} volunteer IDs:")
    for vol_id in volunteer_data.get('ids', []):
        id_code = vol_id.get('id_code')
        print(f"   - {id_code}")
        
        # Verify format: VOL followed by 4 digits
        if not id_code.startswith('VOL'):
            print(f"   ❌ ERROR: ID does not start with 'VOL'")
            return False
        
        number_part = id_code[3:]
        if not (number_part.isdigit() and len(number_part) == 4):
            print(f"   ❌ ERROR: ID does not have 4-digit number after 'VOL'")
            return False
    
    # Step 3: Generate Judge IDs
    print("\n3. Generating Judge IDs...")
    judge_response = requests.post(
        f'{API_URL}/api/auth/admin/ids/generate/',
        json={
            'role': 'judge',
            'count': 3
        },
        headers=headers
    )
    
    if judge_response.status_code != 201:
        print(f"❌ Judge ID generation failed: {judge_response.status_code}")
        print(f"   Response: {judge_response.text}")
        return False
    
    judge_data = judge_response.json()
    print(f"✅ Generated {judge_data.get('count')} judge IDs:")
    for jud_id in judge_data.get('ids', []):
        id_code = jud_id.get('id_code')
        print(f"   - {id_code}")
        
        # Verify format: JUD followed by 4 digits
        if not id_code.startswith('JUD'):
            print(f"   ❌ ERROR: ID does not start with 'JUD'")
            return False
        
        number_part = id_code[3:]
        if not (number_part.isdigit() and len(number_part) == 4):
            print(f"   ❌ ERROR: ID does not have 4-digit number after 'JUD'")
            return False
    
    # Step 4: Test invalid role
    print("\n4. Testing invalid role (should fail)...")
    invalid_response = requests.post(
        f'{API_URL}/api/auth/admin/ids/generate/',
        json={
            'role': 'student',
            'count': 1
        },
        headers=headers
    )
    
    if invalid_response.status_code == 400:
        print(f"✅ Correctly rejected invalid role")
    else:
        print(f"❌ Should have rejected invalid role but got: {invalid_response.status_code}")
    
    # Step 5: Test without authentication
    print("\n5. Testing without authentication (should fail)...")
    unauth_response = requests.post(
        f'{API_URL}/api/auth/admin/ids/generate/',
        json={
            'role': 'volunteer',
            'count': 1
        }
    )
    
    if unauth_response.status_code == 401:
        print(f"✅ Correctly rejected unauthenticated request")
    else:
        print(f"❌ Should have rejected unauthenticated request but got: {unauth_response.status_code}")
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    return True

if __name__ == '__main__':
    try:
        test_id_generation()
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
