"""
E2E tests for authentication functionality
"""
import pytest
import time
from tests.utils.page_objects import LoginPage, RegistrationPage, DashboardPage
from tests.utils.helpers import (
    wait_for_page_load, take_screenshot_on_failure, 
    clear_browser_data, wait_for_url_change
)

@pytest.mark.smoke
@pytest.mark.login
class TestAuthentication:
    """Test authentication flows"""
    
    def test_user_registration_success(self, driver, base_url, test_user_data):
        """Test successful user registration"""
        try:
            # Clear browser data
            clear_browser_data(driver)
            
            # Navigate to registration page
            registration_page = RegistrationPage(driver, base_url)
            registration_page.open("/register")
            wait_for_page_load(driver)
            
            # Fill registration form
            registration_page.register(test_user_data)
            
            # Wait for redirect or success message
            time.sleep(3)
            
            # Verify registration success
            current_url = driver.current_url
            assert "/login" in current_url or "/dashboard" in current_url or "/success" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "user_registration_success")
            raise e
    
    def test_user_registration_validation_errors(self, driver, base_url):
        """Test registration form validation"""
        try:
            clear_browser_data(driver)
            
            registration_page = RegistrationPage(driver, base_url)
            registration_page.open("/register")
            wait_for_page_load(driver)
            
            # Try to register with invalid data
            invalid_data = {
                'email': 'invalid-email',
                'password': '123',
                'first_name': '',
                'last_name': '',
                'phone': 'invalid',
                'college': '',
                'role': 'student'
            }
            
            registration_page.register(invalid_data)
            time.sleep(2)
            
            # Check for validation errors
            error_elements = driver.find_elements("class name", "error")
            assert len(error_elements) > 0, "Validation errors should be displayed"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "registration_validation_errors")
            raise e
    
    def test_user_login_success(self, driver, base_url, admin_user_data):
        """Test successful user login"""
        try:
            clear_browser_data(driver)
            
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            
            # Perform login
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            
            # Wait for redirect
            time.sleep(3)
            
            # Verify login success
            current_url = driver.current_url
            assert "/dashboard" in current_url or "/home" in current_url
            
            # Verify user is logged in
            dashboard_page = DashboardPage(driver, base_url)
            user_info = dashboard_page.get_user_info()
            assert user_info is not None, "User should be logged in"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "user_login_success")
            raise e
    
    def test_user_login_invalid_credentials(self, driver, base_url):
        """Test login with invalid credentials"""
        try:
            clear_browser_data(driver)
            
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            
            # Try login with invalid credentials
            login_page.login("invalid@email.com", "wrongpassword")
            time.sleep(2)
            
            # Check for error message
            error_message = login_page.get_error_message()
            assert error_message is not None, "Error message should be displayed"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "login_invalid_credentials")
            raise e
    
    def test_user_logout(self, driver, base_url, admin_user_data):
        """Test user logout functionality"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Logout
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.logout()
            time.sleep(2)
            
            # Verify logout
            current_url = driver.current_url
            assert "/login" in current_url or "/" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "user_logout")
            raise e
    
    def test_google_login_button_present(self, driver, base_url):
        """Test that Google login button is present"""
        try:
            clear_browser_data(driver)
            
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            
            # Check if Google login button is present
            google_button_present = login_page.is_element_present(login_page.GOOGLE_LOGIN_BUTTON)
            assert google_button_present, "Google login button should be present"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "google_login_button_present")
            raise e
    
    def test_google_signup_button_present(self, driver, base_url):
        """Test that Google signup button is present"""
        try:
            clear_browser_data(driver)
            
            registration_page = RegistrationPage(driver, base_url)
            registration_page.open("/register")
            wait_for_page_load(driver)
            
            # Check if Google signup button is present
            google_button_present = registration_page.is_element_present(registration_page.GOOGLE_SIGNUP_BUTTON)
            assert google_button_present, "Google signup button should be present"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "google_signup_button_present")
            raise e
    
    @pytest.mark.slow
    def test_session_persistence(self, driver, base_url, admin_user_data):
        """Test that user session persists across page refreshes"""
        try:
            clear_browser_data(driver)
            
            # Login
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Refresh page
            driver.refresh()
            wait_for_page_load(driver)
            
            # Verify user is still logged in
            dashboard_page = DashboardPage(driver, base_url)
            user_info = dashboard_page.get_user_info()
            assert user_info is not None, "User should remain logged in after refresh"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "session_persistence")
            raise e



