from django.urls import path
from .views import FeedbackListView, FeedbackCreateView, sentiment_analytics, analyze_text, AdminFeedbackListView

urlpatterns = [
    path('', FeedbackListView.as_view(), name='feedback-list'),
    path('create/', FeedbackCreateView.as_view(), name='feedback-create'),
    path('submit/', FeedbackCreateView.as_view(), name='feedback-submit'),  # Alias for create
    path('sentiment-analytics/', sentiment_analytics, name='sentiment-analytics'),
    path('admin/summary/', sentiment_analytics, name='admin-feedback-summary'),  # Alias for analytics
    path('analyze-text/', analyze_text, name='analyze-text'),
    path('analyze/', analyze_text, name='analyze'),  # Alias for analyze
    path('admin/list/', AdminFeedbackListView.as_view(), name='admin-feedback-list'),
]