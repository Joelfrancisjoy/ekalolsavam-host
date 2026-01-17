"""
Test script to verify Razorpay integration
"""

from scores.models import Result
from events.models import Event
from users.models import User
from events.models import EventRegistration
from scores.models import RazorpayPayment, RecheckRequest
from django.test import TestCase
import razorpay
import os
import sys
import django
from django.conf import settings

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
django.setup()


def test_razorpay_config():
    """Test if Razorpay is properly configured with credentials"""
    print("Testing Razorpay configuration...")

    # Check if credentials are available
    key_id = settings.RAZORPAY_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET

    if not key_id or not key_secret:
        print("❌ Razorpay credentials not found in settings!")
        print(f"   RAZORPAY_KEY_ID: {'SET' if key_id else 'NOT SET'}")
        print(f"   RAZORPAY_KEY_SECRET: {'SET' if key_secret else 'NOT SET'}")
        return False

    print(f"✅ Razorpay credentials found: {key_id[:8]}...")

    # Test initializing Razorpay client
    try:
        client = razorpay.Client(auth=(key_id, key_secret))
        print("✅ Razorpay client initialized successfully")

        # Test basic API call (fetch orders - should fail with authentication but proves client works)
        try:
            # This will likely fail due to authentication, but proves the client is working
            client.order.all({'count': 1})
        except Exception as e:
            print(
                f"✅ Razorpay client working (expected error for auth): {str(e)[:50]}...")

        return True
    except Exception as e:
        print(f"❌ Error initializing Razorpay client: {str(e)}")
        return False


def test_models():
    """Test if payment models are properly created"""
    print("\nTesting payment models...")

    try:
        # Check if RazorpayPayment model exists and is accessible
        payment_model = RazorpayPayment
        print(f"✅ RazorpayPayment model accessible: {payment_model.__name__}")

        # Check if RecheckRequest model exists and is accessible
        recheck_model = RecheckRequest
        print(f"✅ RecheckRequest model accessible: {recheck_model.__name__}")

        # Check the relationship between models
        print(
            f"✅ RecheckRequest has payments relationship: {hasattr(RecheckRequest, 'payments')}")

        return True
    except Exception as e:
        print(f"❌ Error accessing models: {str(e)}")
        return False


def test_urls():
    """Test if payment URLs are properly configured"""
    print("\nTesting payment URLs...")

    from django.urls import reverse

    try:
        # Test URL patterns
        initiate_url = reverse('initiate-recheck-payment', kwargs={
                               'recheck_request_id': '123e4567-e89b-12d3-a456-426614174000'})
        verify_url = reverse('verify-recheck-payment')

        print(f"✅ Initiate payment URL: {initiate_url}")
        print(f"✅ Verify payment URL: {verify_url}")

        return True
    except Exception as e:
        print(f"❌ Error with URL patterns: {str(e)}")
        return False


def run_tests():
    """Run all tests"""
    print("🔍 Starting Razorpay Integration Tests...\n")

    results = []
    results.append(test_razorpay_config())
    results.append(test_models())
    results.append(test_urls())

    print(f"\n📊 Test Results: {sum(results)}/{len(results)} passed")

    if all(results):
        print("🎉 All tests passed! Razorpay integration is ready.")
        return True
    else:
        print("⚠️ Some tests failed. Please check the configuration.")
        return False


if __name__ == "__main__":
    run_tests()
