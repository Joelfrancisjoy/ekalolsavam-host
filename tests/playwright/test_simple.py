
import pytest
from playwright.async_api import Page

@pytest.mark.asyncio
async def test_simple_page_load(page: Page):
    """Simple test to generate reports"""
    # Navigate to a simple page
    await page.goto("https://example.com")
    
    # Take a screenshot
    await page.screenshot(path="tests/reports/screenshots/simple_test.png")
    
    # Verify page title
    title = await page.title()
    assert "Example" in title
    
    print("Simple test completed successfully")
