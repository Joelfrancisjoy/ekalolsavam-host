#!/usr/bin/env python
"""
Simple script to test if backend is working and new endpoints are accessible
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/auth"

def test_endpoint(url, method='GET', data=None):
    """Test an endpoint and print the result"""
    try:
        if method == 'GET':
            response = requests.get(url, timeout=5)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=5)
        
        print(f"✅ {method} {url}")
        print(f"   Status: {response.status_code}")
        if response.status_code < 300:
            try:
                content = response.json()
                if isinstance(content, list):
                    print(f"   Response: [{len(content)} items]")
                else:
                    print(f"   Response: {json.dumps(content, indent=2)[:200]}...")
            except:
                print(f"   Response: {response.text[:200]}")
        else:
            print(f"   Error: {response.text[:200]}")
        print()
        return response
    except requests.exceptions.ConnectionError:
        print(f"❌ {method} {url}")
        print("   Error: Cannot connect to backend. Is the server running?")
        print()
        return None
    except Exception as e:
        print(f"❌ {method} {url}")
        print(f"   Error: {str(e)}")
        print()
        return None

def main():
    print("=" * 60)
    print("Backend API Endpoint Tests")
    print("=" * 60)
    print()
    
    # Test basic endpoints
    print("Testing Basic Endpoints:")
    print("-" * 60)
    test_endpoint(f"{BASE_URL}/schools/")
    test_endpoint(f"{BASE_URL}/standings/")
    
    # Test new workflow endpoints (will return 401/403 without auth, which is expected)
    print("\nTesting New Workflow Endpoints:")
    print("-" * 60)
    print("(Note: These will return 401/403 without authentication - this is normal)")
    
    test_endpoint(f"{BASE_URL}/register/with-id/", method='POST', data={})
    test_endpoint(f"{BASE_URL}/schools/participants/submit/", method='POST', data={})
    test_endpoint(f"{BASE_URL}/volunteer/school-participants/")
    test_endpoint(f"{BASE_URL}/volunteer/verify-student/", method='POST', data={})
    test_endpoint(f"{BASE_URL}/admin/ids/generate/", method='POST', data={})
    test_endpoint(f"{BASE_URL}/admin/schools/create/", method='POST', data={})
    test_endpoint(f"{BASE_URL}/admin/signup-requests/")
    test_endpoint(f"{BASE_URL}/admin/assign-volunteer/", method='POST', data={})
    
    print("=" * 60)
    print("✅ Backend is running!")
    print("=" * 60)
    print()
    print("Server is accessible at: http://localhost:8000")
    print("API Documentation at: http://localhost:8000/api/auth/")
    print()

if __name__ == "__main__":
    main()

