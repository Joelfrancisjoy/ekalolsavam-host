"""
Core URLs for system health checks and monitoring.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health-check'),
    path('info/', views.system_info, name='system-info'),
]