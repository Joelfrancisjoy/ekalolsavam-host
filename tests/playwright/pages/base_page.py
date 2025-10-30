"""
Base Page Object for Playwright E2E Tests
"""
import os
from playwright.async_api import Page, expect
from typing import Optional, List
import asyncio

class BasePage:
    """Base page object with common functionality"""
    
    def __init__(self, page: Page):
        self.page = page
        self.timeout = 30000  # 30 seconds default timeout
    
    async def navigate_to(self, url: str) -> None:
        """Navigate to a URL"""
        await self.page.goto(url, wait_until="networkidle")
    
    async def wait_for_element(self, selector: str, timeout: Optional[int] = None) -> None:
        """Wait for element to be visible"""
        timeout = timeout or self.timeout
        await self.page.wait_for_selector(selector, timeout=timeout)
    
    async def click_element(self, selector: str, timeout: Optional[int] = None) -> None:
        """Click an element"""
        await self.wait_for_element(selector, timeout)
        await self.page.click(selector)
    
    async def fill_input(self, selector: str, text: str, timeout: Optional[int] = None) -> None:
        """Fill an input field"""
        await self.wait_for_element(selector, timeout)
        await self.page.fill(selector, text)
    
    async def get_text(self, selector: str, timeout: Optional[int] = None) -> str:
        """Get text content of an element"""
        await self.wait_for_element(selector, timeout)
        return await self.page.text_content(selector)
    
    async def get_attribute(self, selector: str, attribute: str, timeout: Optional[int] = None) -> str:
        """Get attribute value of an element"""
        await self.wait_for_element(selector, timeout)
        return await self.page.get_attribute(selector, attribute)
    
    async def is_element_visible(self, selector: str, timeout: Optional[int] = None) -> bool:
        """Check if element is visible"""
        try:
            await self.wait_for_element(selector, timeout)
            return await self.page.is_visible(selector)
        except:
            return False
    
    async def is_element_enabled(self, selector: str, timeout: Optional[int] = None) -> bool:
        """Check if element is enabled"""
        try:
            await self.wait_for_element(selector, timeout)
            return await self.page.is_enabled(selector)
        except:
            return False
    
    async def select_option(self, selector: str, value: str, timeout: Optional[int] = None) -> None:
        """Select an option from dropdown"""
        await self.wait_for_element(selector, timeout)
        await self.page.select_option(selector, value)
    
    async def upload_file(self, selector: str, file_path: str, timeout: Optional[int] = None) -> None:
        """Upload a file"""
        await self.wait_for_element(selector, timeout)
        await self.page.set_input_files(selector, file_path)
    
    async def scroll_to_element(self, selector: str, timeout: Optional[int] = None) -> None:
        """Scroll to element"""
        await self.wait_for_element(selector, timeout)
        await self.page.locator(selector).scroll_into_view_if_needed()
    
    async def wait_for_url(self, url_pattern: str, timeout: Optional[int] = None) -> None:
        """Wait for URL to match pattern"""
        timeout = timeout or self.timeout
        await self.page.wait_for_url(url_pattern, timeout=timeout)
    
    async def wait_for_text(self, text: str, timeout: Optional[int] = None) -> None:
        """Wait for text to appear on page"""
        timeout = timeout or self.timeout
        await self.page.wait_for_function(f"document.body.innerText.includes('{text}')", timeout=timeout)
    
    async def take_screenshot(self, name: str, full_page: bool = True) -> str:
        """Take a screenshot"""
        screenshot_path = f"../reports/screenshots/{name}.png"
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await self.page.screenshot(path=screenshot_path, full_page=full_page)
        return screenshot_path
    
    async def wait_for_network_idle(self, timeout: Optional[int] = None) -> None:
        """Wait for network to be idle"""
        timeout = timeout or self.timeout
        await self.page.wait_for_load_state("networkidle", timeout=timeout)
    
    async def reload_page(self) -> None:
        """Reload the current page"""
        await self.page.reload(wait_until="networkidle")
    
    async def go_back(self) -> None:
        """Go back in browser history"""
        await self.page.go_back(wait_until="networkidle")
    
    async def go_forward(self) -> None:
        """Go forward in browser history"""
        await self.page.go_forward(wait_until="networkidle")
    
    async def get_current_url(self) -> str:
        """Get current URL"""
        return self.page.url
    
    async def get_page_title(self) -> str:
        """Get page title"""
        return await self.page.title()
    
    async def press_key(self, key: str) -> None:
        """Press a key"""
        await self.page.keyboard.press(key)
    
    async def hover_element(self, selector: str, timeout: Optional[int] = None) -> None:
        """Hover over an element"""
        await self.wait_for_element(selector, timeout)
        await self.page.hover(selector)
    
    async def double_click_element(self, selector: str, timeout: Optional[int] = None) -> None:
        """Double click an element"""
        await self.wait_for_element(selector, timeout)
        await self.page.dblclick(selector)
    
    async def right_click_element(self, selector: str, timeout: Optional[int] = None) -> None:
        """Right click an element"""
        await self.wait_for_element(selector, timeout)
        await self.page.click(selector, button="right")
    
    async def clear_input(self, selector: str, timeout: Optional[int] = None) -> None:
        """Clear input field"""
        await self.wait_for_element(selector, timeout)
        await self.page.fill(selector, "")
    
    async def get_element_count(self, selector: str) -> int:
        """Get count of elements matching selector"""
        return await self.page.locator(selector).count()
    
    async def get_all_text(self, selector: str) -> List[str]:
        """Get text content of all elements matching selector"""
        elements = self.page.locator(selector)
        count = await elements.count()
        texts = []
        for i in range(count):
            text = await elements.nth(i).text_content()
            if text:
                texts.append(text.strip())
        return texts
    
    async def wait_for_element_to_disappear(self, selector: str, timeout: Optional[int] = None) -> None:
        """Wait for element to disappear"""
        timeout = timeout or self.timeout
        await self.page.wait_for_selector(selector, state="hidden", timeout=timeout)
    
    async def drag_and_drop(self, source_selector: str, target_selector: str, timeout: Optional[int] = None) -> None:
        """Drag and drop element"""
        await self.wait_for_element(source_selector, timeout)
        await self.wait_for_element(target_selector, timeout)
        await self.page.drag_and_drop(source_selector, target_selector)
    
    async def switch_to_tab(self, index: int) -> None:
        """Switch to tab by index"""
        pages = self.page.context.pages
        if index < len(pages):
            self.page = pages[index]
    
    async def close_tab(self) -> None:
        """Close current tab"""
        await self.page.close()
    
    async def get_cookies(self) -> List[dict]:
        """Get all cookies"""
        return await self.page.context.cookies()
    
    async def set_cookie(self, name: str, value: str, domain: str = None, path: str = "/") -> None:
        """Set a cookie"""
        await self.page.context.add_cookies([{
            "name": name,
            "value": value,
            "domain": domain or self.page.url.split('/')[2],
            "path": path
        }])
    
    async def clear_cookies(self) -> None:
        """Clear all cookies"""
        await self.page.context.clear_cookies()
    
    async def execute_javascript(self, script: str) -> any:
        """Execute JavaScript"""
        return await self.page.evaluate(script)
    
    async def wait_for_console_message(self, message: str, timeout: Optional[int] = None) -> None:
        """Wait for console message"""
        timeout = timeout or self.timeout
        
        def handle_console(msg):
            if message in msg.text:
                return True
            return False
        
        await self.page.wait_for_event("console", handle_console, timeout=timeout)
