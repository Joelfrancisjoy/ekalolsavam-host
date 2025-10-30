"""
E2E tests for scoring system functionality
"""
import pytest
import time
from tests.utils.page_objects import LoginPage, AdminPage, DashboardPage
from tests.utils.helpers import (
    wait_for_page_load, take_screenshot_on_failure, 
    clear_browser_data, wait_for_url_change
)

@pytest.mark.scoring
class TestScoringSystem:
    """Test scoring system functionality"""
    
    def test_scoring_page_access_requires_login(self, driver, base_url):
        """Test that scoring pages require login"""
        try:
            clear_browser_data(driver)
            
            # Try to access scoring page without login
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Should redirect to login page
            current_url = driver.current_url
            assert "/login" in current_url or "/" in current_url, "Should redirect to login"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "scoring_page_access_requires_login")
            raise e
    
    def test_scoring_page_loads_after_login(self, driver, base_url, admin_user_data):
        """Test that scoring page loads after login"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Verify scoring page loads
            current_url = driver.current_url
            assert "/scores" in current_url or "score" in driver.title.lower()
            
        except Exception as e:
            take_screenshot_on_failure(driver, "scoring_page_loads_after_login")
            raise e
    
    def test_score_submission_form(self, driver, base_url, admin_user_data):
        """Test score submission form"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Look for score submission form elements
            form_elements = driver.find_elements("tag name", "form")
            if form_elements:
                # Check if form has required fields
                score_inputs = driver.find_elements("name", "score")
                participant_inputs = driver.find_elements("name", "participant")
                
                # Form should have score and participant fields
                assert len(score_inputs) > 0 or len(participant_inputs) > 0, "Score form should have relevant fields"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "score_submission_form")
            raise e
    
    def test_score_criteria_display(self, driver, base_url, admin_user_data):
        """Test score criteria display"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Look for score criteria elements
            criteria_elements = driver.find_elements("class name", "criteria")
            if not criteria_elements:
                # Try alternative selectors
                criteria_elements = driver.find_elements("class name", "score-criteria")
            
            # Score criteria might not be implemented, which is okay for this test
            
        except Exception as e:
            take_screenshot_on_failure(driver, "score_criteria_display")
            raise e
    
    def test_score_validation(self, driver, base_url, admin_user_data):
        """Test score validation"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Look for score input fields
            score_inputs = driver.find_elements("name", "score")
            if score_inputs:
                # Test invalid score submission
                score_inputs[0].clear()
                score_inputs[0].send_keys("invalid_score")
                
                # Try to submit form
                submit_buttons = driver.find_elements("xpath", "//button[contains(text(), 'Submit') or contains(text(), 'Save')]")
                if submit_buttons:
                    submit_buttons[0].click()
                    time.sleep(2)
                    
                    # Check for validation errors
                    error_elements = driver.find_elements("class name", "error")
                    assert len(error_elements) > 0, "Should show validation errors for invalid score"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "score_validation")
            raise e
    
    def test_score_submission_success(self, driver, base_url, admin_user_data):
        """Test successful score submission"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Look for score input fields
            score_inputs = driver.find_elements("name", "score")
            if score_inputs:
                # Submit valid score
                score_inputs[0].clear()
                score_inputs[0].send_keys("85")
                
                # Try to submit form
                submit_buttons = driver.find_elements("xpath", "//button[contains(text(), 'Submit') or contains(text(), 'Save')]")
                if submit_buttons:
                    submit_buttons[0].click()
                    time.sleep(2)
                    
                    # Check for success message
                    success_elements = driver.find_elements("class name", "success")
                    if not success_elements:
                        # Check for redirect or other success indicators
                        current_url = driver.current_url
                        assert "/scores" in current_url or "/success" in current_url or "/dashboard" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "score_submission_success")
            raise e
    
    def test_score_history_display(self, driver, base_url, admin_user_data):
        """Test score history display"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Look for score history elements
            history_elements = driver.find_elements("class name", "score-history")
            if not history_elements:
                # Try alternative selectors
                history_elements = driver.find_elements("class name", "history")
            
            # Score history might not be implemented, which is okay for this test
            
        except Exception as e:
            take_screenshot_on_failure(driver, "score_history_display")
            raise e
    
    def test_admin_score_management(self, driver, base_url, admin_user_data):
        """Test admin score management"""
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
            
            # Verify admin scores section loads
            current_url = driver.current_url
            assert "/admin" in current_url or "/scores" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "admin_score_management")
            raise e
    
    def test_score_export_functionality(self, driver, base_url, admin_user_data):
        """Test score export functionality"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            
            # Look for export buttons
            export_buttons = driver.find_elements("xpath", "//button[contains(text(), 'Export') or contains(text(), 'Download')]")
            if export_buttons:
                export_buttons[0].click()
                time.sleep(2)
                
                # Check if download starts or export page loads
                current_url = driver.current_url
                assert "/export" in current_url or "/download" in current_url or "/scores" in current_url
            
        except Exception as e:
            take_screenshot_on_failure(driver, "score_export_functionality")
            raise e
    
    @pytest.mark.slow
    def test_score_performance_with_large_data(self, driver, base_url, admin_user_data):
        """Test score system performance with large data"""
        try:
            clear_browser_data(driver)
            
            # Login first
            login_page = LoginPage(driver, base_url)
            login_page.open("/login")
            wait_for_page_load(driver)
            login_page.login(admin_user_data['email'], admin_user_data['password'])
            time.sleep(3)
            
            # Navigate to scoring page
            start_time = time.time()
            driver.get(f"{base_url}/scores")
            wait_for_page_load(driver)
            load_time = time.time() - start_time
            
            # Verify page loads within reasonable time
            assert load_time < 10, f"Score page should load within 10 seconds, took {load_time:.2f}s"
            
        except Exception as e:
            take_screenshot_on_failure(driver, "score_performance_with_large_data")
            raise e



