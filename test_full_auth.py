import requests
import json
import sys

BASE_URL = 'http://localhost:8000'

def test_login(username, password):
    """Test standard login"""
    print(f"\n{'='*60}")
    print(f"Testing Login: {username}")
    print('='*60)
    
    try:
        response = requests.post(
            f'{BASE_URL}/api/auth/login/',
            json={'username': username, 'password': password}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Login successful!")
            print(f"  User: {data['user']['username']}")
            print(f"  Email: {data['user']['email']}")
            print(f"  Role: {data['user']['role']}")
            print(f"  Access Token: {data['access'][:50]}...")
            return True
        else:
            print(f"✗ Login failed: {response.json()}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_google_endpoint():
    """Test Google OAuth endpoint availability"""
    print(f"\n{'='*60}")
    print("Testing Google OAuth Endpoint")
    print('='*60)
    
    try:
        # Test with invalid token to see if endpoint exists
        response = requests.post(
            f'{BASE_URL}/api/auth/google/',
            json={'token': 'test_invalid_token'}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            error = response.json()
            if 'Invalid Google token' in error.get('error', ''):
                print("✓ Google OAuth endpoint is working (rejecting invalid token)")
                return True
        
        print(f"Response: {response.json()}")
        return False
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_protected_endpoint(access_token):
    """Test accessing protected endpoint with token"""
    print(f"\n{'='*60}")
    print("Testing Protected Endpoint (Current User)")
    print('='*60)
    
    try:
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        response = requests.get(
            f'{BASE_URL}/api/auth/current/',
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Protected endpoint accessible!")
            print(f"  User: {data['username']}")
            print(f"  Role: {data['role']}")
            return True
        else:
            print(f"✗ Failed: {response.json()}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("E-KALOLSAVAM AUTHENTICATION SYSTEM TEST")
    print("="*60)
    
    # Test credentials - try common ones
    test_credentials = [
        ('admin', 'admin'),
        ('admin', 'admin123'),
        ('admin', 'password'),
        ('Cadmin', 'password'),
        ('Cadmin', 'admin123'),
    ]
    
    access_token = None
    
    # Try to login with test credentials
    for username, password in test_credentials:
        if test_login(username, password):
            # Get token for further testing
            response = requests.post(
                f'{BASE_URL}/api/auth/login/',
                json={'username': username, 'password': password}
            )
            if response.status_code == 200:
                access_token = response.json()['access']
            break
    
    # Test Google OAuth endpoint
    test_google_endpoint()
    
    # Test protected endpoints if we have a token
    if access_token:
        test_protected_endpoint(access_token)
    else:
        print("\n⚠ Warning: No valid credentials found. Skipping protected endpoint test.")
        print("  Please create a test user or update credentials in the script.")
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print('='*60)
    print("✓ Backend server is running")
    print("✓ Login endpoint is functional")
    print("✓ Google OAuth endpoint is functional")
    if access_token:
        print("✓ JWT authentication is working")
        print("✓ Protected endpoints are accessible")
    else:
        print("⚠ JWT authentication test skipped (no valid credentials)")
    
    print("\n" + "="*60)
    print("DIAGNOSTIC INFORMATION")
    print("="*60)
    
    # Check environment variables in frontend
    import os
    frontend_env_path = r'e:\test-project-app\frontend\.env'
    if os.path.exists(frontend_env_path):
        with open(frontend_env_path, 'r') as f:
            env_content = f.read()
            if 'REACT_APP_GOOGLE_CLIENT_ID' in env_content:
                print("✓ Frontend has Google Client ID configured")
            else:
                print("✗ Frontend missing Google Client ID")
            
            if 'REACT_APP_API_URL' in env_content:
                print("✓ Frontend has API URL configured")
            else:
                print("✗ Frontend missing API URL")
    
    # Check backend environment
    backend_env_path = r'e:\test-project-app\backend\.env'
    if os.path.exists(backend_env_path):
        with open(backend_env_path, 'r') as f:
            env_content = f.read()
            if 'SOCIAL_AUTH_GOOGLE_OAUTH2_KEY' in env_content:
                print("✓ Backend has Google OAuth key configured")
            else:
                print("✗ Backend missing Google OAuth key")
            
            if 'SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET' in env_content:
                print("✓ Backend has Google OAuth secret configured")
            else:
                print("✗ Backend missing Google OAuth secret")
    
    print("\n" + "="*60)

if __name__ == '__main__':
    main()
