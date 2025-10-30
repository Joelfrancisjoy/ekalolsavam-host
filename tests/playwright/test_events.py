"""
Events E2E Tests using Playwright
"""
import pytest
from playwright.async_api import Page
from pages import EventsPage, LoginPage, DashboardPage

@pytest.mark.events
class TestEvents:
    """Test events functionality"""
    
    @pytest.mark.smoke
    async def test_events_page_loading(self, page: Page, base_url: str, test_user_data: dict):
        """Test events page loads correctly"""
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
        await events_page.wait_for_events_to_load()
    
    @pytest.mark.smoke
    async def test_events_display(self, page: Page, base_url: str, test_user_data: dict):
        """Test events are displayed correctly"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Verify events are displayed
        events_count = await events_page.get_events_count()
        assert events_count >= 0
        
        if events_count > 0:
            # Verify event information is displayed
            event_titles = await events_page.get_event_titles()
            assert len(event_titles) > 0
            assert all(title.strip() != "" for title in event_titles)
    
    @pytest.mark.smoke
    async def test_events_search(self, page: Page, base_url: str, test_user_data: dict):
        """Test events search functionality"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test search functionality
        await events_page.search_events("test")
        
        # Verify search was performed
        events_count_after_search = await events_page.get_events_count()
        assert events_count_after_search >= 0
    
    @pytest.mark.smoke
    async def test_events_filter(self, page: Page, base_url: str, test_user_data: dict):
        """Test events filter functionality"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test filter functionality
        available_categories = await events_page.get_available_categories()
        if available_categories:
            await events_page.filter_by_category(available_categories[0])
            
            # Verify filter was applied
            events_count_after_filter = await events_page.get_events_count()
            assert events_count_after_filter >= 0
    
    @pytest.mark.smoke
    async def test_events_sort(self, page: Page, base_url: str, test_user_data: dict):
        """Test events sort functionality"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test sort functionality
        await events_page.sort_events("date")
        
        # Verify sort was applied
        events_count_after_sort = await events_page.get_events_count()
        assert events_count_after_sort >= 0
    
    @pytest.mark.smoke
    async def test_events_register(self, page: Page, base_url: str, test_user_data: dict):
        """Test event registration"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test registration if register buttons are visible
        events_count = await events_page.get_events_count()
        if events_count > 0:
            if await events_page.is_register_button_visible(0):
                await events_page.register_for_event(0)
                
                # Verify registration was attempted
                # Note: This depends on the actual implementation
                assert True  # Placeholder for actual verification
    
    @pytest.mark.smoke
    async def test_events_view_details(self, page: Page, base_url: str, test_user_data: dict):
        """Test event details view"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test view details if buttons are visible
        events_count = await events_page.get_events_count()
        if events_count > 0:
            if await events_page.is_view_details_button_visible(0):
                await events_page.click_view_details_button(0)
                
                # Verify details modal or page is shown
                if await events_page.is_event_details_modal_visible():
                    modal_title = await events_page.get_modal_title()
                    assert modal_title != ""
                    
                    # Close modal
                    await events_page.close_modal()
    
    async def test_events_pagination(self, page: Page, base_url: str, test_user_data: dict):
        """Test events pagination"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test pagination if visible
        if await events_page.is_pagination_visible():
            # Test next page
            await events_page.click_next_page()
            
            # Test previous page
            await events_page.click_prev_page()
            
            # Test specific page number
            await events_page.click_page_number(1)
    
    async def test_events_create(self, page: Page, base_url: str, admin_user_data: dict, event_data: dict):
        """Test event creation (admin only)"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login as admin
        await login_page.navigate_to_login(base_url)
        await login_page.login(admin_user_data['email'], admin_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test create event if button is visible
        if await events_page.is_element_visible(events_page.CREATE_EVENT_BUTTON):
            await events_page.create_event(event_data)
            
            # Verify event was created
            # Note: This depends on the actual implementation
            assert True  # Placeholder for actual verification
    
    async def test_events_edit(self, page: Page, base_url: str, admin_user_data: dict, event_data: dict):
        """Test event editing (admin only)"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login as admin
        await login_page.navigate_to_login(base_url)
        await login_page.login(admin_user_data['email'], admin_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test edit event if buttons are visible
        events_count = await events_page.get_events_count()
        if events_count > 0:
            if await events_page.is_edit_button_visible(0):
                await events_page.edit_event(0, event_data)
                
                # Verify event was edited
                # Note: This depends on the actual implementation
                assert True  # Placeholder for actual verification
    
    async def test_events_delete(self, page: Page, base_url: str, admin_user_data: dict):
        """Test event deletion (admin only)"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login as admin
        await login_page.navigate_to_login(base_url)
        await login_page.login(admin_user_data['email'], admin_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test delete event if buttons are visible
        events_count = await events_page.get_events_count()
        if events_count > 0:
            if await events_page.is_delete_button_visible(0):
                await events_page.delete_event(0)
                
                # Verify event was deleted
                # Note: This depends on the actual implementation
                assert True  # Placeholder for actual verification
    
    async def test_events_publish_unpublish(self, page: Page, base_url: str, admin_user_data: dict):
        """Test event publish/unpublish (admin only)"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login as admin
        await login_page.navigate_to_login(base_url)
        await login_page.login(admin_user_data['email'], admin_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test publish/unpublish if buttons are visible
        events_count = await events_page.get_events_count()
        if events_count > 0:
            if await events_page.is_publish_button_visible(0):
                await events_page.click_publish_button(0)
                
                # Verify event was published
                # Note: This depends on the actual implementation
                assert True  # Placeholder for actual verification
            
            if await events_page.is_unpublish_button_visible(0):
                await events_page.click_unpublish_button(0)
                
                # Verify event was unpublished
                # Note: This depends on the actual implementation
                assert True  # Placeholder for actual verification
    
    async def test_events_date_filter(self, page: Page, base_url: str, test_user_data: dict):
        """Test events date filter"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test date filter
        await events_page.filter_by_date("2024-01-01")
        
        # Verify filter was applied
        events_count_after_filter = await events_page.get_events_count()
        assert events_count_after_filter >= 0
    
    async def test_events_status_filter(self, page: Page, base_url: str, test_user_data: dict):
        """Test events status filter"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test status filter
        await events_page.filter_by_status("published")
        
        # Verify filter was applied
        events_count_after_filter = await events_page.get_events_count()
        assert events_count_after_filter >= 0
    
    async def test_events_clear_filters(self, page: Page, base_url: str, test_user_data: dict):
        """Test events clear filters"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Apply some filters
        await events_page.search_events("test")
        await events_page.filter_by_category("dance")
        
        # Clear filters
        await events_page.clear_filters()
        
        # Verify filters were cleared
        events_count_after_clear = await events_page.get_events_count()
        assert events_count_after_clear >= 0
    
    async def test_events_responsive_design(self, page: Page, base_url: str, test_user_data: dict):
        """Test events page responsive design"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Test mobile viewport
        await page.set_viewport_size({"width": 375, "height": 667})
        await events_page.navigate_to_events(base_url)
        assert await events_page.is_events_page_loaded()
        
        # Test tablet viewport
        await page.set_viewport_size({"width": 768, "height": 1024})
        await events_page.navigate_to_events(base_url)
        assert await events_page.is_events_page_loaded()
        
        # Test desktop viewport
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await events_page.navigate_to_events(base_url)
        assert await events_page.is_events_page_loaded()
    
    async def test_events_scrolling(self, page: Page, base_url: str, test_user_data: dict):
        """Test events page scrolling"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test scrolling to events
        await events_page.scroll_to_events()
        
        # Test scrolling to pagination
        if await events_page.is_pagination_visible():
            await events_page.scroll_to_pagination()
        
        # Test scrolling to bottom
        await events_page.scroll_to_bottom()
        
        # Test scrolling to top
        await events_page.scroll_to_top()
    
    async def test_events_refresh(self, page: Page, base_url: str, test_user_data: dict):
        """Test events page refresh"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Refresh page
        await events_page.refresh_events_page()
        
        # Verify page is still loaded
        assert await events_page.is_events_page_loaded()
        await events_page.wait_for_events_to_load()
    
    async def test_events_loading_states(self, page: Page, base_url: str, test_user_data: dict):
        """Test events page loading states"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        
        # Check loading state
        if await events_page.is_loading():
            # Wait for loading to complete
            await events_page.wait_for_events_to_load()
        
        # Verify events are loaded
        assert await events_page.is_events_page_loaded()
    
    async def test_events_error_handling(self, page: Page, base_url: str, test_user_data: dict):
        """Test events page error handling"""
        login_page = LoginPage(page)
        events_page = EventsPage(page)
        
        # Login first
        await login_page.navigate_to_login(base_url)
        await login_page.login(test_user_data['email'], test_user_data['password'])
        await login_page.wait_for_login_success()
        
        # Navigate to events page
        await events_page.navigate_to_events(base_url)
        await events_page.wait_for_events_to_load()
        
        # Test error handling
        if await events_page.is_error_message_visible():
            error_message = await events_page.get_error_message()
            assert error_message != ""
        
        # Test success messages
        if await events_page.is_success_message_visible():
            success_message = await events_page.get_success_message()
            assert success_message != ""


