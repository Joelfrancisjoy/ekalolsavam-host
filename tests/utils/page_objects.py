"""
Page Object Model classes for E2E testing
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time

class BasePage:
    """Base page class with common functionality"""
    
    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)
    
    def open(self, path=""):
        """Open the page"""
        url = f"{self.base_url}{path}"
        self.driver.get(url)
        return self
    
    def find_element(self, locator):
        """Find element with wait"""
        return self.wait.until(EC.presence_of_element_located(locator))
    
    def find_elements(self, locator):
        """Find multiple elements"""
        return self.driver.find_elements(*locator)
    
    def click_element(self, locator):
        """Click element with wait"""
        element = self.wait.until(EC.element_to_be_clickable(locator))
        element.click()
        return self
    
    def send_keys(self, locator, text):
        """Send keys to element"""
        element = self.find_element(locator)
        element.clear()
        element.send_keys(text)
        return self
    
    def get_text(self, locator):
        """Get text from element"""
        element = self.find_element(locator)
        return element.text
    
    def is_element_present(self, locator):
        """Check if element is present"""
        try:
            self.driver.find_element(*locator)
            return True
        except NoSuchElementException:
            return False
    
    def wait_for_element_visible(self, locator, timeout=10):
        """Wait for element to be visible"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.visibility_of_element_located(locator))
    
    def wait_for_text_in_element(self, locator, text, timeout=10):
        """Wait for specific text in element"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.text_to_be_present_in_element(locator, text))
    
    def scroll_to_element(self, locator):
        """Scroll to element"""
        element = self.find_element(locator)
        self.driver.execute_script("arguments[0].scrollIntoView();", element)
        return self
    
    def take_screenshot(self, name="screenshot"):
        """Take screenshot"""
        timestamp = int(time.time())
        filename = f"reports/screenshots/{name}_{timestamp}.png"
        self.driver.save_screenshot(filename)
        return filename

class LoginPage(BasePage):
    """Login page object"""
    
    # Locators
    EMAIL_INPUT = (By.NAME, "email")
    PASSWORD_INPUT = (By.NAME, "password")
    LOGIN_BUTTON = (By.XPATH, "//button[contains(text(), 'Login') or contains(text(), 'Sign In')]")
    GOOGLE_LOGIN_BUTTON = (By.XPATH, "//button[contains(text(), 'Google') or contains(@class, 'google')]")
    ERROR_MESSAGE = (By.CLASS_NAME, "error")
    SUCCESS_MESSAGE = (By.CLASS_NAME, "success")
    
    def login(self, email, password):
        """Perform login"""
        self.send_keys(self.EMAIL_INPUT, email)
        self.send_keys(self.PASSWORD_INPUT, password)
        self.click_element(self.LOGIN_BUTTON)
        return self
    
    def google_login(self):
        """Perform Google login"""
        self.click_element(self.GOOGLE_LOGIN_BUTTON)
        return self
    
    def get_error_message(self):
        """Get error message if present"""
        try:
            return self.get_text(self.ERROR_MESSAGE)
        except TimeoutException:
            return None

class RegistrationPage(BasePage):
    """Registration page object"""
    
    # Locators
    EMAIL_INPUT = (By.NAME, "email")
    PASSWORD_INPUT = (By.NAME, "password")
    CONFIRM_PASSWORD_INPUT = (By.NAME, "confirmPassword")
    FIRST_NAME_INPUT = (By.NAME, "firstName")
    LAST_NAME_INPUT = (By.NAME, "lastName")
    PHONE_INPUT = (By.NAME, "phone")
    COLLEGE_INPUT = (By.NAME, "college")
    ROLE_SELECT = (By.NAME, "role")
    REGISTER_BUTTON = (By.XPATH, "//button[contains(text(), 'Register') or contains(text(), 'Sign Up')]")
    GOOGLE_SIGNUP_BUTTON = (By.XPATH, "//button[contains(text(), 'Google') or contains(@class, 'google')]")
    ERROR_MESSAGE = (By.CLASS_NAME, "error")
    SUCCESS_MESSAGE = (By.CLASS_NAME, "success")
    
    def register(self, user_data):
        """Perform registration"""
        self.send_keys(self.EMAIL_INPUT, user_data['email'])
        self.send_keys(self.PASSWORD_INPUT, user_data['password'])
        self.send_keys(self.CONFIRM_PASSWORD_INPUT, user_data['password'])
        self.send_keys(self.FIRST_NAME_INPUT, user_data['first_name'])
        self.send_keys(self.LAST_NAME_INPUT, user_data['last_name'])
        self.send_keys(self.PHONE_INPUT, user_data['phone'])
        self.send_keys(self.COLLEGE_INPUT, user_data['college'])
        
        # Select role if dropdown exists
        if self.is_element_present(self.ROLE_SELECT):
            from selenium.webdriver.support.ui import Select
            role_select = Select(self.driver.find_element(*self.ROLE_SELECT))
            role_select.select_by_value(user_data['role'])
        
        self.click_element(self.REGISTER_BUTTON)
        return self
    
    def google_signup(self):
        """Perform Google signup"""
        self.click_element(self.GOOGLE_SIGNUP_BUTTON)
        return self

class DashboardPage(BasePage):
    """Dashboard page object"""
    
    # Locators
    USER_MENU = (By.CLASS_NAME, "user-menu")
    LOGOUT_BUTTON = (By.XPATH, "//button[contains(text(), 'Logout') or contains(text(), 'Sign Out')]")
    EVENTS_SECTION = (By.CLASS_NAME, "events")
    NOTIFICATIONS = (By.CLASS_NAME, "notifications")
    PROFILE_LINK = (By.XPATH, "//a[contains(text(), 'Profile')]")
    
    def logout(self):
        """Perform logout"""
        self.click_element(self.USER_MENU)
        self.click_element(self.LOGOUT_BUTTON)
        return self
    
    def get_user_info(self):
        """Get user information from dashboard"""
        try:
            return self.get_text(self.USER_MENU)
        except TimeoutException:
            return None

class EventsPage(BasePage):
    """Events page object"""
    
    # Locators
    EVENT_CARDS = (By.CLASS_NAME, "event-card")
    REGISTER_BUTTON = (By.XPATH, "//button[contains(text(), 'Register')]")
    EVENT_DETAILS = (By.CLASS_NAME, "event-details")
    SEARCH_INPUT = (By.NAME, "search")
    FILTER_SELECT = (By.NAME, "filter")
    
    def get_events_count(self):
        """Get number of events displayed"""
        events = self.find_elements(self.EVENT_CARDS)
        return len(events)
    
    def register_for_event(self, event_index=0):
        """Register for an event"""
        events = self.find_elements(self.EVENT_CARDS)
        if events and event_index < len(events):
            register_btn = events[event_index].find_element(*self.REGISTER_BUTTON)
            register_btn.click()
        return self
    
    def search_events(self, search_term):
        """Search for events"""
        self.send_keys(self.SEARCH_INPUT, search_term)
        self.send_keys(self.SEARCH_INPUT, Keys.RETURN)
        return self

class AdminPage(BasePage):
    """Admin page object"""
    
    # Locators
    ADMIN_MENU = (By.CLASS_NAME, "admin-menu")
    USERS_SECTION = (By.XPATH, "//a[contains(text(), 'Users')]")
    EVENTS_SECTION = (By.XPATH, "//a[contains(text(), 'Events')]")
    SCORES_SECTION = (By.XPATH, "//a[contains(text(), 'Scores')]")
    ADD_EVENT_BUTTON = (By.XPATH, "//button[contains(text(), 'Add Event')]")
    
    def navigate_to_users(self):
        """Navigate to users section"""
        self.click_element(self.ADMIN_MENU)
        self.click_element(self.USERS_SECTION)
        return self
    
    def navigate_to_events(self):
        """Navigate to events section"""
        self.click_element(self.ADMIN_MENU)
        self.click_element(self.EVENTS_SECTION)
        return self
    
    def add_new_event(self):
        """Add new event"""
        self.click_element(self.ADD_EVENT_BUTTON)
        return self



