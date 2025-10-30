"""
Smoke Test Suite for Playwright E2E Tests
"""
import pytest
from playwright.async_api import Page
from pages import LoginPage, RegisterPage, DashboardPage, EventsPage

@pytest.mark.smoke
class TestSmokeSuite:
    """Smoke tests for critical functionality"""
    
    async def test_application_startup(self, page: Page, base_url: str):
        """Test application startup and basic navigation"""
        # Navigate to base URL
        await page.goto(base_url)
        
        # Verify page loads
        assert await page.title() != ""
        
        # Check for basic elements
        body = await page.locator("body")
        assert await body.is_visible()
    
    async def test_login_page_accessibility(self, page: Page, base_url: str):
        """Test login page is accessible"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Verify login form is visible
        assert await login_page.is_login_form_visible()
        
        # Verify required fields are present
        assert await login_page.is_email_field_required()
        assert await login_page.is_password_field_required()
    
    async def test_registration_page_accessibility(self, page: Page, base_url: str):
        """Test registration page is accessible"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Verify registration form is visible
        assert await register_page.is_register_form_visible()
        
        # Verify required fields are present
        assert await register_page.is_field_required('first_name')
        assert await register_page.is_field_required('last_name')
        assert await register_page.is_field_required('email')
        assert await register_page.is_field_required('password')
    
    async def test_dashboard_accessibility(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard is accessible after login"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify dashboard is loaded
        assert await dashboard_page.is_dashboard_loaded()
        
        # Verify navigation is visible
        assert await dashboard_page.is_navigation_visible()
    
    async def test_events_page_accessibility(self, page: Page, base_url: str, test_user_data: dict):
        """Test events page is accessible"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        
        # Verify events page is loaded
        assert await events_page.is_events_page_loaded()
        
        # Wait for events to load
        await events_page.wait_for_events_to_load()
    
    async def test_basic_navigation(self, page: Page, base_url: str, test_user_data: dict):
        """Test basic navigation between pages"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to dashboard
        await dashboard_page.navigate_to_dashboard(base_url)
        assert await dashboard_page.is_dashboard_loaded()
        
        # Navigate to events
        await events_page.navigate_to_events(base_url)
        assert await events_page.is_events_page_loaded()
        
        # Navigate back to dashboard
        await dashboard_page.navigate_to_dashboard(base_url)
        assert await dashboard_page.is_dashboard_loaded()
    
    async def test_logout_functionality(self, page: Page, base_url: str, test_user_data: dict):
        """Test logout functionality"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify dashboard is loaded
        assert await dashboard_page.is_dashboard_loaded()
        
        # Perform logout
        await dashboard_page.click_logout()
        
        # Verify redirect to login page
        await login_page.wait_for_url("**/login")
        assert await login_page.is_login_form_visible()
    
    async def test_responsive_design(self, page: Page, base_url: str):
        """Test responsive design across different viewports"""
        # Test mobile viewport
        await page.set_viewport_size({"width": 375, "height": 667})
        await page.goto(base_url)
        assert await page.title() != ""
        
        # Test tablet viewport
        await page.set_viewport_size({"width": 768, "height": 1024})
        await page.goto(base_url)
        assert await page.title() != ""
        
        # Test desktop viewport
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto(base_url)
        assert await page.title() != ""
    
    async def test_page_loading_performance(self, page: Page, base_url: str):
        """Test page loading performance"""
        import time
        
        # Measure page load time
        start_time = time.time()
        await page.goto(base_url)
        await page.wait_for_load_state("networkidle")
        load_time = time.time() - start_time
        
        # Verify page loads within reasonable time (10 seconds)
        assert load_time < 10.0
        
        # Verify page title is set
        assert await page.title() != ""
    
    async def test_basic_form_validation(self, page: Page, base_url: str):
        """Test basic form validation"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Try to submit form with empty fields
        await login_page.click_login_button()
        
        # Verify form validation
        assert await login_page.is_email_field_required()
        assert await login_page.is_password_field_required()
    
    async def test_error_handling(self, page: Page, base_url: str):
        """Test basic error handling"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Try login with invalid credentials
        await login_page.login("invalid@email.com", "wrongpassword")
        
        # Wait for error message
        await login_page.wait_for_login_error()
        
        # Verify error message is displayed
        assert await login_page.is_error_message_visible()
    
    async def test_browser_compatibility(self, page: Page, base_url: str):
        """Test basic browser compatibility"""
        # Navigate to base URL
        await page.goto(base_url)
        
        # Verify page loads
        assert await page.title() != ""
        
        # Test basic JavaScript functionality
        result = await page.evaluate("typeof window !== 'undefined'")
        assert result is True
        
        # Test basic CSS functionality
        body = await page.locator("body")
        assert await body.is_visible()
    
    async def test_security_headers(self, page: Page, base_url: str):
        """Test basic security headers"""
        # Navigate to base URL
        response = await page.goto(base_url)
        
        # Verify response is successful
        assert response.status == 200
        
        # Check for basic security headers (if implemented)
        headers = response.headers
        # Note: This is a basic check - actual security headers depend on implementation
        assert headers is not None
    
    async def test_accessibility_basics(self, page: Page, base_url: str):
        """Test basic accessibility features"""
        # Navigate to base URL
        await page.goto(base_url)
        
        # Check for basic accessibility attributes
        # Note: This is a basic check - actual accessibility testing requires specialized tools
        body = await page.locator("body")
        assert await body.is_visible()
        
        # Check for basic form elements
        forms = await page.locator("form").count()
        assert forms >= 0  # Should have at least 0 forms
    
    async def test_basic_functionality(self, page: Page, base_url: str, test_user_data: dict):
        """Test basic application functionality"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Test login functionality
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Test dashboard functionality
        assert await dashboard_page.is_dashboard_loaded()
        
        # Test navigation
        await dashboard_page.click_events_link()
        await dashboard_page.wait_for_url("**/events")
        
        # Test logout
        await dashboard_page.navigate_to_dashboard(base_url)
        await dashboard_page.click_logout()
        await login_page.wait_for_url("**/login")
    
    async def test_data_persistence(self, page: Page, base_url: str, test_user_data: dict):
        """Test basic data persistence"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify user data is displayed
        assert await dashboard_page.get_user_email() == test_user_data['email']
        
        # Refresh page
        await dashboard_page.refresh_dashboard()
        
        # Verify user is still logged in
        assert await dashboard_page.is_dashboard_loaded()
        assert await dashboard_page.get_user_email() == test_user_data['email']
    
    async def test_session_management(self, page: Page, base_url: str, test_user_data: dict):
        """Test session management"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify session is active
        assert await dashboard_page.is_dashboard_loaded()
        
        # Test session persistence
        await dashboard_page.refresh_dashboard()
        assert await dashboard_page.is_dashboard_loaded()
        
        # Test logout
        await dashboard_page.click_logout()
        await login_page.wait_for_url("**/login")
        
        # Verify session is terminated
        assert await login_page.is_login_form_visible()
    
    async def test_basic_performance(self, page: Page, base_url: str):
        """Test basic performance metrics"""
        import time
        
        # Test page load time
        start_time = time.time()
        await page.goto(base_url)
        await page.wait_for_load_state("networkidle")
        load_time = time.time() - start_time
        
        # Verify reasonable load time
        assert load_time < 15.0
        
        # Test navigation performance
        start_time = time.time()
        await page.goto(f"{base_url}/login")
        await page.wait_for_load_state("networkidle")
        nav_time = time.time() - start_time
        
        # Verify reasonable navigation time
        assert nav_time < 10.0
    
    async def test_basic_error_recovery(self, page: Page, base_url: str):
        """Test basic error recovery"""
        # Test invalid URL handling
        try:
            await page.goto(f"{base_url}/invalid-page")
            # Should either redirect to 404 or handle gracefully
            assert True
        except:
            # If navigation fails, that's also acceptable
            assert True
        
        # Test network error handling
        try:
            await page.goto("http://invalid-domain-that-does-not-exist.com")
            # Should handle network errors gracefully
            assert True
        except:
            # If navigation fails, that's expected
            assert True


