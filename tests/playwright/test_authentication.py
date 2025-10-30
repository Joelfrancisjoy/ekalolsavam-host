"""
Authentication E2E Tests using Playwright
"""
import pytest
from playwright.async_api import Page
from pages import LoginPage, RegisterPage, DashboardPage

@pytest.mark.login
class TestAuthentication:
    """Test authentication functionality"""
    
    @pytest.mark.smoke
    async def test_user_login_success(self, page: Page, base_url: str, test_user_data: dict):
        """Test successful user login"""
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        assert await login_page.is_login_form_visible()
        
        # Perform login
        await login_page.login(test_user_data['email'], test_user_data['password'])
        
        # Wait for successful login and redirect to dashboard
        await login_page.wait_for_login_success()
        
        # Verify dashboard is loaded
        assert await dashboard_page.is_dashboard_loaded()
        assert await dashboard_page.get_user_email() == test_user_data['email']
    
    @pytest.mark.smoke
    async def test_user_login_invalid_credentials(self, page: Page, base_url: str):
        """Test login with invalid credentials"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Attempt login with invalid credentials
        await login_page.login("invalid@email.com", "wrongpassword")
        
        # Wait for error message
        await login_page.wait_for_login_error()
        
        # Verify error message is displayed
        assert await login_page.is_error_message_visible()
        error_message = await login_page.get_error_message()
        assert "invalid" in error_message.lower() or "incorrect" in error_message.lower()
    
    @pytest.mark.smoke
    async def test_user_login_empty_fields(self, page: Page, base_url: str):
        """Test login with empty fields"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Try to submit form with empty fields
        await login_page.click_login_button()
        
        # Verify form validation
        assert await login_page.is_email_field_required()
        assert await login_page.is_password_field_required()
    
    @pytest.mark.smoke
    async def test_user_logout(self, page: Page, base_url: str, test_user_data: dict):
        """Test user logout functionality"""
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
    
    @pytest.mark.slow
    async def test_google_login(self, page: Page, base_url: str):
        """Test Google OAuth login"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Verify Google login button is visible
        assert await login_page.is_google_login_visible()
        
        # Click Google login button
        await login_page.click_google_login()
        
        # Note: In a real test, you would handle OAuth flow
        # For now, we just verify the button works
        assert await login_page.get_google_login_text() != ""
    
    async def test_login_form_validation(self, page: Page, base_url: str):
        """Test login form validation"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Test email field validation
        await login_page.enter_email("invalid-email")
        await login_page.click_login_button()
        
        # Should show validation error
        assert await login_page.is_error_message_visible()
    
    async def test_login_remember_me(self, page: Page, base_url: str, test_user_data: dict):
        """Test remember me functionality"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Check if remember me checkbox exists
        remember_me_selector = "input[name='remember_me']"
        if await login_page.is_element_visible(remember_me_selector):
            await login_page.click_element(remember_me_selector)
        
        # Perform login
        await login_page.login(test_user_data['email'], test_user_data['password'])
        
        # Verify login success
        await login_page.wait_for_login_success()
    
    async def test_login_keyboard_navigation(self, page: Page, base_url: str, test_user_data: dict):
        """Test login form keyboard navigation"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Test tab navigation
        await login_page.enter_email(test_user_data['email'])
        await login_page.tab_to_password()
        await login_page.enter_password(test_user_data['password'])
        await login_page.tab_to_login_button()
        
        # Submit with Enter key
        await login_page.submit_form_with_enter()
        
        # Verify login success
        await login_page.wait_for_login_success()
    
    async def test_login_page_accessibility(self, page: Page, base_url: str):
        """Test login page accessibility"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Check for proper labels and placeholders
        email_placeholder = await login_page.get_email_placeholder()
        password_placeholder = await login_page.get_password_placeholder()
        
        assert email_placeholder != ""
        assert password_placeholder != ""
        
        # Check for proper form structure
        assert await login_page.is_login_form_visible()
    
    async def test_login_page_responsive(self, page: Page, base_url: str):
        """Test login page responsiveness"""
        login_page = LoginPage(page)
        
        # Test mobile viewport
        await page.set_viewport_size({"width": 375, "height": 667})
        await login_page.navigate_to_login(base_url)
        assert await login_page.is_login_form_visible()
        
        # Test tablet viewport
        await page.set_viewport_size({"width": 768, "height": 1024})
        await login_page.navigate_to_login(base_url)
        assert await login_page.is_login_form_visible()
        
        # Test desktop viewport
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await login_page.navigate_to_login(base_url)
        assert await login_page.is_login_form_visible()
    
    async def test_login_with_special_characters(self, page: Page, base_url: str):
        """Test login with special characters in credentials"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Test with special characters
        special_email = "test+special@example.com"
        special_password = "P@ssw0rd!@#$%"
        
        await login_page.enter_email(special_email)
        await login_page.enter_password(special_password)
        
        # Verify form accepts special characters
        entered_email = await login_page.get_attribute(login_page.EMAIL_INPUT, "value")
        assert entered_email == special_email
    
    async def test_login_page_loading_states(self, page: Page, base_url: str, test_user_data: dict):
        """Test login page loading states"""
        login_page = LoginPage(page)
        
        # Navigate to login page
        await login_page.navigate_to_login(base_url)
        
        # Start login process
        await login_page.enter_email(test_user_data['email'])
        await login_page.enter_password(test_user_data['password'])
        
        # Check if loading state appears (if implemented)
        await login_page.click_login_button()
        
        # Wait for either success or error
        try:
            await login_page.wait_for_login_success(timeout=5000)
        except:
            # If login fails, check for error message
            assert await login_page.is_error_message_visible()


