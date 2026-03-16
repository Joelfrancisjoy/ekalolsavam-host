from django.urls import path

from .views import (
    ArtCategoryListCreateView,
    LevelListView,
    ParticipationTypeListView,
    EventDefinitionListCreateView,
    EventDefinitionDetailView,
    EventVariantListCreateView,
    EventRuleListCreateView,
    EventRuleDetailView,
)

urlpatterns = [
    path('categories/', ArtCategoryListCreateView.as_view(), name='catalog-categories'),
    path('levels/', LevelListView.as_view(), name='catalog-levels'),
    path('participation-types/', ParticipationTypeListView.as_view(), name='catalog-participation-types'),

    path('events/', EventDefinitionListCreateView.as_view(), name='catalog-events'),
    path('events/<int:pk>/', EventDefinitionDetailView.as_view(), name='catalog-event-detail'),
    path('events/<int:event_id>/variants/', EventVariantListCreateView.as_view(), name='catalog-event-variants'),

    path('event-rules/', EventRuleListCreateView.as_view(), name='catalog-event-rules'),
    path('event-rules/<int:pk>/', EventRuleDetailView.as_view(), name='catalog-event-rule-detail'),
]
