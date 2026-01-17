#!/usr/bin/env python
"""
Test script to verify that the student_scores endpoint is working properly
"""
import os
import sys
import django
from django.conf import settings
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from scores.views import student_scores
from rest_framework.test import APIRequestFactory
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import AnonymousUser

# Add the parent directory to sys.path to import Django modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
django.setup()


def test_student_scores_endpoint():
    """Test the student_scores endpoint with different scenarios"""
    from rest_framework.test import APIRequestFactory
    from scores.views import student_scores
    from django.contrib.auth import get_user_model

    User = get_user_model()
    factory = APIRequestFactory()

    # Create a test student user
    try:
        student_user = User.objects.get(username='test_student')
    except User.DoesNotExist:
        student_user = User.objects.create_user(
            username='test_student',
            email='student@test.com',
            password='testpass123',
            role='student'
        )

    # Test 1: Non-student user trying to access endpoint
    print("Test 1: Non-student user access")
    try:
        # Create a judge user
        judge_user = User.objects.create_user(
            username='test_judge',
            email='judge@test.com',
            password='testpass123',
            role='judge'
        )

        # Create a request
        request = factory.get('/api/scores/student/')
        request.user = judge_user

        # Call the view
        response = student_scores(request)
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.data}")
    except Exception as e:
        print(f"  Error: {e}")

    print("\nTest 2: Student user access")
    try:
        # Create a request for a student
        request = factory.get('/api/scores/student/')
        request.user = student_user

        # Call the view
        response = student_scores(request)
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.data}")
    except Exception as e:
        print(f"  Error: {e}")

    # Clean up test users
    try:
        student_user.delete()
        User.objects.filter(username='test_judge').delete()
    except:
        pass


if __name__ == "__main__":
    test_student_scores_endpoint()
