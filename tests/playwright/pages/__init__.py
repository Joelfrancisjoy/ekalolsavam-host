"""
Page Objects Package for Playwright E2E Tests
"""
from .base_page import BasePage
from .login_page import LoginPage
from .register_page import RegisterPage
from .dashboard_page import DashboardPage
from .events_page import EventsPage

__all__ = [
    'BasePage',
    'LoginPage',
    'RegisterPage',
    'DashboardPage',
    'EventsPage'
]


