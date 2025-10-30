"""
Pytest configuration and fixtures for E2E testing
"""
import os
import sys
import pytest
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from django.core.management import execute_from_command_line
from django.conf import settings
import django
from faker import Faker

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
django.setup()

fake = Faker()

@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """Setup Django database for testing"""
    with django_db_blocker.unblock():
        # Run migrations
        execute_from_command_line(['manage.py', 'migrate', '--run-syncdb'])

@pytest.fixture(scope="session")
def browser_config():
    """Browser configuration for tests"""
    return {
        'headless': os.getenv('HEADLESS', 'False').lower() == 'true',
        'window_size': (1920, 1080),
        'implicit_wait': 10,
        'page_load_timeout': 30
    }

@pytest.fixture(scope="function")
def driver(browser_config):
    """Selenium WebDriver fixture"""
    browser = os.getenv('BROWSER', 'chrome').lower()
    
    if browser == 'chrome':
        options = Options()
        if browser_config['headless']:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size={},{}'.format(*browser_config['window_size']))
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        options.add_argument('--disable-javascript')
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
    elif browser == 'firefox':
        options = FirefoxOptions()
        if browser_config['headless']:
            options.add_argument('--headless')
        options.add_argument('--width={}'.format(browser_config['window_size'][0]))
        options.add_argument('--height={}'.format(browser_config['window_size'][1]))
        
        service = Service(GeckoDriverManager().install())
        driver = webdriver.Firefox(service=service, options=options)
        
    else:
        raise ValueError(f"Unsupported browser: {browser}")
    
    driver.implicitly_wait(browser_config['implicit_wait'])
    driver.set_page_load_timeout(browser_config['page_load_timeout'])
    
    yield driver
    
    driver.quit()

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
        'event_type': fake.random_element(elements=('individual', 'group')),
        'max_participants': fake.random_int(min=10, max=100),
        'registration_fee': fake.random_int(min=0, max=500),
        'start_date': fake.future_date(),
        'end_date': fake.future_date()
    }

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "smoke: mark test as smoke test"
    )
    config.addinivalue_line(
        "markers", "regression: mark test as regression test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

def pytest_html_report_title(report):
    """Customize HTML report title"""
    report.title = "E-Kalolsavam E2E Test Report"

def pytest_configure(config):
    """Configure pytest options"""
    config.addinivalue_line(
        "markers", "smoke: mark test as smoke test"
    )
    config.addinivalue_line(
        "markers", "regression: mark test as regression test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )



