from django.urls import path
from .views import FeedbackListView, FeedbackCreateView, sentiment_analytics, analyze_text

urlpatterns = [
    path('', FeedbackListView.as_view(), name='feedback-list'),
    path('create/', FeedbackCreateView.as_view(), name='feedback-create'),
    path('sentiment-analytics/', sentiment_analytics, name='sentiment-analytics'),
    path('analyze-text/', analyze_text, name='analyze-text'),
]