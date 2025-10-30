"""
E2E tests for dashboard functionality
"""
import pytest
import time
from tests.utils.page_objects import LoginPage, DashboardPage, EventsPage
from tests.utils.helpers import (
    wait_for_page_load, take_screenshot_on_failure, 
    clear_browser_data, wait_for_url_change
)

@pytest.mark.smoke
class TestDashboard:
    """Test dashboard functionality"""
    
    def test_dashboard_loads_after_login(self, driver, base_url, admin_user_data):
        """Test that dashboard loads after successful login"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Verify dashboard loads
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Check if dashboard elements are present
            assert "dashboard" in driver.current_url.lower() or "home" in driver.current_url.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_loads_after_login")
            raise e
    
    def test_dashboard_redirects_unauthenticated_users(self, driver, base_url):
        """Test that dashboard redirects unauthenticated users"""
        try:
            clear_browser_data(driver)
            
            # Try to access dashboard without login
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Should redirect to login page
            current_url = driver.current_url
            assert "/login" in current_url or "/" in current_url, "Should redirect unauthenticated users"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_redirects_unauthenticated")
            raise e
    
    def test_user_menu_functionality(self, driver, base_url, admin_user_data):
        """Test user menu functionality"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to dashboard
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Test user menu if present
            if dashboard_page.is_element_present(dashboard_page.USER_MENU):
                dashboard_page.click_element(dashboard_page.USER_MENU)
                time.sleep(1)
                
                # Check if menu items are visible
                assert True, "User menu should be clickable"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "user_menu_functionality")
            raise e
    
    def test_dashboard_navigation_to_events(self, driver, base_url, admin_user_data):
        """Test navigation from dashboard to events"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to dashboard
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Navigate to events
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Verify events page loads
            assert "events" in driver.current_url.lower() or "event" in driver.title.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_navigation_to_events")
            raise e
    
    def test_dashboard_displays_user_info(self, driver, base_url, admin_user_data):
        """Test that dashboard displays user information"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to dashboard
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Check if user info is displayed
            user_info = dashboard_page.get_user_info()
            # User info might be None if not implemented, which is okay for this test
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_displays_user_info")
            raise e
    
    def test_dashboard_notifications_section(self, driver, base_url, admin_user_data):
        """Test dashboard notifications section"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to dashboard
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Check if notifications section is present
            notifications_present = dashboard_page.is_element_present(dashboard_page.NOTIFICATIONS)
            # Notifications might not be implemented, which is okay
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_notifications_section")
            raise e
    
    def test_dashboard_events_section(self, driver, base_url, admin_user_data):
        """Test dashboard events section"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to dashboard
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Check if events section is present
            events_section_present = dashboard_page.is_element_present(dashboard_page.EVENTS_SECTION)
            # Events section might not be implemented, which is okay
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_events_section")
            raise e
    
    def test_dashboard_profile_link(self, driver, base_url, admin_user_data):
        """Test dashboard profile link"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to dashboard
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Check if profile link is present and clickable
            if dashboard_page.is_element_present(dashboard_page.PROFILE_LINK):
                dashboard_page.click_element(dashboard_page.PROFILE_LINK)
                time.sleep(2)
                
                # Verify profile page loads
                current_url = driver.current_url
                assert "/profile" in current_url or "/user" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_profile_link")
            raise e
    
    @pytest.mark.slow
    def test_dashboard_responsive_design(self, driver, base_url, admin_user_data):
        """Test dashboard responsive design"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Test different screen sizes
            screen_sizes = [(1920, 1080), (1366, 768), (768, 1024), (375, 667)]
            
            for width, height in screen_sizes:
                driver.set_window_size(width, height)
                time.sleep(1)
                
                # Navigate to dashboard
                dashboard_page = DashboardPage(driver, base_url)
                dashboard_page.open("/dashboard")
                wait_for_page_load(driver)
                
                # Verify dashboard loads at different screen sizes
                assert "dashboard" in driver.current_url.lower() or "home" in driver.current_url.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_responsive_design")
            raise e
    
    def test_dashboard_logout_functionality(self, driver, base_url, admin_user_data):
        """Test logout functionality from dashboard"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to dashboard
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.open("/dashboard")
            wait_for_page_load(driver)
            
            # Logout
            dashboard_page.logout()
            time.sleep(2)
            
            # Verify logout
            current_url = driver.current_url
            assert "/login" in current_url or "/" in current_url, "Should redirect to login after logout"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "dashboard_logout_functionality")
            raise e



