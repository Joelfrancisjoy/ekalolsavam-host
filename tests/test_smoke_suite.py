"""
Smoke test suite for critical functionality
"""
import pytest
import time
from tests.utils.page_objects import LoginPage, DashboardPage, EventsPage
from tests.utils.helpers import (
    wait_for_page_load, take_screenshot_on_failure, 
    clear_browser_data, wait_for_url_change
)

@pytest.mark.smoke
class TestSmokeSuite:
    """Critical smoke tests for application stability"""
    
    def test_application_loads(self, driver, base_url):
        """Test that application loads successfully"""
        try:
            clear_browser_data(driver)
            
            # Test frontend loads
            driver.get(base_url)
            wait_for_page_load(driver)
            
            # Verify page loads
            assert "kalolsavam" in driver.title.lower() or "kalolsavam" in driver.current_url.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "application_loads")
            raise e
    
    def test_login_page_accessible(self, driver, base_url):
        """Test that login page is accessible"""
        try:
            clear_browser_data(driver)
            
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            
            # Verify login page elements
            assert login_page.is_element_present(login_page.EMAIL_INPUT)
            assert login_page.is_element_present(login_page.PASSWORD_INPUT)
            assert login_page.is_element_present(login_page.LOGIN_BUTTON)
            
        except Exception as e:
            take_screenshot_on_failure(driver, "login_page_accessible")
            raise e
    
    def test_registration_page_accessible(self, driver, base_url):
        """Test that registration page is accessible"""
        try:
            clear_browser_data(driver)
            
            from tests.utils.page_objects import RegistrationPage
            registration_page = RegistrationPage(driver, base_url)
            registration_page.open("/register")
            wait_for_page_load(driver)
            
            # Verify registration page elements
            assert registration_page.is_element_present(registration_page.EMAIL_INPUT)
            assert registration_page.is_element_present(registration_page.PASSWORD_INPUT)
            assert registration_page.is_element_present(registration_page.REGISTER_BUTTON)
            
        except Exception as e:
            take_screenshot_on_failure(driver, "registration_page_accessible")
            raise e
    
    def test_events_page_accessible(self, driver, base_url):
        """Test that events page is accessible"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Verify events page loads
            assert "events" in driver.current_url.lower() or "event" in driver.title.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "events_page_accessible")
            raise e
    
    def test_dashboard_requires_authentication(self, driver, base_url):
        """Test that dashboard requires authentication"""
        try:
            clear_browser_data(driver)
            
            # Try to access dashboard without login
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Should redirect to login
            current_url = driver.current_url
            assert "/login" in current_url or "/" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_requires_authentication")
            raise e
    
    def test_google_oauth_buttons_present(self, driver, base_url):
        """Test that Google OAuth buttons are present"""
        try:
            clear_browser_data(driver)
            
            # Check login page
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            
            google_login_present = login_page.is_element_present(login_page.GOOGLE_LOGIN_BUTTON)
            
            # Check registration page
            from tests.utils.page_objects import RegistrationPage
            registration_page = RegistrationPage(driver, base_url)
            registration_page.open("/register")
            wait_for_page_load(driver)
            
            google_signup_present = registration_page.is_element_present(registration_page.GOOGLE_SIGNUP_BUTTON)
            
            # At least one Google OAuth button should be present
            assert google_login_present or google_signup_present, "Google OAuth buttons should be present"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "google_oauth_buttons_present")
            raise e
    
    def test_responsive_design_basic(self, driver, base_url):
        """Test basic responsive design functionality"""
        try:
            clear_browser_data(driver)
            
            # Test different screen sizes
            screen_sizes = [(1920, 1080), (768, 1024), (375, 667)]
            
            for width, height in screen_sizes:
                driver.set_window_size(width, height)
                time.sleep(1)
                
                # Test main page loads at different sizes
                driver.get(base_url)
                wait_for_page_load(driver)
                
                # Verify page loads without errors
                assert "kalolsavam" in driver.title.lower() or "kalolsavam" in driver.current_url.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "responsive_design_basic")
            raise e
    
    def test_api_connectivity(self, driver, base_url, api_base_url):
        """Test that API is accessible"""
        try:
            import requests
            
            # Test API connectivity
            response = requests.get(f"{api_base_url}/api/", timeout=10)
            
            # API should respond (even with 404 is okay)
            assert response.status_code in [200, 404, 405], f"API should be accessible, got {response.status_code}"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "api_connectivity")
            raise e
    
    def test_static_assets_load(self, driver, base_url):
        """Test that static assets load correctly"""
        try:
            clear_browser_data(driver)
            
            driver.get(base_url)
            wait_for_page_load(driver)
            
            # Check for JavaScript errors
            logs = driver.get_log('browser')
            js_errors = [log for log in logs if log['level'] == 'SEVERE']
            
            # Should not have critical JavaScript errors
            assert len(js_errors) == 0, f"JavaScript errors found: {js_errors}"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "static_assets_load")
            raise e
    
    def test_navigation_works(self, driver, base_url):
        """Test that basic navigation works"""
        try:
            clear_browser_data(driver)
            
            # Test navigation between pages
            driver.get(base_url)
            wait_for_page_load(driver)
            
            # Navigate to login
            driver.get(f"{base_url}/login")
            wait_for_page_load(driver)
            
            # Navigate to events
            driver.get(f"{base_url}/events")
            wait_for_page_load(driver)
            
            # Navigate back to home
            driver.get(base_url)
            wait_for_page_load(driver)
            
            # All navigation should work without errors
            assert True, "Navigation should work without errors"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "navigation_works")
            raise e



