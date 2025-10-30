"""
Login Page Object for Playwright E2E Tests
"""
from playwright.async_api import Page
from .base_page import BasePage

class LoginPage(BasePage):
    """Login page object"""
    
    # Locators
    EMAIL_INPUT = "input[name='email']"
    PASSWORD_INPUT = "input[name='password']"
    LOGIN_BUTTON = "button[type='submit']"
    GOOGLE_LOGIN_BUTTON = "button[data-testid='google-login']"
    REGISTER_LINK = "a[href*='register']"
    FORGOT_PASSWORD_LINK = "a[href*='forgot-password']"
    ERROR_MESSAGE = ".error-message, .alert-danger, [role='alert']"
    SUCCESS_MESSAGE = ".success-message, .alert-success"
    LOGIN_FORM = "form[data-testid='login-form']"
    LOADING_SPINNER = ".spinner, .loading, [data-testid='loading']"
    
    def __init__(self, page: Page):
        super().__init__(page)
        self.page = page
    
    async def navigate_to_login(self, base_url: str) -> None:
        """Navigate to login page"""
        await self.navigate_to(f"{base_url}/login")
        await self.wait_for_element(self.LOGIN_FORM)
    
    async def enter_email(self, email: str) -> None:
        """Enter email address"""
        await self.fill_input(self.EMAIL_INPUT, email)
    
    async def enter_password(self, password: str) -> None:
        """Enter password"""
        await self.fill_input(self.PASSWORD_INPUT, password)
    
    async def click_login_button(self) -> None:
        """Click login button"""
        await self.click_element(self.LOGIN_BUTTON)
    
    async def click_google_login(self) -> None:
        """Click Google login button"""
        await self.click_element(self.GOOGLE_LOGIN_BUTTON)
    
    async def click_register_link(self) -> None:
        """Click register link"""
        await self.click_element(self.REGISTER_LINK)
    
    async def click_forgot_password_link(self) -> None:
        """Click forgot password link"""
        await self.click_element(self.FORGOT_PASSWORD_LINK)
    
    async def login(self, email: str, password: str) -> None:
        """Complete login process"""
        await self.enter_email(email)
        await self.enter_password(password)
        await self.click_login_button()
    
    async def is_login_form_visible(self) -> bool:
        """Check if login form is visible"""
        return await self.is_element_visible(self.LOGIN_FORM)
    
    async def is_google_login_visible(self) -> bool:
        """Check if Google login button is visible"""
        return await self.is_element_visible(self.GOOGLE_LOGIN_BUTTON)
    
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
    
    async def is_loading(self) -> bool:
        """Check if loading spinner is visible"""
        return await self.is_element_visible(self.LOADING_SPINNER)
    
    async def wait_for_login_success(self, timeout: int = 10000) -> None:
        """Wait for login to complete successfully"""
        # Wait for redirect to dashboard or home page
        await self.wait_for_url("**/dashboard", timeout=timeout)
    
    async def wait_for_login_error(self, timeout: int = 5000) -> None:
        """Wait for login error to appear"""
        await self.wait_for_element(self.ERROR_MESSAGE, timeout=timeout)
    
    async def clear_form(self) -> None:
        """Clear login form"""
        await self.clear_input(self.EMAIL_INPUT)
        await self.clear_input(self.PASSWORD_INPUT)
    
    async def is_email_field_required(self) -> bool:
        """Check if email field has required attribute"""
        required = await self.get_attribute(self.EMAIL_INPUT, "required")
        return required is not None
    
    async def is_password_field_required(self) -> bool:
        """Check if password field has required attribute"""
        required = await self.get_attribute(self.PASSWORD_INPUT, "required")
        return required is not None
    
    async def get_email_placeholder(self) -> str:
        """Get email field placeholder"""
        return await self.get_attribute(self.EMAIL_INPUT, "placeholder") or ""
    
    async def get_password_placeholder(self) -> str:
        """Get password field placeholder"""
        return await self.get_attribute(self.PASSWORD_INPUT, "placeholder") or ""
    
    async def is_login_button_enabled(self) -> bool:
        """Check if login button is enabled"""
        return await self.is_element_enabled(self.LOGIN_BUTTON)
    
    async def get_login_button_text(self) -> str:
        """Get login button text"""
        return await self.get_text(self.LOGIN_BUTTON)
    
    async def get_google_login_text(self) -> str:
        """Get Google login button text"""
        return await self.get_text(self.GOOGLE_LOGIN_BUTTON)
    
    async def submit_form_with_enter(self) -> None:
        """Submit form by pressing Enter key"""
        await self.press_key("Enter")
    
    async def tab_to_password(self) -> None:
        """Tab to password field"""
        await self.press_key("Tab")
    
    async def tab_to_login_button(self) -> None:
        """Tab to login button"""
        await self.press_key("Tab")
        await self.press_key("Tab")


