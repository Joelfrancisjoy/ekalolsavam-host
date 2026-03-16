from rest_framework import serializers

from .models import ArtCategory, Level, ParticipationType, EventDefinition, EventVariant, EventRule


class ArtCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtCategory
        fields = '__all__'


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = '__all__'


class ParticipationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipationType
        fields = '__all__'


class EventVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventVariant
        fields = '__all__'


class EventDefinitionSerializer(serializers.ModelSerializer):
    category_details = ArtCategorySerializer(source='category', read_only=True)
    participation_type_details = ParticipationTypeSerializer(source='participation_type', read_only=True)

    class Meta:
        model = EventDefinition
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class EventRuleSerializer(serializers.ModelSerializer):
    event_details = EventDefinitionSerializer(source='event', read_only=True)
    variant_details = EventVariantSerializer(source='variant', read_only=True)
    level_details = LevelSerializer(source='level', read_only=True)

    class Meta:
        model = EventRule
        fields = '__all__'

    def validate(self, data):
        event = data.get('event') or getattr(self.instance, 'event', None)
        variant = data.get('variant') if 'variant' in data else getattr(self.instance, 'variant', None)
        level = data.get('level') or getattr(self.instance, 'level', None)

        if event is None:
            raise serializers.ValidationError('event is required')
        if level is None:
            raise serializers.ValidationError('level is required')

        if variant is not None and variant.event_id != event.id:
            raise serializers.ValidationError('variant must belong to the selected event')

        participation_type = getattr(event, 'participation_type', None)
        type_name = getattr(participation_type, 'type_name', None)
        min_p = data.get('min_participants') if 'min_participants' in data else getattr(self.instance, 'min_participants', None)
        max_p = data.get('max_participants') if 'max_participants' in data else getattr(self.instance, 'max_participants', None)

        if type_name == 'INDIVIDUAL':
            if max_p not in (None, 1):
                raise serializers.ValidationError('Individual events must have max_participants = 1')
            if min_p not in (None, 1):
                raise serializers.ValidationError('Individual events must have min_participants = 1')
        elif type_name == 'GROUP':
            if min_p is None or max_p is None:
                raise serializers.ValidationError('Group events must have min_participants and max_participants')
            if min_p < 2:
                raise serializers.ValidationError('Group events must have min_participants >= 2')
            if max_p < min_p:
                raise serializers.ValidationError('max_participants must be >= min_participants')

        return data
