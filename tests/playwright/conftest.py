"""
Playwright E2E Testing Configuration
"""
import os
import sys
import pytest
import asyncio
from playwright.async_api import async_playwright
from faker import Faker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

fake = Faker()

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def browser_context_args():
    """Browser context arguments for all tests"""
    return {
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
        "record_video_dir": "../reports/videos/",
        "record_video_size": {"width": 1920, "height": 1080}
    }

@pytest.fixture(scope="session")
async def browser_type_launch_args():
    """Browser launch arguments"""
    return {
        "headless": os.getenv('HEADLESS', 'false').lower() == 'true',
        "slow_mo": int(os.getenv('SLOW_MO', '0')),
        "args": [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images'
        ]
    }

@pytest.fixture
def base_url():
    """Base URL for the application"""
    return os.getenv('BASE_URL', 'http://localhost:3000')

@pytest.fixture
def api_base_url():
    """API base URL"""
    return os.getenv('API_BASE_URL', 'http://localhost:8000')

@pytest.fixture
def test_user_data():
    """Generate test user data"""
    return {
        'email': fake.email(),
        'password': fake.password(length=12),
        'first_name': fake.first_name(),
        'last_name': fake.last_name(),
        'phone': fake.phone_number()[:10],
        'college': fake.company(),
        'role': 'student'
    }

@pytest.fixture
def admin_user_data():
    """Generate admin user data"""
    return {
        'email': 'admin@test.com',
        'password': 'admin123',
        'first_name': 'Admin',
        'last_name': 'User',
        'role': 'admin'
    }

@pytest.fixture
def event_data():
    """Generate test event data"""
    return {
        'name': fake.catch_phrase(),
        'description': fake.text(max_nb_chars=200),
        'category': fake.random_element(elements=('dance', 'music', 'theatre', 'literary', 'visual_arts')),
        'max_participants': fake.random_int(min=10, max=100),
        'date': fake.future_date(),
        'start_time': '10:00',
        'end_time': '12:00'
    }

@pytest.fixture
def screenshot_dir():
    """Screenshot directory path"""
    return "tests/reports/screenshots/"

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "smoke: mark test as smoke test")
    config.addinivalue_line("markers", "regression: mark test as regression test")
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "login: mark test as login related")
    config.addinivalue_line("markers", "registration: mark test as registration related")
    config.addinivalue_line("markers", "events: mark test as events related")
    config.addinivalue_line("markers", "scoring: mark test as scoring related")
    config.addinivalue_line("markers", "admin: mark test as admin related")

def pytest_html_report_title(report):
    """Customize HTML report title"""
    report.title = "E-Kalolsavam Playwright E2E Test Report"

@pytest.hookimpl(tryfirst=True)
def pytest_configure(config):
    """Configure pytest options"""
    # Create reports directory
    os.makedirs("../reports", exist_ok=True)
    os.makedirs("../reports/screenshots", exist_ok=True)
    os.makedirs("../reports/videos", exist_ok=True)
    os.makedirs("../reports/allure-results", exist_ok=True)
