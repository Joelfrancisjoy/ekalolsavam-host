"""
Registration Page Object for Playwright E2E Tests
"""
from playwright.async_api import Page
from .base_page import BasePage

class RegisterPage(BasePage):
    """Registration page object"""
    
    # Locators
    FIRST_NAME_INPUT = "input[name='first_name']"
    LAST_NAME_INPUT = "input[name='last_name']"
    EMAIL_INPUT = "input[name='email']"
    PHONE_INPUT = "input[name='phone']"
    COLLEGE_INPUT = "input[name='college']"
    PASSWORD_INPUT = "input[name='password']"
    CONFIRM_PASSWORD_INPUT = "input[name='confirm_password']"
    ROLE_SELECT = "select[name='role']"
    TERMS_CHECKBOX = "input[name='terms']"
    REGISTER_BUTTON = "button[type='submit']"
    GOOGLE_SIGNUP_BUTTON = "button[data-testid='google-signup']"
    LOGIN_LINK = "a[href*='login']"
    ERROR_MESSAGE = ".error-message, .alert-danger, [role='alert']"
    SUCCESS_MESSAGE = ".success-message, .alert-success"
    REGISTER_FORM = "form[data-testid='register-form']"
    LOADING_SPINNER = ".spinner, .loading, [data-testid='loading']"
    PASSWORD_STRENGTH_INDICATOR = ".password-strength"
    EMAIL_VALIDATION_MESSAGE = ".email-validation"
    PHONE_VALIDATION_MESSAGE = ".phone-validation"
    
    def __init__(self, page: Page):
        super().__init__(page)
        self.page = page
    
    async def navigate_to_register(self, base_url: str) -> None:
        """Navigate to registration page"""
        await self.navigate_to(f"{base_url}/register")
        await self.wait_for_element(self.REGISTER_FORM)
    
    async def enter_first_name(self, first_name: str) -> None:
        """Enter first name"""
        await self.fill_input(self.FIRST_NAME_INPUT, first_name)
    
    async def enter_last_name(self, last_name: str) -> None:
        """Enter last name"""
        await self.fill_input(self.LAST_NAME_INPUT, last_name)
    
    async def enter_email(self, email: str) -> None:
        """Enter email address"""
        await self.fill_input(self.EMAIL_INPUT, email)
    
    async def enter_phone(self, phone: str) -> None:
        """Enter phone number"""
        await self.fill_input(self.PHONE_INPUT, phone)
    
    async def enter_college(self, college: str) -> None:
        """Enter college name"""
        await self.fill_input(self.COLLEGE_INPUT, college)
    
    async def enter_password(self, password: str) -> None:
        """Enter password"""
        await self.fill_input(self.PASSWORD_INPUT, password)
    
    async def enter_confirm_password(self, password: str) -> None:
        """Enter confirm password"""
        await self.fill_input(self.CONFIRM_PASSWORD_INPUT, password)
    
    async def select_role(self, role: str) -> None:
        """Select user role"""
        await self.select_option(self.ROLE_SELECT, role)
    
    async def check_terms(self) -> None:
        """Check terms and conditions checkbox"""
        await self.click_element(self.TERMS_CHECKBOX)
    
    async def click_register_button(self) -> None:
        """Click register button"""
        await self.click_element(self.REGISTER_BUTTON)
    
    async def click_google_signup(self) -> None:
        """Click Google signup button"""
        await self.click_element(self.GOOGLE_SIGNUP_BUTTON)
    
    async def click_login_link(self) -> None:
        """Click login link"""
        await self.click_element(self.LOGIN_LINK)
    
    async def register(self, user_data: dict) -> None:
        """Complete registration process"""
        await self.enter_first_name(user_data['first_name'])
        await self.enter_last_name(user_data['last_name'])
        await self.enter_email(user_data['email'])
        await self.enter_phone(user_data['phone'])
        await self.enter_college(user_data['college'])
        await self.enter_password(user_data['password'])
        await self.enter_confirm_password(user_data['password'])
        await self.select_role(user_data['role'])
        await self.check_terms()
        await self.click_register_button()
    
    async def is_register_form_visible(self) -> bool:
        """Check if registration form is visible"""
        return await self.is_element_visible(self.REGISTER_FORM)
    
    async def is_google_signup_visible(self) -> bool:
        """Check if Google signup button is visible"""
        return await self.is_element_visible(self.GOOGLE_SIGNUP_BUTTON)
    
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
    
    async def wait_for_registration_success(self, timeout: int = 10000) -> None:
        """Wait for registration to complete successfully"""
        # Wait for redirect to dashboard or login page
        await self.wait_for_url("**/dashboard", timeout=timeout)
    
    async def wait_for_registration_error(self, timeout: int = 5000) -> None:
        """Wait for registration error to appear"""
        await self.wait_for_element(self.ERROR_MESSAGE, timeout=timeout)
    
    async def clear_form(self) -> None:
        """Clear registration form"""
        await self.clear_input(self.FIRST_NAME_INPUT)
        await self.clear_input(self.LAST_NAME_INPUT)
        await self.clear_input(self.EMAIL_INPUT)
        await self.clear_input(self.PHONE_INPUT)
        await self.clear_input(self.COLLEGE_INPUT)
        await self.clear_input(self.PASSWORD_INPUT)
        await self.clear_input(self.CONFIRM_PASSWORD_INPUT)
    
    async def is_password_strength_visible(self) -> bool:
        """Check if password strength indicator is visible"""
        return await self.is_element_visible(self.PASSWORD_STRENGTH_INDICATOR)
    
    async def get_password_strength(self) -> str:
        """Get password strength text"""
        if await self.is_password_strength_visible():
            return await self.get_text(self.PASSWORD_STRENGTH_INDICATOR)
        return ""
    
    async def is_email_validation_visible(self) -> bool:
        """Check if email validation message is visible"""
        return await self.is_element_visible(self.EMAIL_VALIDATION_MESSAGE)
    
    async def get_email_validation_message(self) -> str:
        """Get email validation message"""
        if await self.is_email_validation_visible():
            return await self.get_text(self.EMAIL_VALIDATION_MESSAGE)
        return ""
    
    async def is_phone_validation_visible(self) -> bool:
        """Check if phone validation message is visible"""
        return await self.is_element_visible(self.PHONE_VALIDATION_MESSAGE)
    
    async def get_phone_validation_message(self) -> str:
        """Get phone validation message"""
        if await self.is_phone_validation_visible():
            return await self.get_text(self.PHONE_VALIDATION_MESSAGE)
        return ""
    
    async def is_terms_checked(self) -> bool:
        """Check if terms checkbox is checked"""
        checked = await self.get_attribute(self.TERMS_CHECKBOX, "checked")
        return checked is not None
    
    async def is_register_button_enabled(self) -> bool:
        """Check if register button is enabled"""
        return await self.is_element_enabled(self.REGISTER_BUTTON)
    
    async def get_register_button_text(self) -> str:
        """Get register button text"""
        return await self.get_text(self.REGISTER_BUTTON)
    
    async def get_google_signup_text(self) -> str:
        """Get Google signup button text"""
        return await self.get_text(self.GOOGLE_SIGNUP_BUTTON)
    
    async def submit_form_with_enter(self) -> None:
        """Submit form by pressing Enter key"""
        await self.press_key("Enter")
    
    async def validate_password_match(self) -> bool:
        """Validate that password and confirm password match"""
        password = await self.get_attribute(self.PASSWORD_INPUT, "value")
        confirm_password = await self.get_attribute(self.CONFIRM_PASSWORD_INPUT, "value")
        return password == confirm_password
    
    async def get_available_roles(self) -> list:
        """Get list of available roles"""
        options = await self.get_all_text(f"{self.ROLE_SELECT} option")
        return [option for option in options if option.strip()]
    
    async def is_field_required(self, field_name: str) -> bool:
        """Check if a field is required"""
        field_selector = f"input[name='{field_name}']"
        required = await self.get_attribute(field_selector, "required")
        return required is not None


