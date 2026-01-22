"""
Core views for system health checks and monitoring.
"""

import os
import sys
from datetime import datetime
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint that returns system status.
    
    Returns:
        JSON response with system health information including:
        - Server status
        - Database connectivity
        - Environment configuration
        - Authentication system status
    """
    health_data = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'environment': 'development' if settings.DEBUG else 'production',
        'checks': {}
    }
    
    overall_status = True
    
    # Database connectivity check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health_data['checks']['database'] = {
            'status': 'healthy',
            'message': 'Database connection successful',
            'engine': settings.DATABASES['default']['ENGINE'].split('.')[-1]
        }
    except Exception as e:
        health_data['checks']['database'] = {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}',
            'engine': settings.DATABASES['default']['ENGINE'].split('.')[-1]
        }
        overall_status = False
    
    # Authentication system check
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_count = User.objects.count()
        
        health_data['checks']['authentication'] = {
            'status': 'healthy',
            'message': 'Authentication system operational',
            'user_count': user_count,
            'jwt_configured': 'rest_framework_simplejwt' in settings.INSTALLED_APPS,
            'oauth_configured': bool(settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY)
        }
    except Exception as e:
        health_data['checks']['authentication'] = {
            'status': 'unhealthy',
            'message': f'Authentication system error: {str(e)}'
        }
        overall_status = False
    
    # CORS configuration check
    cors_configured = 'corsheaders' in settings.INSTALLED_APPS
    cors_middleware = 'corsheaders.middleware.CorsMiddleware' in settings.MIDDLEWARE
    
    health_data['checks']['cors'] = {
        'status': 'healthy' if cors_configured and cors_middleware else 'warning',
        'message': 'CORS properly configured' if cors_configured and cors_middleware else 'CORS configuration issues',
        'app_installed': cors_configured,
        'middleware_configured': cors_middleware,
        'allowed_origins': len(getattr(settings, 'CORS_ALLOWED_ORIGINS', [])) if hasattr(settings, 'CORS_ALLOWED_ORIGINS') else 0
    }
    
    # Environment variables check
    required_env_vars = [
        'SECRET_KEY',
        'SOCIAL_AUTH_GOOGLE_OAUTH2_KEY',
        'SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET'
    ]
    
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    health_data['checks']['environment'] = {
        'status': 'healthy' if not missing_vars else 'unhealthy',
        'message': 'All required environment variables present' if not missing_vars else f'Missing variables: {", ".join(missing_vars)}',
        'missing_variables': missing_vars,
        'debug_mode': settings.DEBUG
    }
    
    if missing_vars:
        overall_status = False
    
    # Static files check
    try:
        static_url_configured = bool(settings.STATIC_URL)
        static_root_configured = bool(settings.STATIC_ROOT)
        
        health_data['checks']['static_files'] = {
            'status': 'healthy' if static_url_configured else 'warning',
            'message': 'Static files configured' if static_url_configured else 'Static files configuration incomplete',
            'static_url': static_url_configured,
            'static_root': static_root_configured,
            'whitenoise_configured': 'whitenoise.middleware.WhiteNoiseMiddleware' in settings.MIDDLEWARE
        }
    except Exception as e:
        health_data['checks']['static_files'] = {
            'status': 'warning',
            'message': f'Static files check error: {str(e)}'
        }
    
    # Set overall status
    health_data['status'] = 'healthy' if overall_status else 'unhealthy'
    
    # Return appropriate HTTP status code
    http_status = status.HTTP_200_OK if overall_status else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(health_data, status=http_status)


@api_view(['GET'])
@permission_classes([AllowAny])
def system_info(request):
    """
    System information endpoint for debugging and monitoring.
    
    Returns basic system information without sensitive data.
    """
    info_data = {
        'python_version': sys.version,
        'django_version': getattr(settings, 'DJANGO_VERSION', 'Unknown'),
        'debug_mode': settings.DEBUG,
        'allowed_hosts': settings.ALLOWED_HOSTS,
        'installed_apps_count': len(settings.INSTALLED_APPS),
        'middleware_count': len(settings.MIDDLEWARE),
        'database_engine': settings.DATABASES['default']['ENGINE'].split('.')[-1],
        'timezone': settings.TIME_ZONE,
        'language_code': settings.LANGUAGE_CODE,
        'cors_enabled': 'corsheaders' in settings.INSTALLED_APPS,
        'jwt_enabled': 'rest_framework_simplejwt' in settings.INSTALLED_APPS,
        'oauth_enabled': bool(getattr(settings, 'SOCIAL_AUTH_GOOGLE_OAUTH2_KEY', None))
    }
    
    return Response(info_data)