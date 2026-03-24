from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/catalog/', include('catalog.urls')),
    path('api/events/', include('events.urls')),
    path('api/scores/', include('scores.urls')),
    path('api/certificates/', include('certificates.urls')),
    path('api/feedback/', include('feedback.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/volunteers/', include('volunteers.urls')),
    path('api/emergencies/', include('emergencies.urls')),
    path('api/', include('core.urls')),  # Health check and system info
    path('api/schema/', SpectacularAPIView.as_view(), name='api-schema'),
    path('api/schema/docs/', SpectacularSwaggerView.as_view(url_name='api-schema'), name='api-schema-docs'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/', include('social_django.urls', namespace='social')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
