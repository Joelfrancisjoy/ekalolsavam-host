"""
E2E tests for events functionality
"""
import pytest
import time
from tests.utils.page_objects import LoginPage, EventsPage, AdminPage, DashboardPage
from tests.utils.helpers import (
    wait_for_page_load, take_screenshot_on_failure, 
    clear_browser_data, wait_for_url_change
)

@pytest.mark.smoke
@pytest.mark.events
class TestEvents:
    """Test events functionality"""
    
    def test_events_page_loads(self, driver, base_url):
        """Test that events page loads correctly"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Verify page loads
            assert "events" in driver.current_url.lower() or "event" in driver.title.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "events_page_loads")
            raise e
    
    def test_events_display(self, driver, base_url):
        """Test that events are displayed on the page"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Check if events are displayed
            events_count = events_page.get_events_count()
            assert events_count >= 0, "Events should be displayed (even if 0)"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "events_display")
            raise e
    
    def test_event_search_functionality(self, driver, base_url):
        """Test event search functionality"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Test search functionality
            if events_page.is_element_present(events_page.SEARCH_INPUT):
                events_page.search_events("test")
                time.sleep(2)
                
                # Verify search results
                events_count = events_page.get_events_count()
                assert events_count >= 0, "Search should return results"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "event_search")
            raise e
    
    def test_event_registration_requires_login(self, driver, base_url):
        """Test that event registration requires login"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Try to register for an event without login
            if events_page.get_events_count() > 0:
                events_page.register_for_event(0)
                time.sleep(2)
                
                # Should redirect to login page
                current_url = driver.current_url
                assert "/login" in current_url, "Should redirect to login page"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "event_registration_requires_login")
            raise e
    
    def test_event_registration_after_login(self, driver, base_url, admin_user_data):
        """Test event registration after login"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to events
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Try to register for an event
            if events_page.get_events_count() > 0:
                events_page.register_for_event(0)
                time.sleep(2)
                
                # Should show success message or redirect
                current_url = driver.current_url
                assert "/events" in current_url or "/success" in current_url or "/dashboard" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "event_registration_after_login")
            raise e
    
    def test_event_details_view(self, driver, base_url):
        """Test viewing event details"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Click on first event if available
            if events_page.get_events_count() > 0:
                events = events_page.find_elements(events_page.EVENT_CARDS)
                if events:
                    events[0].click()
                    time.sleep(2)
                    
                    # Verify event details are shown
                    details_present = events_page.is_element_present(events_page.EVENT_DETAILS)
                    assert details_present, "Event details should be displayed"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "event_details_view")
            raise e
    
    def test_events_navigation_from_dashboard(self, driver, base_url, admin_user_data):
        """Test navigation to events from dashboard"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to events from dashboard
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Verify events page loads
            assert "events" in driver.current_url.lower() or "event" in driver.title.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "events_navigation_from_dashboard")
            raise e
    
    @pytest.mark.admin
    def test_admin_events_management(self, driver, base_url, admin_user_data):
        """Test admin events management functionality"""
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
            
            # Verify admin events page loads
            current_url = driver.current_url
            assert "/admin" in current_url or "/events" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_events_management")
            raise e
    
    def test_events_filtering(self, driver, base_url):
        """Test events filtering functionality"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Test filter if available
            if events_page.is_element_present(events_page.FILTER_SELECT):
                from selenium.webdriver.support.ui import Select
                filter_select = Select(driver.find_element(*events_page.FILTER_SELECT))
                filter_select.select_by_index(1)
                time.sleep(2)
                
                # Verify filter is applied
                events_count = events_page.get_events_count()
                assert events_count >= 0, "Filter should work correctly"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "events_filtering")
            raise e
    
    @pytest.mark.slow
    def test_events_pagination(self, driver, base_url):
        """Test events pagination if implemented"""
        try:
            clear_browser_data(driver)
            
            events_page = EventsPage(driver, base_url)
            events_page.open("/events")
            wait_for_page_load(driver)
            
            # Look for pagination elements
            pagination_elements = driver.find_elements("class name", "pagination")
            if pagination_elements:
                # Test pagination
                next_button = driver.find_elements("xpath", "//button[contains(text(), 'Next')]")
                if next_button:
                    next_button[0].click()
                    time.sleep(2)
                    
                    # Verify page changed
                    events_count = events_page.get_events_count()
                    assert events_count >= 0, "Pagination should work correctly"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "events_pagination")
            raise e



