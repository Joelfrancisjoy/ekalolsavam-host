from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsAdminRole

from .models import ArtCategory, Level, ParticipationType, EventDefinition, EventVariant, EventRule
from .serializers import (
    ArtCategorySerializer,
    LevelSerializer,
    ParticipationTypeSerializer,
    EventDefinitionSerializer,
    EventVariantSerializer,
    EventRuleSerializer,
)


class ArtCategoryListCreateView(generics.ListCreateAPIView):
    queryset = ArtCategory.objects.all().order_by('category_name')
    serializer_class = ArtCategorySerializer

    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class LevelListView(generics.ListAPIView):
    queryset = Level.objects.all().order_by('level_code')
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]


class ParticipationTypeListView(generics.ListAPIView):
    queryset = ParticipationType.objects.all().order_by('type_name')
    serializer_class = ParticipationTypeSerializer
    permission_classes = [IsAuthenticated]


class EventDefinitionListCreateView(generics.ListCreateAPIView):
    queryset = EventDefinition.objects.select_related('category', 'participation_type').all().order_by('event_code')
    serializer_class = EventDefinitionSerializer

    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class EventDefinitionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EventDefinition.objects.select_related('category', 'participation_type').all()
    serializer_class = EventDefinitionSerializer

    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class EventVariantListCreateView(generics.ListCreateAPIView):
    serializer_class = EventVariantSerializer

    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get_queryset(self):
        event_id = self.kwargs.get('event_id')
        return EventVariant.objects.filter(event_id=event_id).order_by('variant_name')

    def perform_create(self, serializer):
        event_id = self.kwargs.get('event_id')
        serializer.save(event_id=event_id)


class EventRuleListCreateView(generics.ListCreateAPIView):
    queryset = EventRule.objects.select_related('event', 'variant', 'level').all()
    serializer_class = EventRuleSerializer

    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class EventRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EventRule.objects.select_related('event', 'variant', 'level').all()
    serializer_class = EventRuleSerializer

    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        return [IsAdminRole()]
