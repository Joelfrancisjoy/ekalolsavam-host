"""
Registration E2E Tests using Playwright
"""
import pytest
from playwright.async_api import Page
from pages import RegisterPage, LoginPage, DashboardPage

@pytest.mark.registration
class TestRegistration:
    """Test user registration functionality"""
    
    @pytest.mark.smoke
    async def test_user_registration_success(self, page: Page, base_url: str, test_user_data: dict):
        """Test successful user registration"""
        register_page = RegisterPage(page)
        dashboard_page = DashboardPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        assert await register_page.is_register_form_visible()
        
        # Fill registration form
        await register_page.register(test_user_data)
        
        # Wait for successful registration and redirect
        await register_page.wait_for_registration_success()
        
        # Verify dashboard is loaded
        assert await dashboard_page.is_dashboard_loaded()
        assert await dashboard_page.get_user_email() == test_user_data['email']
    
    @pytest.mark.smoke
    async def test_user_registration_validation(self, page: Page, base_url: str):
        """Test registration form validation"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Try to submit form with empty fields
        await register_page.click_register_button()
        
        # Verify form validation
        assert await register_page.is_field_required('first_name')
        assert await register_page.is_field_required('last_name')
        assert await register_page.is_field_required('email')
        assert await register_page.is_field_required('password')
    
    @pytest.mark.smoke
    async def test_user_registration_invalid_email(self, page: Page, base_url: str, test_user_data: dict):
        """Test registration with invalid email"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Fill form with invalid email
        test_user_data['email'] = "invalid-email"
        await register_page.register(test_user_data)
        
        # Verify error message
        assert await register_page.is_error_message_visible()
        error_message = await register_page.get_error_message()
        assert "email" in error_message.lower() or "invalid" in error_message.lower()
    
    @pytest.mark.smoke
    async def test_user_registration_password_mismatch(self, page: Page, base_url: str, test_user_data: dict):
        """Test registration with password mismatch"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Fill form with mismatched passwords
        await register_page.enter_first_name(test_user_data['first_name'])
        await register_page.enter_last_name(test_user_data['last_name'])
        await register_page.enter_email(test_user_data['email'])
        await register_page.enter_phone(test_user_data['phone'])
        await register_page.enter_college(test_user_data['college'])
        await register_page.enter_password(test_user_data['password'])
        await register_page.enter_confirm_password("different_password")
        await register_page.select_role(test_user_data['role'])
        await register_page.check_terms()
        
        # Submit form
        await register_page.click_register_button()
        
        # Verify error message
        assert await register_page.is_error_message_visible()
        error_message = await register_page.get_error_message()
        assert "password" in error_message.lower() or "match" in error_message.lower()
    
    @pytest.mark.smoke
    async def test_user_registration_terms_required(self, page: Page, base_url: str, test_user_data: dict):
        """Test registration without accepting terms"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Fill form without checking terms
        await register_page.enter_first_name(test_user_data['first_name'])
        await register_page.enter_last_name(test_user_data['last_name'])
        await register_page.enter_email(test_user_data['email'])
        await register_page.enter_phone(test_user_data['phone'])
        await register_page.enter_college(test_user_data['college'])
        await register_page.enter_password(test_user_data['password'])
        await register_page.enter_confirm_password(test_user_data['password'])
        await register_page.select_role(test_user_data['role'])
        # Don't check terms
        
        # Submit form
        await register_page.click_register_button()
        
        # Verify error message or form validation
        assert await register_page.is_error_message_visible() or not await register_page.is_register_button_enabled()
    
    @pytest.mark.slow
    async def test_google_signup(self, page: Page, base_url: str):
        """Test Google OAuth signup"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Verify Google signup button is visible
        assert await register_page.is_google_signup_visible()
        
        # Click Google signup button
        await register_page.click_google_signup()
        
        # Note: In a real test, you would handle OAuth flow
        # For now, we just verify the button works
        assert await register_page.get_google_signup_text() != ""
    
    async def test_registration_form_validation_messages(self, page: Page, base_url: str):
        """Test registration form validation messages"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Test email validation
        await register_page.enter_email("invalid-email")
        await register_page.tab_to_password()
        
        # Check if email validation message appears
        if await register_page.is_email_validation_visible():
            email_validation = await register_page.get_email_validation_message()
            assert "email" in email_validation.lower()
        
        # Test phone validation
        await register_page.enter_phone("invalid-phone")
        await register_page.tab_to_password()
        
        # Check if phone validation message appears
        if await register_page.is_phone_validation_visible():
            phone_validation = await register_page.get_phone_validation_message()
            assert "phone" in phone_validation.lower()
    
    async def test_registration_password_strength(self, page: Page, base_url: str, test_user_data: dict):
        """Test password strength indicator"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Test weak password
        await register_page.enter_password("123")
        
        # Check if password strength indicator appears
        if await register_page.is_password_strength_visible():
            strength = await register_page.get_password_strength()
            assert "weak" in strength.lower() or "poor" in strength.lower()
        
        # Test strong password
        await register_page.enter_password("StrongP@ssw0rd123!")
        
        # Check if password strength indicator shows strong
        if await register_page.is_password_strength_visible():
            strength = await register_page.get_password_strength()
            assert "strong" in strength.lower() or "good" in strength.lower()
    
    async def test_registration_available_roles(self, page: Page, base_url: str):
        """Test available user roles in registration"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Get available roles
        roles = await register_page.get_available_roles()
        
        # Verify expected roles are available
        assert len(roles) > 0
        assert "student" in [role.lower() for role in roles]
    
    async def test_registration_form_keyboard_navigation(self, page: Page, base_url: str, test_user_data: dict):
        """Test registration form keyboard navigation"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Test tab navigation through form fields
        await register_page.enter_first_name(test_user_data['first_name'])
        await register_page.press_key("Tab")
        await register_page.enter_last_name(test_user_data['last_name'])
        await register_page.press_key("Tab")
        await register_page.enter_email(test_user_data['email'])
        await register_page.press_key("Tab")
        await register_page.enter_phone(test_user_data['phone'])
        await register_page.press_key("Tab")
        await register_page.enter_college(test_user_data['college'])
        await register_page.press_key("Tab")
        await register_page.enter_password(test_user_data['password'])
        await register_page.press_key("Tab")
        await register_page.enter_confirm_password(test_user_data['password'])
        
        # Check terms and submit
        await register_page.check_terms()
        await register_page.submit_form_with_enter()
    
    async def test_registration_duplicate_email(self, page: Page, base_url: str, test_user_data: dict):
        """Test registration with duplicate email"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Use a known existing email
        test_user_data['email'] = "admin@test.com"
        await register_page.register(test_user_data)
        
        # Verify error message for duplicate email
        assert await register_page.is_error_message_visible()
        error_message = await register_page.get_error_message()
        assert "email" in error_message.lower() or "already" in error_message.lower() or "exists" in error_message.lower()
    
    async def test_registration_page_responsive(self, page: Page, base_url: str):
        """Test registration page responsiveness"""
        register_page = RegisterPage(page)
        
        # Test mobile viewport
        await page.set_viewport_size({"width": 375, "height": 667})
        await register_page.navigate_to_register(base_url)
        assert await register_page.is_register_form_visible()
        
        # Test tablet viewport
        await page.set_viewport_size({"width": 768, "height": 1024})
        await register_page.navigate_to_register(base_url)
        assert await register_page.is_register_form_visible()
        
        # Test desktop viewport
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await register_page.navigate_to_register(base_url)
        assert await register_page.is_register_form_visible()
    
    async def test_registration_clear_form(self, page: Page, base_url: str, test_user_data: dict):
        """Test clearing registration form"""
        register_page = RegisterPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Fill form partially
        await register_page.enter_first_name(test_user_data['first_name'])
        await register_page.enter_email(test_user_data['email'])
        
        # Clear form
        await register_page.clear_form()
        
        # Verify form is cleared
        first_name_value = await register_page.get_attribute(register_page.FIRST_NAME_INPUT, "value")
        email_value = await register_page.get_attribute(register_page.EMAIL_INPUT, "value")
        
        assert first_name_value == ""
        assert email_value == ""
    
    async def test_registration_login_link(self, page: Page, base_url: str):
        """Test navigation to login page from registration"""
        register_page = RegisterPage(page)
        login_page = LoginPage(page)
        
        # Navigate to registration page
        await register_page.navigate_to_register(base_url)
        
        # Click login link
        await register_page.click_login_link()
        
        # Verify redirect to login page
        await login_page.wait_for_url("**/login")
        assert await login_page.is_login_form_visible()


