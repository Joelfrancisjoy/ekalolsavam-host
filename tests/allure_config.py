"""
Allure configuration for E2E testing
"""
import os
import allure
from allure_commons.types import AttachmentType

def attach_screenshot(driver, name="screenshot"):
    """Attach screenshot to Allure report"""
    try:
        screenshot = driver.get_screenshot_as_png()
        allure.attach(screenshot, name=name, attachment_type=AttachmentType.PNG)
    except Exception as e:
        print(f"Failed to attach screenshot: {e}")

def attach_page_source(driver, name="page_source"):
    """Attach page source to Allure report"""
    try:
        page_source = driver.page_source
        allure.attach(page_source, name=name, attachment_type=AttachmentType.HTML)
    except Exception as e:
        print(f"Failed to attach page source: {e}")

def attach_text(text, name="text_attachment"):
    """Attach text to Allure report"""
    try:
        allure.attach(text, name=name, attachment_type=AttachmentType.TEXT)
    except Exception as e:
        print(f"Failed to attach text: {e}")

def attach_json(data, name="json_attachment"):
    """Attach JSON data to Allure report"""
    try:
        import json
        json_data = json.dumps(data, indent=2)
        allure.attach(json_data, name=name, attachment_type=AttachmentType.JSON)
    except Exception as e:
        print(f"Failed to attach JSON: {e}")

def step_screenshot(driver, step_name):
    """Take screenshot for a specific step"""
    with allure.step(f"Screenshot: {step_name}"):
        attach_screenshot(driver, f"step_{step_name}")

def step_page_source(driver, step_name):
    """Capture page source for a specific step"""
    with allure.step(f"Page Source: {step_name}"):
        attach_page_source(driver, f"page_source_{step_name}")

def step_text(text, step_name):
    """Add text attachment for a specific step"""
    with allure.step(f"Text: {step_name}"):
        attach_text(text, f"text_{step_name}")

def step_json(data, step_name):
    """Add JSON attachment for a specific step"""
    with allure.step(f"JSON: {step_name}"):
        attach_json(data, f"json_{step_name}")

def mark_test_result(driver, test_name, result, error_message=None):
    """Mark test result in Allure report"""
    with allure.step(f"Test Result: {result}"):
        if result == "PASSED":
            allure.attach("Test passed successfully", name="Result", attachment_type=AttachmentType.TEXT)
        elif result == "FAILED":
            allure.attach(f"Test failed: {error_message}", name="Result", attachment_type=AttachmentType.TEXT)
            attach_screenshot(driver, f"failure_{test_name}")
            attach_page_source(driver, f"failure_page_source_{test_name}")
        elif result == "SKIPPED":
            allure.attach("Test was skipped", name="Result", attachment_type=AttachmentType.TEXT)

def add_environment_info():
    """Add environment information to Allure report"""
    import platform
    import sys
    
    env_info = {
        "Platform": platform.platform(),
        "Python Version": sys.version,
        "Browser": os.getenv('BROWSER', 'chrome'),
        "Headless": os.getenv('HEADLESS', 'False'),
        "Base URL": os.getenv('BASE_URL', 'http://localhost:3000'),
        "API URL": os.getenv('API_BASE_URL', 'http://localhost:8000')
    }
    
    for key, value in env_info.items():
        allure.attach(value, name=key, attachment_type=AttachmentType.TEXT)

def add_test_data(test_data):
    """Add test data to Allure report"""
    allure.attach(str(test_data), name="Test Data", attachment_type=AttachmentType.TEXT)

def add_browser_info(driver):
    """Add browser information to Allure report"""
    try:
        browser_info = {
            "Browser Name": driver.name,
            "Browser Version": driver.capabilities.get('browserVersion', 'Unknown'),
            "Driver Version": driver.capabilities.get('chrome', {}).get('chromedriverVersion', 'Unknown'),
            "Window Size": driver.get_window_size(),
            "Current URL": driver.current_url,
            "Page Title": driver.title
        }
        
        for key, value in browser_info.items():
            allure.attach(str(value), name=key, attachment_type=AttachmentType.TEXT)
    except Exception as e:
        allure.attach(f"Failed to get browser info: {e}", name="Browser Info Error", attachment_type=AttachmentType.TEXT)



