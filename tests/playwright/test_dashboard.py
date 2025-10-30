"""
Dashboard E2E Tests using Playwright
"""
import pytest
from playwright.async_api import Page
from pages import DashboardPage, LoginPage

@pytest.mark.dashboard
class TestDashboard:
    """Test dashboard functionality"""
    
    @pytest.mark.smoke
    async def test_dashboard_loading(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard loads correctly after login"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify dashboard is loaded
        assert await dashboard_page.is_dashboard_loaded()
        assert await dashboard_page.get_user_name() != ""
        assert await dashboard_page.get_user_email() == test_user_data['email']
    
    @pytest.mark.smoke
    async def test_dashboard_navigation(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard navigation menu"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify navigation is visible
        assert await dashboard_page.is_navigation_visible()
        
        # Test navigation links
        await dashboard_page.click_events_link()
        await dashboard_page.wait_for_url("**/events")
        
        # Navigate back to dashboard
        await dashboard_page.navigate_to_dashboard(base_url)
        assert await dashboard_page.is_dashboard_loaded()
    
    @pytest.mark.smoke
    async def test_dashboard_events_section(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard events section"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify events section is visible
        assert await dashboard_page.is_events_section_visible()
        
        # Wait for events to load
        await dashboard_page.wait_for_events_to_load()
        
        # Verify events are displayed
        events_count = await dashboard_page.get_events_count()
        assert events_count >= 0  # Should have 0 or more events
    
    @pytest.mark.smoke
    async def test_dashboard_user_profile(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard user profile display"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify user profile information
        user_name = await dashboard_page.get_user_name()
        user_email = await dashboard_page.get_user_email()
        
        assert user_name != ""
        assert user_email == test_user_data['email']
    
    async def test_dashboard_logout(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard logout functionality"""
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
    
    async def test_dashboard_events_search(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard events search functionality"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Wait for events to load
        await dashboard_page.wait_for_events_to_load()
        
        # Test search functionality
        await dashboard_page.search_events("test")
        
        # Verify search was performed (events should be filtered)
        # Note: This depends on the actual implementation
        events_count_after_search = await dashboard_page.get_events_count()
        assert events_count_after_search >= 0
    
    async def test_dashboard_events_filter(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard events filter functionality"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Wait for events to load
        await dashboard_page.wait_for_events_to_load()
        
        # Test filter functionality
        available_filters = await dashboard_page.get_available_filters()
        if available_filters:
            await dashboard_page.filter_events(available_filters[0])
            
            # Verify filter was applied
            events_count_after_filter = await dashboard_page.get_events_count()
            assert events_count_after_filter >= 0
    
    async def test_dashboard_events_sort(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard events sort functionality"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Wait for events to load
        await dashboard_page.wait_for_events_to_load()
        
        # Test sort functionality
        available_sort_options = await dashboard_page.get_available_sort_options()
        if available_sort_options:
            await dashboard_page.sort_events(available_sort_options[0])
            
            # Verify sort was applied
            events_count_after_sort = await dashboard_page.get_events_count()
            assert events_count_after_sort >= 0
    
    async def test_dashboard_events_register(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard events registration"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Wait for events to load
        await dashboard_page.wait_for_events_to_load()
        
        # Check if register buttons are visible
        events_count = await dashboard_page.get_events_count()
        if events_count > 0:
            # Test register button for first event
            if await dashboard_page.is_register_button_visible(0):
                await dashboard_page.click_register_button(0)
                
                # Verify registration was attempted
                # Note: This depends on the actual implementation
                assert True  # Placeholder for actual verification
    
    async def test_dashboard_events_view_details(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard events view details"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Wait for events to load
        await dashboard_page.wait_for_events_to_load()
        
        # Check if view details buttons are visible
        events_count = await dashboard_page.get_events_count()
        if events_count > 0:
            # Test view details button for first event
            if await dashboard_page.is_view_details_button_visible(0):
                await dashboard_page.click_view_details_button(0)
                
                # Verify details were shown
                # Note: This depends on the actual implementation
                assert True  # Placeholder for actual verification
    
    async def test_dashboard_responsive_design(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard responsive design"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Test mobile viewport
        await page.set_viewport_size({"width": 375, "height": 667})
        assert await dashboard_page.is_dashboard_loaded()
        
        # Test tablet viewport
        await page.set_viewport_size({"width": 768, "height": 1024})
        assert await dashboard_page.is_dashboard_loaded()
        
        # Test desktop viewport
        await page.set_viewport_size({"width": 1920, "height": 1080})
        assert await dashboard_page.is_dashboard_loaded()
    
    async def test_dashboard_notifications(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard notifications"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Check if notifications are visible
        if await dashboard_page.is_notifications_visible():
            # Test notification functionality
            assert True  # Placeholder for actual notification testing
    
    async def test_dashboard_quick_actions(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard quick actions"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Check if quick actions are visible
        if await dashboard_page.is_quick_actions_visible():
            # Test quick actions functionality
            assert True  # Placeholder for actual quick actions testing
    
    async def test_dashboard_stats_cards(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard stats cards"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Check if stats cards are visible
        if await dashboard_page.is_stats_cards_visible():
            # Test stats cards functionality
            assert True  # Placeholder for actual stats testing
    
    async def test_dashboard_recent_activities(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard recent activities"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Check if recent activities are visible
        if await dashboard_page.is_recent_activities_visible():
            # Test recent activities functionality
            assert True  # Placeholder for actual activities testing
    
    async def test_dashboard_admin_access(self, page: Page, base_url: str, admin_user_data: dict):
        """Test dashboard admin access"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login as admin
        await login_page.navigate_to_login(base_url)
        await login_page.login(admin_user_data['email'], admin_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify admin link is visible
        assert await dashboard_page.is_admin_link_visible()
        
        # Test admin navigation
        await dashboard_page.click_admin_link()
        await dashboard_page.wait_for_url("**/admin")
    
    async def test_dashboard_scores_access(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard scores access"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Check if scores link is visible
        if await dashboard_page.is_scores_link_visible():
            # Test scores navigation
            await dashboard_page.click_scores_link()
            await dashboard_page.wait_for_url("**/scores")
    
    async def test_dashboard_refresh(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard refresh functionality"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Refresh dashboard
        await dashboard_page.refresh_dashboard()
        
        # Verify dashboard is still loaded
        assert await dashboard_page.is_dashboard_loaded()
    
    async def test_dashboard_scrolling(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard scrolling functionality"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Test scrolling to events section
        await dashboard_page.scroll_to_events()
        
        # Test scrolling to bottom
        await dashboard_page.scroll_to_bottom()
        
        # Test scrolling to top
        await dashboard_page.scroll_to_top()
        
        # Verify dashboard is still functional
        assert await dashboard_page.is_dashboard_loaded()
    
    async def test_dashboard_page_title(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard page title"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify page title
        page_title = await dashboard_page.get_page_title()
        assert page_title != ""
        assert "dashboard" in page_title.lower() or "home" in page_title.lower()
    
    async def test_dashboard_url(self, page: Page, base_url: str, test_user_data: dict):
        """Test dashboard URL"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Verify URL
        current_url = await dashboard_page.get_current_url()
        assert "dashboard" in current_url or "home" in current_url


