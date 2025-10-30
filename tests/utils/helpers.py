"""
Helper functions for E2E testing
"""
import time
import random
import string
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

def generate_random_string(length=8):
    """Generate random string"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def generate_test_email():
    """Generate test email"""
    return f"test_{generate_random_string()}@example.com"

def wait_for_page_load(driver, timeout=10):
    """Wait for page to load completely"""
    try:
        WebDriverWait(driver, timeout).until(
            lambda driver: driver.execute_script("return document.readyState") == "complete"
        )
    except TimeoutException:
        pass

def wait_for_ajax(driver, timeout=10):
    """Wait for AJAX requests to complete"""
    try:
        WebDriverWait(driver, timeout).until(
            lambda driver: driver.execute_script("return jQuery.active == 0")
        )
    except TimeoutException:
        pass

def scroll_to_bottom(driver):
    """Scroll to bottom of page"""
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(1)

def scroll_to_top(driver):
    """Scroll to top of page"""
    driver.execute_script("window.scrollTo(0, 0);")
    time.sleep(1)

def take_screenshot_on_failure(driver, test_name):
    """Take screenshot on test failure"""
    timestamp = int(time.time())
    filename = f"reports/screenshots/failure_{test_name}_{timestamp}.png"
    try:
        driver.save_screenshot(filename)
        return filename
    except Exception:
        return None

def clear_browser_data(driver):
    """Clear browser data"""
    try:
        driver.delete_all_cookies()
        driver.execute_script("window.localStorage.clear();")
        driver.execute_script("window.sessionStorage.clear();")
    except Exception:
        pass

def wait_for_element_clickable(driver, locator, timeout=10):
    """Wait for element to be clickable"""
    try:
        return WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable(locator)
        )
    except TimeoutException:
        return None

def wait_for_element_visible(driver, locator, timeout=10):
    """Wait for element to be visible"""
    try:
        return WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located(locator)
        )
    except TimeoutException:
        return None

def wait_for_text_in_element(driver, locator, text, timeout=10):
    """Wait for specific text in element"""
    try:
        return WebDriverWait(driver, timeout).until(
            EC.text_to_be_present_in_element(locator, text)
        )
    except TimeoutException:
        return None

def is_element_present(driver, locator):
    """Check if element is present"""
    try:
        driver.find_element(*locator)
        return True
    except NoSuchElementException:
        return False

def get_element_text(driver, locator):
    """Get text from element"""
    try:
        element = driver.find_element(*locator)
        return element.text
    except NoSuchElementException:
        return None

def click_element_safe(driver, locator, timeout=10):
    """Safely click element with wait"""
    try:
        element = wait_for_element_clickable(driver, locator, timeout)
        if element:
            element.click()
            return True
        return False
    except Exception:
        return False

def send_keys_safe(driver, locator, text, timeout=10):
    """Safely send keys to element"""
    try:
        element = wait_for_element_visible(driver, locator, timeout)
        if element:
            element.clear()
            element.send_keys(text)
            return True
        return False
    except Exception:
        return False

def wait_for_url_change(driver, current_url, timeout=10):
    """Wait for URL to change"""
    try:
        WebDriverWait(driver, timeout).until(
            lambda driver: driver.current_url != current_url
        )
        return True
    except TimeoutException:
        return False

def get_page_title(driver):
    """Get page title"""
    return driver.title

def get_current_url(driver):
    """Get current URL"""
    return driver.current_url

def refresh_page(driver):
    """Refresh current page"""
    driver.refresh()
    wait_for_page_load(driver)

def navigate_back(driver):
    """Navigate back"""
    driver.back()
    wait_for_page_load(driver)

def navigate_forward(driver):
    """Navigate forward"""
    driver.forward()
    wait_for_page_load(driver)

def switch_to_new_tab(driver):
    """Switch to new tab"""
    driver.switch_to.window(driver.window_handles[-1])

def close_current_tab(driver):
    """Close current tab"""
    driver.close()
    if len(driver.window_handles) > 0:
        driver.switch_to.window(driver.window_handles[0])

def get_alert_text(driver):
    """Get alert text"""
    try:
        alert = driver.switch_to.alert
        text = alert.text
        alert.accept()
        return text
    except Exception:
        return None

def accept_alert(driver):
    """Accept alert"""
    try:
        alert = driver.switch_to.alert
        alert.accept()
        return True
    except Exception:
        return False

def dismiss_alert(driver):
    """Dismiss alert"""
    try:
        alert = driver.switch_to.alert
        alert.dismiss()
        return True
    except Exception:
        return False



