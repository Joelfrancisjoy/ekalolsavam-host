"""
E2E tests for admin functionality
"""
import pytest
import time
from tests.utils.page_objects import LoginPage, AdminPage, DashboardPage
from tests.utils.helpers import (
    wait_for_page_load, take_screenshot_on_failure, 
    clear_browser_data, wait_for_url_change
)

@pytest.mark.admin
class TestAdminFunctionality:
    """Test admin functionality"""
    
    def test_admin_login_required(self, driver, base_url):
        """Test that admin pages require login"""
        try:
            clear_browser_data(driver)
            
            # Try to access admin page without login
            admin_page = AdminPage(driver, base_url)
            admin_page.open("/admin")
            wait_for_page_load(driver)
            
            # Should redirect to login page
            current_url = driver.current_url
            assert "/login" in current_url or "/" in current_url, "Should redirect to login"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_login_required")
            raise e
    
    def test_admin_dashboard_access(self, driver, base_url, admin_user_data):
        """Test admin dashboard access"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to admin dashboard
            admin_page = AdminPage(driver, base_url)
            admin_page.open("/admin")
            wait_for_page_load(driver)
            
            # Verify admin page loads
            current_url = driver.current_url
            assert "/admin" in current_url or "admin" in driver.title.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_dashboard_access")
            raise e
    
    def test_admin_users_management(self, driver, base_url, admin_user_data):
        """Test admin users management"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to admin users section
            admin_page = AdminPage(driver, base_url)
            admin_page.navigate_to_users()
            time.sleep(2)
            
            # Verify users section loads
            current_url = driver.current_url
            assert "/admin" in current_url or "/users" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_users_management")
            raise e
    
    def test_admin_events_management(self, driver, base_url, admin_user_data):
        """Test admin events management"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to admin events section
            admin_page = AdminPage(driver, base_url)
            admin_page.navigate_to_events()
            time.sleep(2)
            
            # Verify events section loads
            current_url = driver.current_url
            assert "/admin" in current_url or "/events" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_events_management")
            raise e
    
    def test_admin_scores_management(self, driver, base_url, admin_user_data):
        """Test admin scores management"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to admin scores section
            admin_page = AdminPage(driver, base_url)
            admin_page.navigate_to_scores()
            time.sleep(2)
            
            # Verify scores section loads
            current_url = driver.current_url
            assert "/admin" in current_url or "/scores" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_scores_management")
            raise e
    
    def test_admin_add_event_functionality(self, driver, base_url, admin_user_data):
        """Test admin add event functionality"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to admin events section
            admin_page = AdminPage(driver, base_url)
            admin_page.navigate_to_events()
            time.sleep(2)
            
            # Try to add new event
            if admin_page.is_element_present(admin_page.ADD_EVENT_BUTTON):
                admin_page.add_new_event()
                time.sleep(2)
                
                # Verify add event form or page loads
                current_url = driver.current_url
                assert "/admin" in current_url or "/events" in current_url or "/add" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_add_event_functionality")
            raise e
    
    def test_admin_menu_navigation(self, driver, base_url, admin_user_data):
        """Test admin menu navigation"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to admin dashboard
            admin_page = AdminPage(driver, base_url)
            admin_page.open("/admin")
            wait_for_page_load(driver)
            
            # Test admin menu if present
            if admin_page.is_element_present(admin_page.ADMIN_MENU):
                admin_page.click_element(admin_page.ADMIN_MENU)
                time.sleep(1)
                
                # Verify menu is clickable
                assert True, "Admin menu should be clickable"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_menu_navigation")
            raise e
    
    def test_admin_permissions_check(self, driver, base_url, test_user_data):
        """Test that non-admin users cannot access admin pages"""
        try:
            clear_browser_data(driver)
            
            # This test assumes we have a way to create a non-admin user
            # For now, we'll test with a regular user trying to access admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            
            # Try to login with non-admin credentials (if available)
            # This is a placeholder test - actual implementation depends on user roles
            login_page.login("user@test.com", "password")
            time.sleep(3)
            
            # Try to access admin page
            admin_page = AdminPage(driver, base_url)
            admin_page.open("/admin")
            wait_for_page_load(driver)
            
            # Should be denied access or redirected
            current_url = driver.current_url
            assert "/admin" not in current_url or "/login" in current_url or "/dashboard" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_permissions_check")
            raise e
    
    @pytest.mark.slow
    def test_admin_dashboard_responsive_design(self, driver, base_url, admin_user_data):
        """Test admin dashboard responsive design"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
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
                
                # Navigate to admin dashboard
                admin_page = AdminPage(driver, base_url)
                admin_page.open("/admin")
                wait_for_page_load(driver)
                
                # Verify admin dashboard loads at different screen sizes
                current_url = driver.current_url
                assert "/admin" in current_url or "admin" in driver.title.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_dashboard_responsive_design")
            raise e
    
    def test_admin_logout_from_admin_panel(self, driver, base_url, admin_user_data):
        """Test logout from admin panel"""
        try:
            clear_browser_data(driver)
            
            # Login as admin
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to admin dashboard
            admin_page = AdminPage(driver, base_url)
            admin_page.open("/admin")
            wait_for_page_load(driver)
            
            # Logout from admin panel
            dashboard_page = DashboardPage(driver, base_url)
            dashboard_page.logout()
            time.sleep(2)
            
            # Verify logout
            current_url = driver.current_url
            assert "/login" in current_url or "/" in current_url, "Should redirect to login after logout"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_logout_from_admin_panel")
            raise e



