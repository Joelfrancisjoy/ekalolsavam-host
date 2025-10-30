"""
Dashboard Page Object for Playwright E2E Tests
"""
from playwright.async_api import Page
from .base_page import BasePage

class DashboardPage(BasePage):
    """Dashboard page object"""
    
    # Locators
    USER_PROFILE = "[data-testid='user-profile']"
    USER_NAME = "[data-testid='user-name']"
    USER_EMAIL = "[data-testid='user-email']"
    LOGOUT_BUTTON = "[data-testid='logout-button']"
    NAVIGATION_MENU = "[data-testid='navigation-menu']"
    EVENTS_SECTION = "[data-testid='events-section']"
    NOTIFICATIONS = "[data-testid='notifications']"
    QUICK_ACTIONS = "[data-testid='quick-actions']"
    STATS_CARDS = "[data-testid='stats-cards']"
    RECENT_ACTIVITIES = "[data-testid='recent-activities']"
    SEARCH_BAR = "input[data-testid='search-bar']"
    FILTER_DROPDOWN = "select[data-testid='filter-dropdown']"
    SORT_DROPDOWN = "select[data-testid='sort-dropdown']"
    LOADING_SPINNER = ".spinner, .loading, [data-testid='loading']"
    ERROR_MESSAGE = ".error-message, .alert-danger, [role='alert']"
    SUCCESS_MESSAGE = ".success-message, .alert-success"
    
    # Navigation links
    HOME_LINK = "a[href*='dashboard']"
    EVENTS_LINK = "a[href*='events']"
    PROFILE_LINK = "a[href*='profile']"
    SCORES_LINK = "a[href*='scores']"
    ADMIN_LINK = "a[href*='admin']"
    
    # Event cards
    EVENT_CARDS = "[data-testid='event-card']"
    EVENT_TITLE = "[data-testid='event-title']"
    EVENT_DATE = "[data-testid='event-date']"
    EVENT_CATEGORY = "[data-testid='event-category']"
    REGISTER_BUTTON = "[data-testid='register-button']"
    VIEW_DETAILS_BUTTON = "[data-testid='view-details-button']"
    
    def __init__(self, page: Page):
        super().__init__(page)
        self.page = page
    
    async def navigate_to_dashboard(self, base_url: str) -> None:
        """Navigate to dashboard page"""
        await self.navigate_to(f"{base_url}/dashboard")
        await self.wait_for_element(self.USER_PROFILE)
    
    async def is_dashboard_loaded(self) -> bool:
        """Check if dashboard is loaded"""
        return await self.is_element_visible(self.USER_PROFILE)
    
    async def get_user_name(self) -> str:
        """Get user name from profile"""
        return await self.get_text(self.USER_NAME)
    
    async def get_user_email(self) -> str:
        """Get user email from profile"""
        return await self.get_text(self.USER_EMAIL)
    
    async def click_logout(self) -> None:
        """Click logout button"""
        await self.click_element(self.LOGOUT_BUTTON)
    
    async def click_events_link(self) -> None:
        """Click events navigation link"""
        await self.click_element(self.EVENTS_LINK)
    
    async def click_profile_link(self) -> None:
        """Click profile navigation link"""
        await self.click_element(self.PROFILE_LINK)
    
    async def click_scores_link(self) -> None:
        """Click scores navigation link"""
        await self.click_element(self.SCORES_LINK)
    
    async def click_admin_link(self) -> None:
        """Click admin navigation link"""
        await self.click_element(self.ADMIN_LINK)
    
    async def is_navigation_visible(self) -> bool:
        """Check if navigation menu is visible"""
        return await self.is_element_visible(self.NAVIGATION_MENU)
    
    async def is_events_section_visible(self) -> bool:
        """Check if events section is visible"""
        return await self.is_element_visible(self.EVENTS_SECTION)
    
    async def is_notifications_visible(self) -> bool:
        """Check if notifications are visible"""
        return await self.is_element_visible(self.NOTIFICATIONS)
    
    async def is_quick_actions_visible(self) -> bool:
        """Check if quick actions are visible"""
        return await self.is_element_visible(self.QUICK_ACTIONS)
    
    async def is_stats_cards_visible(self) -> bool:
        """Check if stats cards are visible"""
        return await self.is_element_visible(self.STATS_CARDS)
    
    async def is_recent_activities_visible(self) -> bool:
        """Check if recent activities are visible"""
        return await self.is_element_visible(self.RECENT_ACTIVITIES)
    
    async def search_events(self, search_term: str) -> None:
        """Search for events"""
        await self.fill_input(self.SEARCH_BAR, search_term)
        await self.press_key("Enter")
    
    async def filter_events(self, filter_value: str) -> None:
        """Filter events by category"""
        await self.select_option(self.FILTER_DROPDOWN, filter_value)
    
    async def sort_events(self, sort_option: str) -> None:
        """Sort events"""
        await self.select_option(self.SORT_DROPDOWN, sort_option)
    
    async def get_event_cards_count(self) -> int:
        """Get number of event cards displayed"""
        return await self.get_element_count(self.EVENT_CARDS)
    
    async def get_event_titles(self) -> list:
        """Get list of event titles"""
        return await self.get_all_text(self.EVENT_TITLE)
    
    async def get_event_dates(self) -> list:
        """Get list of event dates"""
        return await self.get_all_text(self.EVENT_DATE)
    
    async def get_event_categories(self) -> list:
        """Get list of event categories"""
        return await self.get_all_text(self.EVENT_CATEGORY)
    
    async def click_register_button(self, event_index: int = 0) -> None:
        """Click register button for specific event"""
        register_buttons = self.page.locator(self.REGISTER_BUTTON)
        await register_buttons.nth(event_index).click()
    
    async def click_view_details_button(self, event_index: int = 0) -> None:
        """Click view details button for specific event"""
        view_buttons = self.page.locator(self.VIEW_DETAILS_BUTTON)
        await view_buttons.nth(event_index).click()
    
    async def is_register_button_visible(self, event_index: int = 0) -> bool:
        """Check if register button is visible for specific event"""
        register_buttons = self.page.locator(self.REGISTER_BUTTON)
        return await register_buttons.nth(event_index).is_visible()
    
    async def is_view_details_button_visible(self, event_index: int = 0) -> bool:
        """Check if view details button is visible for specific event"""
        view_buttons = self.page.locator(self.VIEW_DETAILS_BUTTON)
        return await view_buttons.nth(event_index).is_visible()
    
    async def get_register_button_text(self, event_index: int = 0) -> str:
        """Get register button text for specific event"""
        register_buttons = self.page.locator(self.REGISTER_BUTTON)
        return await register_buttons.nth(event_index).text_content()
    
    async def get_view_details_button_text(self, event_index: int = 0) -> str:
        """Get view details button text for specific event"""
        view_buttons = self.page.locator(self.VIEW_DETAILS_BUTTON)
        return await view_buttons.nth(event_index).text_content()
    
    async def is_loading(self) -> bool:
        """Check if loading spinner is visible"""
        return await self.is_element_visible(self.LOADING_SPINNER)
    
    async def wait_for_events_to_load(self, timeout: int = 10000) -> None:
        """Wait for events to load"""
        await self.wait_for_element(self.EVENT_CARDS, timeout=timeout)
    
    async def wait_for_dashboard_to_load(self, timeout: int = 10000) -> None:
        """Wait for dashboard to fully load"""
        await self.wait_for_element(self.USER_PROFILE, timeout=timeout)
        await self.wait_for_network_idle(timeout=timeout)
    
    async def is_error_message_visible(self) -> bool:
        """Check if error message is visible"""
        return await self.is_element_visible(self.ERROR_MESSAGE)
    
    async def is_success_message_visible(self) -> bool:
        """Check if success message is visible"""
        return await self.is_element_visible(self.SUCCESS_MESSAGE)
    
    async def get_error_message(self) -> str:
        """Get error message text"""
        if await self.is_error_message_visible():
            return await self.get_text(self.ERROR_MESSAGE)
        return ""
    
    async def get_success_message(self) -> str:
        """Get success message text"""
        if await self.is_success_message_visible():
            return await self.get_text(self.SUCCESS_MESSAGE)
        return ""
    
    async def clear_search(self) -> None:
        """Clear search bar"""
        await self.clear_input(self.SEARCH_BAR)
    
    async def get_search_placeholder(self) -> str:
        """Get search bar placeholder"""
        return await self.get_attribute(self.SEARCH_BAR, "placeholder") or ""
    
    async def get_available_filters(self) -> list:
        """Get list of available filter options"""
        options = await self.get_all_text(f"{self.FILTER_DROPDOWN} option")
        return [option for option in options if option.strip()]
    
    async def get_available_sort_options(self) -> list:
        """Get list of available sort options"""
        options = await self.get_all_text(f"{self.SORT_DROPDOWN} option")
        return [option for option in options if option.strip()]
    
    async def is_admin_link_visible(self) -> bool:
        """Check if admin link is visible (for admin users)"""
        return await self.is_element_visible(self.ADMIN_LINK)
    
    async def is_scores_link_visible(self) -> bool:
        """Check if scores link is visible"""
        return await self.is_element_visible(self.SCORES_LINK)
    
    async def refresh_dashboard(self) -> None:
        """Refresh dashboard page"""
        await self.reload_page()
        await self.wait_for_dashboard_to_load()
    
    async def scroll_to_events(self) -> None:
        """Scroll to events section"""
        await self.scroll_to_element(self.EVENTS_SECTION)
    
    async def scroll_to_bottom(self) -> None:
        """Scroll to bottom of page"""
        await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    
    async def scroll_to_top(self) -> None:
        """Scroll to top of page"""
        await self.page.evaluate("window.scrollTo(0, 0)")
    
    async def get_page_title(self) -> str:
        """Get page title"""
        return await self.page.title()
    
    async def get_current_url(self) -> str:
        """Get current URL"""
        return self.page.url


