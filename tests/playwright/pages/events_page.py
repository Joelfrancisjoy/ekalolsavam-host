"""
Events Page Object for Playwright E2E Tests
"""
from playwright.async_api import Page
from .base_page import BasePage

class EventsPage(BasePage):
    """Events page object"""
    
    # Locators
    EVENTS_LIST = "[data-testid='events-list']"
    EVENT_CARDS = "[data-testid='event-card']"
    EVENT_TITLE = "[data-testid='event-title']"
    EVENT_DESCRIPTION = "[data-testid='event-description']"
    EVENT_DATE = "[data-testid='event-date']"
    EVENT_TIME = "[data-testid='event-time']"
    EVENT_CATEGORY = "[data-testid='event-category']"
    EVENT_VENUE = "[data-testid='event-venue']"
    EVENT_MAX_PARTICIPANTS = "[data-testid='event-max-participants']"
    EVENT_REGISTERED_COUNT = "[data-testid='event-registered-count']"
    
    # Action buttons
    REGISTER_BUTTON = "[data-testid='register-button']"
    VIEW_DETAILS_BUTTON = "[data-testid='view-details-button']"
    EDIT_BUTTON = "[data-testid='edit-button']"
    DELETE_BUTTON = "[data-testid='delete-button']"
    PUBLISH_BUTTON = "[data-testid='publish-button']"
    UNPUBLISH_BUTTON = "[data-testid='unpublish-button']"
    
    # Filters and search
    SEARCH_BAR = "input[data-testid='search-bar']"
    CATEGORY_FILTER = "select[data-testid='category-filter']"
    DATE_FILTER = "input[data-testid='date-filter']"
    STATUS_FILTER = "select[data-testid='status-filter']"
    SORT_DROPDOWN = "select[data-testid='sort-dropdown']"
    CLEAR_FILTERS_BUTTON = "[data-testid='clear-filters-button']"
    
    # Pagination
    PAGINATION = "[data-testid='pagination']"
    PREV_PAGE_BUTTON = "[data-testid='prev-page-button']"
    NEXT_PAGE_BUTTON = "[data-testid='next-page-button']"
    PAGE_NUMBERS = "[data-testid='page-number']"
    CURRENT_PAGE = "[data-testid='current-page']"
    
    # Create/Edit event form
    CREATE_EVENT_BUTTON = "[data-testid='create-event-button']"
    EVENT_FORM = "[data-testid='event-form']"
    EVENT_NAME_INPUT = "input[name='name']"
    EVENT_DESCRIPTION_INPUT = "textarea[name='description']"
    EVENT_CATEGORY_SELECT = "select[name='category']"
    EVENT_DATE_INPUT = "input[name='date']"
    EVENT_START_TIME_INPUT = "input[name='start_time']"
    EVENT_END_TIME_INPUT = "input[name='end_time']"
    EVENT_VENUE_SELECT = "select[name='venue']"
    EVENT_MAX_PARTICIPANTS_INPUT = "input[name='max_participants']"
    EVENT_JUDGES_SELECT = "select[name='judges']"
    EVENT_VOLUNTEERS_SELECT = "select[name='volunteers']"
    SAVE_EVENT_BUTTON = "[data-testid='save-event-button']"
    CANCEL_EVENT_BUTTON = "[data-testid='cancel-event-button']"
    
    # Event details modal
    EVENT_DETAILS_MODAL = "[data-testid='event-details-modal']"
    MODAL_TITLE = "[data-testid='modal-title']"
    MODAL_DESCRIPTION = "[data-testid='modal-description']"
    MODAL_DATE = "[data-testid='modal-date']"
    MODAL_TIME = "[data-testid='modal-time']"
    MODAL_VENUE = "[data-testid='modal-venue']"
    MODAL_PARTICIPANTS = "[data-testid='modal-participants']"
    MODAL_JUDGES = "[data-testid='modal-judges']"
    MODAL_VOLUNTEERS = "[data-testid='modal-volunteers']"
    CLOSE_MODAL_BUTTON = "[data-testid='close-modal-button']"
    
    # Registration form
    REGISTRATION_FORM = "[data-testid='registration-form']"
    REGISTRATION_SUBMIT_BUTTON = "[data-testid='registration-submit-button']"
    REGISTRATION_CANCEL_BUTTON = "[data-testid='registration-cancel-button']"
    
    # Messages
    SUCCESS_MESSAGE = ".success-message, .alert-success"
    ERROR_MESSAGE = ".error-message, .alert-danger, [role='alert']"
    LOADING_SPINNER = ".spinner, .loading, [data-testid='loading']"
    
    def __init__(self, page: Page):
        super().__init__(page)
        self.page = page
    
    async def navigate_to_events(self, base_url: str) -> None:
        """Navigate to events page"""
        await self.navigate_to(f"{base_url}/events")
        await self.wait_for_element(self.EVENTS_LIST)
    
    async def is_events_page_loaded(self) -> bool:
        """Check if events page is loaded"""
        return await self.is_element_visible(self.EVENTS_LIST)
    
    async def get_events_count(self) -> int:
        """Get number of events displayed"""
        return await self.get_element_count(self.EVENT_CARDS)
    
    async def get_event_titles(self) -> list:
        """Get list of event titles"""
        return await self.get_all_text(self.EVENT_TITLE)
    
    async def get_event_descriptions(self) -> list:
        """Get list of event descriptions"""
        return await self.get_all_text(self.EVENT_DESCRIPTION)
    
    async def get_event_dates(self) -> list:
        """Get list of event dates"""
        return await self.get_all_text(self.EVENT_DATE)
    
    async def get_event_times(self) -> list:
        """Get list of event times"""
        return await self.get_all_text(self.EVENT_TIME)
    
    async def get_event_categories(self) -> list:
        """Get list of event categories"""
        return await self.get_all_text(self.EVENT_CATEGORY)
    
    async def get_event_venues(self) -> list:
        """Get list of event venues"""
        return await self.get_all_text(self.EVENT_VENUE)
    
    async def search_events(self, search_term: str) -> None:
        """Search for events"""
        await self.fill_input(self.SEARCH_BAR, search_term)
        await self.press_key("Enter")
    
    async def filter_by_category(self, category: str) -> None:
        """Filter events by category"""
        await self.select_option(self.CATEGORY_FILTER, category)
    
    async def filter_by_date(self, date: str) -> None:
        """Filter events by date"""
        await self.fill_input(self.DATE_FILTER, date)
    
    async def filter_by_status(self, status: str) -> None:
        """Filter events by status"""
        await self.select_option(self.STATUS_FILTER, status)
    
    async def sort_events(self, sort_option: str) -> None:
        """Sort events"""
        await self.select_option(self.SORT_DROPDOWN, sort_option)
    
    async def clear_filters(self) -> None:
        """Clear all filters"""
        await self.click_element(self.CLEAR_FILTERS_BUTTON)
    
    async def click_create_event(self) -> None:
        """Click create event button"""
        await self.click_element(self.CREATE_EVENT_BUTTON)
    
    async def click_register_button(self, event_index: int = 0) -> None:
        """Click register button for specific event"""
        register_buttons = self.page.locator(self.REGISTER_BUTTON)
        await register_buttons.nth(event_index).click()
    
    async def click_view_details_button(self, event_index: int = 0) -> None:
        """Click view details button for specific event"""
        view_buttons = self.page.locator(self.VIEW_DETAILS_BUTTON)
        await view_buttons.nth(event_index).click()
    
    async def click_edit_button(self, event_index: int = 0) -> None:
        """Click edit button for specific event"""
        edit_buttons = self.page.locator(self.EDIT_BUTTON)
        await edit_buttons.nth(event_index).click()
    
    async def click_delete_button(self, event_index: int = 0) -> None:
        """Click delete button for specific event"""
        delete_buttons = self.page.locator(self.DELETE_BUTTON)
        await delete_buttons.nth(event_index).click()
    
    async def click_publish_button(self, event_index: int = 0) -> None:
        """Click publish button for specific event"""
        publish_buttons = self.page.locator(self.PUBLISH_BUTTON)
        await publish_buttons.nth(event_index).click()
    
    async def click_unpublish_button(self, event_index: int = 0) -> None:
        """Click unpublish button for specific event"""
        unpublish_buttons = self.page.locator(self.UNPUBLISH_BUTTON)
        await unpublish_buttons.nth(event_index).click()
    
    async def is_register_button_visible(self, event_index: int = 0) -> bool:
        """Check if register button is visible for specific event"""
        register_buttons = self.page.locator(self.REGISTER_BUTTON)
        return await register_buttons.nth(event_index).is_visible()
    
    async def is_view_details_button_visible(self, event_index: int = 0) -> bool:
        """Check if view details button is visible for specific event"""
        view_buttons = self.page.locator(self.VIEW_DETAILS_BUTTON)
        return await view_buttons.nth(event_index).is_visible()
    
    async def is_edit_button_visible(self, event_index: int = 0) -> bool:
        """Check if edit button is visible for specific event"""
        edit_buttons = self.page.locator(self.EDIT_BUTTON)
        return await edit_buttons.nth(event_index).is_visible()
    
    async def is_delete_button_visible(self, event_index: int = 0) -> bool:
        """Check if delete button is visible for specific event"""
        delete_buttons = self.page.locator(self.DELETE_BUTTON)
        return await delete_buttons.nth(event_index).is_visible()
    
    async def is_publish_button_visible(self, event_index: int = 0) -> bool:
        """Check if publish button is visible for specific event"""
        publish_buttons = self.page.locator(self.PUBLISH_BUTTON)
        return await publish_buttons.nth(event_index).is_visible()
    
    async def is_unpublish_button_visible(self, event_index: int = 0) -> bool:
        """Check if unpublish button is visible for specific event"""
        unpublish_buttons = self.page.locator(self.UNPUBLISH_BUTTON)
        return await unpublish_buttons.nth(event_index).is_visible()
    
    async def create_event(self, event_data: dict) -> None:
        """Create a new event"""
        await self.click_create_event()
        await self.wait_for_element(self.EVENT_FORM)
        
        await self.fill_input(self.EVENT_NAME_INPUT, event_data['name'])
        await self.fill_input(self.EVENT_DESCRIPTION_INPUT, event_data['description'])
        await self.select_option(self.EVENT_CATEGORY_SELECT, event_data['category'])
        await self.fill_input(self.EVENT_DATE_INPUT, event_data['date'])
        await self.fill_input(self.EVENT_START_TIME_INPUT, event_data['start_time'])
        await self.fill_input(self.EVENT_END_TIME_INPUT, event_data['end_time'])
        await self.fill_input(self.EVENT_MAX_PARTICIPANTS_INPUT, str(event_data['max_participants']))
        
        await self.click_element(self.SAVE_EVENT_BUTTON)
    
    async def edit_event(self, event_index: int, event_data: dict) -> None:
        """Edit an existing event"""
        await self.click_edit_button(event_index)
        await self.wait_for_element(self.EVENT_FORM)
        
        await self.clear_input(self.EVENT_NAME_INPUT)
        await self.fill_input(self.EVENT_NAME_INPUT, event_data['name'])
        await self.clear_input(self.EVENT_DESCRIPTION_INPUT)
        await self.fill_input(self.EVENT_DESCRIPTION_INPUT, event_data['description'])
        
        await self.click_element(self.SAVE_EVENT_BUTTON)
    
    async def delete_event(self, event_index: int) -> None:
        """Delete an event"""
        await self.click_delete_button(event_index)
        # Handle confirmation dialog if present
        await self.page.get_by_text("Confirm").click()
    
    async def register_for_event(self, event_index: int) -> None:
        """Register for an event"""
        await self.click_register_button(event_index)
        await self.wait_for_element(self.REGISTRATION_FORM)
        await self.click_element(self.REGISTRATION_SUBMIT_BUTTON)
    
    async def is_event_details_modal_visible(self) -> bool:
        """Check if event details modal is visible"""
        return await self.is_element_visible(self.EVENT_DETAILS_MODAL)
    
    async def get_modal_title(self) -> str:
        """Get modal title"""
        return await self.get_text(self.MODAL_TITLE)
    
    async def get_modal_description(self) -> str:
        """Get modal description"""
        return await self.get_text(self.MODAL_DESCRIPTION)
    
    async def close_modal(self) -> None:
        """Close event details modal"""
        await self.click_element(self.CLOSE_MODAL_BUTTON)
    
    async def is_pagination_visible(self) -> bool:
        """Check if pagination is visible"""
        return await self.is_element_visible(self.PAGINATION)
    
    async def click_next_page(self) -> None:
        """Click next page button"""
        await self.click_element(self.NEXT_PAGE_BUTTON)
    
    async def click_prev_page(self) -> None:
        """Click previous page button"""
        await self.click_element(self.PREV_PAGE_BUTTON)
    
    async def click_page_number(self, page_number: int) -> None:
        """Click specific page number"""
        page_numbers = self.page.locator(self.PAGE_NUMBERS)
        await page_numbers.nth(page_number - 1).click()
    
    async def get_current_page(self) -> int:
        """Get current page number"""
        current_page_text = await self.get_text(self.CURRENT_PAGE)
        return int(current_page_text)
    
    async def is_loading(self) -> bool:
        """Check if loading spinner is visible"""
        return await self.is_element_visible(self.LOADING_SPINNER)
    
    async def wait_for_events_to_load(self, timeout: int = 10000) -> None:
        """Wait for events to load"""
        await self.wait_for_element(self.EVENT_CARDS, timeout=timeout)
    
    async def wait_for_event_form(self, timeout: int = 5000) -> None:
        """Wait for event form to load"""
        await self.wait_for_element(self.EVENT_FORM, timeout=timeout)
    
    async def is_success_message_visible(self) -> bool:
        """Check if success message is visible"""
        return await self.is_element_visible(self.SUCCESS_MESSAGE)
    
    async def is_error_message_visible(self) -> bool:
        """Check if error message is visible"""
        return await self.is_element_visible(self.ERROR_MESSAGE)
    
    async def get_success_message(self) -> str:
        """Get success message text"""
        if await self.is_success_message_visible():
            return await self.get_text(self.SUCCESS_MESSAGE)
        return ""
    
    async def get_error_message(self) -> str:
        """Get error message text"""
        if await self.is_error_message_visible():
            return await self.get_text(self.ERROR_MESSAGE)
        return ""
    
    async def get_available_categories(self) -> list:
        """Get list of available categories"""
        options = await self.get_all_text(f"{self.EVENT_CATEGORY_SELECT} option")
        return [option for option in options if option.strip()]
    
    async def get_available_venues(self) -> list:
        """Get list of available venues"""
        options = await self.get_all_text(f"{self.EVENT_VENUE_SELECT} option")
        return [option for option in options if option.strip()]
    
    async def get_available_judges(self) -> list:
        """Get list of available judges"""
        options = await self.get_all_text(f"{self.EVENT_JUDGES_SELECT} option")
        return [option for option in options if option.strip()]
    
    async def get_available_volunteers(self) -> list:
        """Get list of available volunteers"""
        options = await self.get_all_text(f"{self.EVENT_VOLUNTEERS_SELECT} option")
        return [option for option in options if option.strip()]
    
    async def refresh_events_page(self) -> None:
        """Refresh events page"""
        await self.reload_page()
        await self.wait_for_events_to_load()
    
    async def scroll_to_events(self) -> None:
        """Scroll to events list"""
        await self.scroll_to_element(self.EVENTS_LIST)
    
    async def scroll_to_pagination(self) -> None:
        """Scroll to pagination"""
        await self.scroll_to_element(self.PAGINATION)


