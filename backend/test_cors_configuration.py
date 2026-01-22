#!/usr/bin/env python
"""
Test script to verify CORS configuration is working correctly.
"""

import requests
import json

def test_cors_configuration():
    """Test CORS configuration for various scenarios."""
    
    base_url = 'http://localhost:8000'
    frontend_origin = 'http://localhost:3000'
    
    print("🔍 Testing CORS Configuration...")
    print("=" * 50)
    
    # Test 1: OPTIONS preflight request
    print("\n1. Testing OPTIONS preflight request:")
    try:
        response = requests.options(
            f'{base_url}/api/auth/login/',
            headers={
                'Origin': frontend_origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, Authorization'
            }
        )
        
        print(f"   Status: {response.status_code}")
        
        cors_headers = {k: v for k, v in response.headers.items() 
                       if 'access-control' in k.lower()}
        
        for header, value in cors_headers.items():
            print(f"   {header}: {value}")
            
        if response.status_code == 200 and 'access-control-allow-origin' in cors_headers:
            print("   ✅ OPTIONS preflight: PASSED")
        else:
            print("   ❌ OPTIONS preflight: FAILED")
            
    except Exception as e:
        print(f"   ❌ OPTIONS preflight: ERROR - {e}")
    
    # Test 2: POST request with credentials
    print("\n2. Testing POST request with credentials:")
    try:
        response = requests.post(
            f'{base_url}/api/auth/login/',
            headers={
                'Origin': frontend_origin,
                'Content-Type': 'application/json'
            },
            json={'username': 'test', 'password': 'test'}
        )
        
        print(f"   Status: {response.status_code}")
        
        cors_headers = {k: v for k, v in response.headers.items() 
                       if 'access-control' in k.lower()}
        
        for header, value in cors_headers.items():
            print(f"   {header}: {value}")
            
        if 'access-control-allow-origin' in cors_headers:
            print("   ✅ POST with credentials: PASSED")
        else:
            print("   ❌ POST with credentials: FAILED")
            
    except Exception as e:
        print(f"   ❌ POST with credentials: ERROR - {e}")
    
    # Test 3: GET request with Authorization header
    print("\n3. Testing GET request with Authorization header:")
    try:
        response = requests.get(
            f'{base_url}/api/auth/current/',
            headers={
                'Origin': frontend_origin,
                'Authorization': 'Bearer test-token'
            }
        )
        
        print(f"   Status: {response.status_code}")
        
        cors_headers = {k: v for k, v in response.headers.items() 
                       if 'access-control' in k.lower()}
        
        for header, value in cors_headers.items():
            print(f"   {header}: {value}")
            
        if 'access-control-allow-origin' in cors_headers:
            print("   ✅ GET with Authorization: PASSED")
        else:
            print("   ❌ GET with Authorization: FAILED")
            
    except Exception as e:
        print(f"   ❌ GET with Authorization: ERROR - {e}")
    
    # Test 4: Health check endpoint
    print("\n4. Testing health check endpoint:")
    try:
        response = requests.get(
            f'{base_url}/api/health/',
            headers={'Origin': frontend_origin}
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            health_data = response.json()
            print(f"   System Status: {health_data.get('status', 'unknown')}")
            
            cors_check = health_data.get('checks', {}).get('cors', {})
            if cors_check.get('status') == 'healthy':
                print("   ✅ Health check CORS: PASSED")
            else:
                print("   ⚠️  Health check CORS: WARNING")
        else:
            print("   ❌ Health check: FAILED")
            
    except Exception as e:
        print(f"   ❌ Health check: ERROR - {e}")
    
    # Test 5: Different origins (should be rejected)
    print("\n5. Testing unauthorized origin:")
    try:
        response = requests.options(
            f'{base_url}/api/auth/login/',
            headers={
                'Origin': 'http://unauthorized-origin.com',
                'Access-Control-Request-Method': 'POST'
            }
        )
        
        print(f"   Status: {response.status_code}")
        
        cors_headers = {k: v for k, v in response.headers.items() 
                       if 'access-control' in k.lower()}
        
        if not cors_headers or 'http://unauthorized-origin.com' not in cors_headers.get('access-control-allow-origin', ''):
            print("   ✅ Unauthorized origin rejected: PASSED")
        else:
            print("   ❌ Unauthorized origin rejected: FAILED")
            
    except Exception as e:
        print(f"   ❌ Unauthorized origin test: ERROR - {e}")
    
    print("\n" + "=" * 50)
    print("🎯 CORS Configuration Test Complete")
    print("\nNext steps:")
    print("1. If all tests passed, CORS is properly configured")
    print("2. If any tests failed, check Django CORS settings")
    print("3. Restart backend server if you made changes")
    print("4. Clear browser cache and test frontend")

if __name__ == '__main__':
    test_cors_configuration()