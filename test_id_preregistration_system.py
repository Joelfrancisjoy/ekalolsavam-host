"""
Comprehensive test script for the ID Pre-Registration System.

Tests the complete workflow:
1. Admin generates IDs with name assignments
2. User registers with assigned ID
3. Name and phone verification
4. Admin approves registration
5. User can login

Run this script with the backend server running:
cd backend
python manage.py runserver

Then in another terminal:
python test_id_preregistration_system.py
"""

import requests
import json
import time

# Configuration
API_URL = 'http://localhost:8000'
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'AdminPass123'

# Test data
TEST_VOLUNTEER_NAME = 'Test Volunteer User'
TEST_VOLUNTEER_PHONE = '9876543210'
TEST_JUDGE_NAME = 'Test Judge User'
TEST_JUDGE_PHONE = '9123456789'

def print_section(title):
    print(f"\n{'=' * 70}")
    print(f"{title.center(70)}")
    print(f"{'=' * 70}\n")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def test_id_preregistration_system():
    print_section("ID Pre-Registration System - Comprehensive Test")
    
    # Step 1: Admin Login
    print_section("Step 1: Admin Authentication")
    login_response = requests.post(
        f'{API_URL}/api/auth/login/',
        json={
            'username': ADMIN_USERNAME,
            'password': ADMIN_PASSWORD
        }
    )
    
    if login_response.status_code != 200:
        print_error(f"Admin login failed: {login_response.status_code}")
        print_error(f"Response: {login_response.text}")
        return False
    
    login_data = login_response.json()
    admin_token = login_data.get('access')
    
    if not admin_token:
        print_error("No access token received")
        return False
    
    print_success(f"Admin logged in successfully")
    print_info(f"User: {login_data.get('user', {}).get('username')}")
    print_info(f"Role: {login_data.get('user', {}).get('role')}")
    
    headers = {
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json'
    }
    
    # Step 2: Generate Volunteer IDs with names
    print_section("Step 2: Generate Volunteer IDs with Name Assignments")
    
    volunteer_response = requests.post(
        f'{API_URL}/api/auth/admin/ids/generate/',
        json={
            'role': 'volunteer',
            'assignments': [
                {
                    'name': TEST_VOLUNTEER_NAME,
                    'phone': TEST_VOLUNTEER_PHONE,
                    'notes': 'Test volunteer for automated testing'
                }
            ]
        },
        headers=headers
    )
    
    if volunteer_response.status_code != 201:
        print_error(f"Volunteer ID generation failed: {volunteer_response.status_code}")
        print_error(f"Response: {volunteer_response.text}")
        return False
    
    volunteer_data = volunteer_response.json()
    volunteer_ids = volunteer_data.get('ids', [])
    
    if not volunteer_ids:
        print_error("No volunteer IDs generated")
        return False
    
    volunteer_id_code = volunteer_ids[0]['id_code']
    print_success(f"Generated volunteer ID: {volunteer_id_code}")
    print_info(f"Assigned to: {volunteer_ids[0].get('assigned_name')}")
    print_info(f"Phone: {volunteer_ids[0].get('assigned_phone')}")
    print_info(f"Status: {volunteer_ids[0].get('status_display')}")
    
    # Step 3: Generate Judge IDs with names
    print_section("Step 3: Generate Judge IDs with Name Assignments")
    
    judge_response = requests.post(
        f'{API_URL}/api/auth/admin/ids/generate/',
        json={
            'role': 'judge',
            'assignments': [
                {
                    'name': TEST_JUDGE_NAME,
                    'phone': TEST_JUDGE_PHONE,
                    'notes': 'Test judge for automated testing'
                }
            ]
        },
        headers=headers
    )
    
    if judge_response.status_code != 201:
        print_error(f"Judge ID generation failed: {judge_response.status_code}")
        print_error(f"Response: {judge_response.text}")
        return False
    
    judge_data = judge_response.json()
    judge_ids = judge_data.get('ids', [])
    
    if not judge_ids:
        print_error("No judge IDs generated")
        return False
    
    judge_id_code = judge_ids[0]['id_code']
    print_success(f"Generated judge ID: {judge_id_code}")
    print_info(f"Assigned to: {judge_ids[0].get('assigned_name')}")
    print_info(f"Phone: {judge_ids[0].get('assigned_phone')}")
    
    # Step 4: Check ID validity (public endpoint)
    print_section("Step 4: Verify ID Validity (Public Endpoint)")
    
    check_response = requests.post(
        f'{API_URL}/api/auth/ids/check/',
        json={'id_code': volunteer_id_code}
    )
    
    if check_response.status_code != 200:
        print_error(f"ID check failed: {check_response.status_code}")
        return False
    
    check_data = check_response.json()
    if not check_data.get('valid'):
        print_error(f"ID marked as invalid: {check_data.get('error')}")
        return False
    
    print_success(f"ID {volunteer_id_code} is valid and available")
    print_info(f"Role: {check_data.get('role')}")
    print_info(f"Assigned to: {check_data.get('assigned_name')}")
    
    # Step 5: Test invalid ID check
    print_section("Step 5: Test Invalid ID Rejection")
    
    invalid_check = requests.post(
        f'{API_URL}/api/auth/ids/check/',
        json={'id_code': 'VOL9999'}
    )
    
    invalid_data = invalid_check.json()
    if invalid_data.get('valid'):
        print_error("Invalid ID was incorrectly marked as valid")
        return False
    
    print_success("Invalid ID correctly rejected")
    print_info(f"Error message: {invalid_data.get('error')}")
    
    # Step 6: Register volunteer with correct name
    print_section("Step 6: Register Volunteer with Assigned ID")
    
    volunteer_username = f"testvol{int(time.time())}"
    volunteer_email = f"testvol{int(time.time())}@gmail.com"
    
    register_response = requests.post(
        f'{API_URL}/api/auth/register/with-id/',
        json={
            'id_code': volunteer_id_code,
            'username': volunteer_username,
            'password': 'TestPass123',
            'email': volunteer_email,
            'first_name': 'Test',
            'last_name': 'Volunteer User',
            'phone': TEST_VOLUNTEER_PHONE
        }
    )
    
    if register_response.status_code != 201:
        print_error(f"Registration failed: {register_response.status_code}")
        print_error(f"Response: {register_response.text}")
        return False
    
    register_data = register_response.json()
    print_success("Volunteer registered successfully")
    print_info(f"Username: {register_data.get('user', {}).get('username')}")
    print_info(f"Status: {register_data.get('user', {}).get('status')}")
    print_info(f"Message: {register_data.get('message')}")
    
    # Step 7: Try to login (should fail - not approved yet)
    print_section("Step 7: Test Login Before Approval (Should Fail)")
    
    pre_approval_login = requests.post(
        f'{API_URL}/api/auth/login/',
        json={
            'username': volunteer_username,
            'password': 'TestPass123'
        }
    )
    
    if pre_approval_login.status_code == 200:
        print_error("Login succeeded before approval (should fail)")
        return False
    
    print_success("Login correctly blocked before admin approval")
    print_info(f"Error: {pre_approval_login.json().get('error')}")
    
    # Step 8: List pending verifications
    print_section("Step 8: List Pending Verifications")
    
    pending_response = requests.get(
        f'{API_URL}/api/auth/admin/signup-requests/?status=pending',
        headers=headers
    )
    
    if pending_response.status_code != 200:
        print_error(f"Failed to load pending requests: {pending_response.status_code}")
        return False
    
    pending_requests = pending_response.json()
    
    # Find our volunteer's request
    volunteer_request = None
    for req in pending_requests:
        if req.get('issued_id_code') == volunteer_id_code:
            volunteer_request = req
            break
    
    if not volunteer_request:
        print_error("Volunteer's signup request not found in pending list")
        return False
    
    request_id = volunteer_request['id']
    print_success(f"Found pending verification request (ID: {request_id})")
    print_info(f"User: {volunteer_request['user_details']['first_name']} {volunteer_request['user_details']['last_name']}")
    print_info(f"Email: {volunteer_request['user_details']['email']}")
    print_info(f"ID Used: {volunteer_request['issued_id_code']}")
    
    # Step 9: Approve the registration
    print_section("Step 9: Admin Approves Registration")
    
    approve_response = requests.patch(
        f'{API_URL}/api/auth/admin/signup-requests/{request_id}/',
        json={
            'status': 'approved',
            'notes': 'Automated test approval'
        },
        headers=headers
    )
    
    if approve_response.status_code != 200:
        print_error(f"Approval failed: {approve_response.status_code}")
        print_error(f"Response: {approve_response.text}")
        return False
    
    print_success("Registration approved successfully")
    
    # Step 10: Login after approval
    print_section("Step 10: Test Login After Approval (Should Succeed)")
    
    post_approval_login = requests.post(
        f'{API_URL}/api/auth/login/',
        json={
            'username': volunteer_username,
            'password': 'TestPass123'
        }
    )
    
    if post_approval_login.status_code != 200:
        print_error(f"Login failed after approval: {post_approval_login.status_code}")
        print_error(f"Response: {post_approval_login.text}")
        return False
    
    login_data = post_approval_login.json()
    print_success("Login successful after approval!")
    print_info(f"User: {login_data['user']['username']}")
    print_info(f"Role: {login_data['user']['role']}")
    print_info(f"Active: {login_data['user'].get('is_active', 'N/A')}")
    
    # Step 11: Test name mismatch rejection
    print_section("Step 11: Test Name Mismatch Rejection")
    
    judge_username = f"testjudge{int(time.time())}"
    judge_email = f"testjudge{int(time.time())}@gmail.com"
    
    # Try to register with wrong name
    wrong_name_response = requests.post(
        f'{API_URL}/api/auth/register/with-id/',
        json={
            'id_code': judge_id_code,
            'username': judge_username,
            'password': 'TestPass123',
            'email': judge_email,
            'first_name': 'Wrong',
            'last_name': 'Name',
            'phone': TEST_JUDGE_PHONE
        }
    )
    
    if wrong_name_response.status_code == 201:
        print_error("Registration succeeded with wrong name (should fail)")
        return False
    
    print_success("Registration correctly rejected for name mismatch")
    print_info(f"Error: {wrong_name_response.json().get('error')}")
    
    # Step 12: Test ID reuse prevention
    print_section("Step 12: Test ID Reuse Prevention")
    
    reuse_response = requests.post(
        f'{API_URL}/api/auth/register/with-id/',
        json={
            'id_code': volunteer_id_code,  # Already used
            'username': f"reuse{int(time.time())}",
            'password': 'TestPass123',
            'email': f"reuse{int(time.time())}@gmail.com",
            'first_name': 'Test',
            'last_name': 'Volunteer User',
            'phone': TEST_VOLUNTEER_PHONE
        }
    )
    
    if reuse_response.status_code == 201:
        print_error("ID reuse allowed (should be blocked)")
        return False
    
    print_success("ID reuse correctly prevented")
    print_info(f"Error: {reuse_response.json().get('error')}")
    
    # Step 13: List all IDs and verify status
    print_section("Step 13: Verify ID Management Dashboard")
    
    all_ids_response = requests.get(
        f'{API_URL}/api/auth/admin/ids/',
        headers=headers
    )
    
    if all_ids_response.status_code != 200:
        print_error(f"Failed to load IDs: {all_ids_response.status_code}")
        return False
    
    all_ids = all_ids_response.json()
    
    # Find our volunteer ID
    volunteer_id_obj = None
    for id_obj in all_ids:
        if id_obj['id_code'] == volunteer_id_code:
            volunteer_id_obj = id_obj
            break
    
    if not volunteer_id_obj:
        print_error("Volunteer ID not found in management dashboard")
        return False
    
    print_success("ID found in management dashboard")
    print_info(f"ID: {volunteer_id_obj['id_code']}")
    print_info(f"Assigned Name: {volunteer_id_obj['assigned_name']}")
    print_info(f"Status: {volunteer_id_obj['status_display']}")
    print_info(f"Used By: {volunteer_id_obj.get('used_by_username', 'N/A')}")
    print_info(f"Verified: {volunteer_id_obj['is_verified']}")
    
    if not volunteer_id_obj['is_used']:
        print_error("ID not marked as used")
        return False
    
    if not volunteer_id_obj['is_verified']:
        print_error("ID not marked as verified")
        return False
    
    print_success("ID status correctly updated")
    
    # Final Summary
    print_section("✅ ALL TESTS PASSED!")
    
    print("\n📋 Test Summary:")
    print("  ✓ Admin authentication")
    print("  ✓ ID generation with name assignments")
    print("  ✓ ID validity checking")
    print("  ✓ Invalid ID rejection")
    print("  ✓ User registration with ID")
    print("  ✓ Login blocked before approval")
    print("  ✓ Pending verification listing")
    print("  ✓ Admin approval workflow")
    print("  ✓ Login successful after approval")
    print("  ✓ Name mismatch rejection")
    print("  ✓ ID reuse prevention")
    print("  ✓ ID management dashboard")
    
    print("\n🎯 System Status: FULLY OPERATIONAL")
    print(f"\n📝 Generated Test IDs:")
    print(f"   Volunteer: {volunteer_id_code} (Verified & Used)")
    print(f"   Judge: {judge_id_code} (Available - Name Mismatch Test)")
    
    print(f"\n👤 Test User Created:")
    print(f"   Username: {volunteer_username}")
    print(f"   Role: volunteer")
    print(f"   Status: Active & Verified")
    
    return True

if __name__ == '__main__':
    try:
        print("\n🚀 Starting ID Pre-Registration System Tests...")
        print("⏳ Make sure backend is running on http://localhost:8000\n")
        time.sleep(1)
        
        success = test_id_preregistration_system()
        
        if success:
            print("\n" + "=" * 70)
            print("SUCCESS".center(70))
            print("=" * 70)
        else:
            print("\n" + "=" * 70)
            print("TESTS FAILED".center(70))
            print("=" * 70)
            
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
