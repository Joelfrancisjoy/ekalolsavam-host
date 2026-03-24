from rest_framework import serializers
from django.db.models import Q
from .models import Event, Venue, EventRegistration, Judge, ParticipantVerification
from .services.catalog_sync import (
    build_canonical_event_name_from_models,
    get_effective_level_codes,
    map_event_definition_category_to_event_category,
)

# It's generally better practice to import other serializers at the top level
# if you can resolve circular dependency issues, for example, by moving
# the UserSerializer to a common 'core' or 'utils' app.
# from users.serializers import UserSerializer


class JudgeSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = Judge
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_user_details(self, obj):
        from users.serializers import UserSerializer
        return UserSerializer(obj.user).data


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):
    venue_details = VenueSerializer(source='venue', read_only=True)
    judges_details = serializers.SerializerMethodField()
    volunteers_details = serializers.SerializerMethodField()
    created_by_details = serializers.SerializerMethodField()
    event_definition_details = serializers.SerializerMethodField()
    event_variant_details = serializers.SerializerMethodField()
    effective_level_codes = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_judges_details(self, obj):
        # Local import to avoid circular dependency
        from users.serializers import UserSerializer
        return UserSerializer(obj.judges.all(), many=True).data

    def get_volunteers_details(self, obj):
        from users.serializers import UserSerializer
        return UserSerializer(obj.volunteers.all(), many=True).data

    def get_created_by_details(self, obj):
        from users.serializers import UserSerializer
        return UserSerializer(obj.created_by).data

    def get_event_definition_details(self, obj):
        if not getattr(obj, 'event_definition_id', None):
            return None
        try:
            from catalog.serializers import EventDefinitionSerializer
            return EventDefinitionSerializer(obj.event_definition).data
        except Exception:
            return None

    def get_event_variant_details(self, obj):
        if not getattr(obj, 'event_variant_id', None):
            return None
        try:
            from catalog.serializers import EventVariantSerializer
            return EventVariantSerializer(obj.event_variant).data
        except Exception:
            return None

    def get_effective_level_codes(self, obj):
        return get_effective_level_codes(
            getattr(obj, 'event_definition', None),
            getattr(obj, 'event_variant', None),
        )

    def create(self, validated_data):
        event_definition = validated_data.get('event_definition')
        event_variant = validated_data.get('event_variant')
        if event_definition is not None:
            if event_variant is not None and event_variant.event_id != event_definition.id:
                raise serializers.ValidationError('event_variant must belong to the selected event_definition')

            validated_data['name'] = build_canonical_event_name_from_models(event_definition, event_variant)
            validated_data.setdefault('description', event_definition.event_name)
            validated_data['category'] = self._map_catalog_category_to_event_category(event_definition)

        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, data):
        event_definition = data.get('event_definition') if 'event_definition' in data else getattr(getattr(self, 'instance', None), 'event_definition', None)
        event_variant = data.get('event_variant') if 'event_variant' in data else getattr(getattr(self, 'instance', None), 'event_variant', None)

        venue = data.get('venue')
        date = data.get('date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        instance = getattr(self, 'instance', None)  # For update

        if event_definition is None and event_variant is not None:
            raise serializers.ValidationError('event_variant requires event_definition')

        if event_definition is not None:
            if event_variant is not None and event_variant.event_id != event_definition.id:
                raise serializers.ValidationError('event_variant must belong to the selected event_definition')

            max_participants = data.get('max_participants') if 'max_participants' in data else getattr(instance, 'max_participants', None)
            type_name = getattr(getattr(event_definition, 'participation_type', None), 'type_name', None)
            if type_name == 'INDIVIDUAL':
                if max_participants not in (None, 1):
                    raise serializers.ValidationError('Individual events must have max_participants = 1')
            elif type_name == 'GROUP':
                if max_participants is not None and int(max_participants) < 2:
                    raise serializers.ValidationError('Group events must have max_participants >= 2')

        # Check event limit per venue
        if venue:
            event_count = Event.objects.filter(venue=venue).count()
            if instance and instance.venue == venue:
                # If updating same venue, count remains
                pass
            elif event_count >= venue.event_limit:
                raise serializers.ValidationError(
                    f"Venue {venue.name} has reached the maximum limit of {venue.event_limit} events.")

        # Validate time window and duration
        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError(
                    "End time must be after start time.")

            # Enforce max 3 hours duration
            from datetime import datetime, date as date_cls
            dummy_date = date or date_cls.today()
            start_dt = datetime.combine(dummy_date, start_time)
            end_dt = datetime.combine(dummy_date, end_time)
            duration_hours = (end_dt - start_dt).total_seconds() / 3600.0
            if duration_hours > 3.0:
                raise serializers.ValidationError(
                    "Event duration cannot exceed 3 hours.")

            # Enforce allowed time window 09:00 to 20:00
            earliest = datetime.combine(
                dummy_date, datetime.strptime('09:00', '%H:%M').time())
            latest = datetime.combine(
                dummy_date, datetime.strptime('20:00', '%H:%M').time())
            if start_dt < earliest or end_dt > latest:
                raise serializers.ValidationError(
                    "Events must be scheduled between 09:00 and 20:00.")

        # Check time clash in the same venue/date
        if date and start_time and end_time and venue:
            clashing_events = Event.objects.filter(
                venue=venue,
                date=date
            ).exclude(
                pk=instance.pk if instance else None
            ).filter(
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            if clashing_events.exists():
                raise serializers.ValidationError(
                    "Time slot clashes with another event in the same venue.")

        return data

    def update(self, instance, validated_data):
        event_definition = validated_data.get('event_definition', getattr(instance, 'event_definition', None))
        event_variant = validated_data.get('event_variant', getattr(instance, 'event_variant', None))

        if event_definition is not None:
            if event_variant is not None and event_variant.event_id != event_definition.id:
                raise serializers.ValidationError('event_variant must belong to the selected event_definition')
            validated_data['name'] = build_canonical_event_name_from_models(event_definition, event_variant)
            validated_data.setdefault('description', event_definition.event_name)
            validated_data['category'] = self._map_catalog_category_to_event_category(event_definition)

        return super().update(instance, validated_data)

    def _map_catalog_category_to_event_category(self, event_definition):
        try:
            return map_event_definition_category_to_event_category(event_definition, strict=True)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def validate_volunteers(self, volunteers):
        # Ensure all assigned users are volunteers
        invalid = [u for u in volunteers if getattr(
            u, 'role', None) != 'volunteer']
        if invalid:
            raise serializers.ValidationError(
                'All assigned users in volunteers must have role="volunteer"')
        return volunteers


class EventRegistrationSerializer(serializers.ModelSerializer):
    # Read-only nested serializers for displaying details
    event_details = EventSerializer(source='event', read_only=True)
    participant_details = serializers.SerializerMethodField()

    # Extra write-only fields for validation during creation
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    group_id = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = EventRegistration
        fields = '__all__'
        # Mark participant as read-only so it's provided by the view (perform_create)
        # and not incorrectly required from the client payload.
        read_only_fields = ['registration_date', 'participant']

    def get_participant_details(self, obj):
        participant = obj.participant
        return {
            'id': participant.id,
            'first_name': participant.first_name,
            'last_name': participant.last_name,
            'username': participant.username,
            'email': participant.email,
            'section': participant.section,  # LP/UP/HS/HSS
            'student_class': participant.student_class,
            'school': {
                'id': participant.school.id if participant.school else None,
                'name': participant.school.name if participant.school else None,
                'category': participant.school.category if participant.school else None,
            } if participant.school else None,
        }

    def validate_first_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("First name is required.")

        name = value.strip()

        if ' ' in name:
            raise serializers.ValidationError(
                "Invalid Format: First name cannot contain spaces.")

        if not name.isalpha() or not name.isupper():
            raise serializers.ValidationError(
                "Invalid Character: First name must be uppercase letters only.")

        if len(name) < 1 or len(name) > 150:
            raise serializers.ValidationError(
                "First name must be between 1 and 150 characters.")

        return name

    def validate_last_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Last name is required.")

        name = value.strip()

        if ' ' in name:
            raise serializers.ValidationError(
                "Invalid Format: Last name cannot contain spaces.")

        if not name.isalpha() or not name.isupper():
            raise serializers.ValidationError(
                "Invalid Character: Last name must be uppercase letters only.")

        if len(name) < 1 or len(name) > 150:
            raise serializers.ValidationError(
                "Last name must be between 1 and 150 characters.")

        return name

    def validate(self, data):
        """
        Object-level validation to check if the provided name matches the logged-in user's name.
        Performs case-insensitive comparison to handle different capitalizations.
        """
        # Ensure the request object is available in the context
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            raise serializers.ValidationError(
                "Request context is missing for validation.")

        user = request.user
        first_name = data.get('first_name')
        last_name = data.get('last_name')

        # Check if names were provided
        if not first_name or not last_name:
            # This check is technically redundant if the fields are required, but it's good practice
            return data

        # Case-insensitive comparison: normalize both names to uppercase for comparison
        # User's name is stored in title case, input is uppercase letters only
        full_name_from_input = f"{first_name} {last_name}".upper()
        full_name_from_user = f"{user.first_name} {user.last_name}".upper()

        if full_name_from_input != full_name_from_user:
            raise serializers.ValidationError(
                f"Name Mismatch: The provided name '{first_name} {last_name}' does not match your registered name '{user.first_name} {user.last_name}'. "
                "Please use your exact registered name."
            )

        # Ensure the selected event is published before allowing registration
        selected_event = data.get('event')
        if selected_event is None:
            # Attempt to resolve from initial_data if not in validated data yet
            event_id = self.initial_data.get('event') if hasattr(
                self, 'initial_data') else None
            if event_id:
                try:
                    from .models import Event
                    selected_event = Event.objects.get(pk=event_id)
                except Exception:
                    selected_event = None

        if selected_event is None:
            raise serializers.ValidationError(
                "A valid event must be provided for registration.")

        # Check if event is in the right status for registration
        if getattr(selected_event, 'status', 'draft') != 'published':
            raise serializers.ValidationError(
                "Registration is only allowed for published events.")

        # Prevent duplicate registrations for the same event/user
        from .models import EventRegistration as ER
        if ER.objects.filter(event=selected_event, participant=user).exists():
            raise serializers.ValidationError(
                "You are already registered for this event.")

        is_group_event = self._is_group_event(selected_event)
        try:
            if getattr(user, 'role', None) == 'student':
                if is_group_event:
                    resolved_group = self._resolve_group_entry_for_student_group_event(user, selected_event)
                    data['_resolved_group_entry'] = resolved_group
                else:
                    registration_id = (getattr(user, 'registration_id', None) or '').strip()
                    participant_pk = None
                    if registration_id.startswith('SPP-'):
                        try:
                            participant_pk = int(registration_id.split('-', 1)[1])
                        except Exception:
                            participant_pk = None

                    if participant_pk is None:
                        raise serializers.ValidationError(
                            'Your school-approved event selection was not found. Please contact your school coordinator.')

                    from users.workflow_models import SchoolParticipant
                    participant = SchoolParticipant.objects.prefetch_related('events').filter(pk=participant_pk).first()
                    if participant is None:
                        raise serializers.ValidationError(
                            'Your school-approved event selection was not found. Please contact your school coordinator.')

                    allowed_event_ids = set(participant.events.values_list('id', flat=True))
                    if selected_event.id not in allowed_event_ids:
                        raise serializers.ValidationError(
                            'You are not allowed to register for this event. It was not selected by your school.')
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError('Unable to validate school-approved event selection. Please try again later.')

        self._validate_catalog_gender_eligibility(user=user, selected_event=selected_event)

        return data

    def create(self, validated_data):
        # Remove write-only fields not present on the model
        resolved_group_entry = validated_data.pop('_resolved_group_entry', None)
        validated_data.pop('group_id', None)
        validated_data.pop('first_name', None)
        validated_data.pop('last_name', None)

        if resolved_group_entry is not None:
            validated_data['school_group_entry'] = resolved_group_entry
            validated_data['group_reference_id'] = resolved_group_entry.group_id
            validated_data['group_leader_name'] = resolved_group_entry.leader_full_name

        return super().create(validated_data)

    def _is_group_event(self, selected_event):
        event_definition = getattr(selected_event, 'event_definition', None)
        participation_type = getattr(event_definition, 'participation_type', None)
        return getattr(participation_type, 'type_name', None) == 'GROUP'

    def _resolve_group_entry_for_student_group_event(self, user, selected_event):
        group_id = (self.initial_data.get('group_id') or '').strip().upper()
        if not group_id:
            raise serializers.ValidationError(
                'group_id is required for group event registration.'
            )

        if getattr(user, 'school', None) is None:
            raise serializers.ValidationError(
                'Your school profile is missing. Please contact your coordinator.'
            )

        full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()

        from users.workflow_models import SchoolGroupEntry
        group_entry = SchoolGroupEntry.objects.filter(
            school__school=user.school,
            status='approved',
            group_id__iexact=group_id,
            events=selected_event,
        ).filter(
            Q(leader_user=user) |
            (Q(leader_user__isnull=True) & Q(leader_full_name__iexact=full_name))
        ).first()

        if group_entry is None:
            raise serializers.ValidationError(
                'You are not authorized to register this group for the selected event.'
            )

        return group_entry

    def _validate_catalog_gender_eligibility(self, user, selected_event):
        # Enforce only for student registrations on catalog-linked events.
        if getattr(user, 'role', None) != 'student':
            return

        if getattr(selected_event, 'event_definition_id', None) is None:
            return

        section = getattr(user, 'section', None)
        if not section:
            raise serializers.ValidationError(
                'Your class/section is missing. Please contact your school coordinator.'
            )

        from catalog.models import EventRule

        base_rules_qs = EventRule.objects.filter(
            event_id=selected_event.event_definition_id,
            level__level_code=section,
        )

        if getattr(selected_event, 'event_variant_id', None):
            variant_specific_qs = base_rules_qs.filter(variant_id=selected_event.event_variant_id)
            rules_qs = variant_specific_qs if variant_specific_qs.exists() else base_rules_qs.filter(variant__isnull=True)
        else:
            default_rules_qs = base_rules_qs.filter(variant__isnull=True)
            rules_qs = default_rules_qs if default_rules_qs.exists() else base_rules_qs.filter(variant__isnull=False)

        eligible_genders = set(rules_qs.values_list('gender_eligibility', flat=True))
        if not eligible_genders:
            raise serializers.ValidationError(
                'No eligibility rule is configured for your level in this event.'
            )

        if 'MIXED' in eligible_genders:
            return

        participant_gender = (getattr(user, 'gender', None) or '').strip().upper()
        if not participant_gender:
            raise serializers.ValidationError(
                'Your gender is not set. Please update your profile before registering for this event.'
            )

        if participant_gender not in {'BOYS', 'GIRLS'}:
            raise serializers.ValidationError(
                'Your gender value is invalid. Please contact admin.'
            )

        if participant_gender not in eligible_genders:
            raise serializers.ValidationError(
                'You are not eligible to register for this event based on gender.'
            )


class ParticipantVerificationSerializer(serializers.ModelSerializer):
    participant_details = serializers.SerializerMethodField()
    volunteer_details = serializers.SerializerMethodField()
    event_details = serializers.SerializerMethodField()

    class Meta:
        model = ParticipantVerification
        fields = '__all__'
        read_only_fields = ['verification_time', 'volunteer']

    def get_participant_details(self, obj):
        participant = obj.participant
        return {
            'id': participant.id,
            'first_name': participant.first_name,
            'last_name': participant.last_name,
            'username': participant.username,
            'email': participant.email,
            'section': participant.section,  # LP/UP/HS/HSS
            'student_class': participant.student_class,
            'school': {
                'id': participant.school.id if participant.school else None,
                'name': participant.school.name if participant.school else None,
                'category': participant.school.category if participant.school else None,
            } if participant.school else None,
        }

    def get_volunteer_details(self, obj):
        from users.serializers import UserSerializer
        return UserSerializer(obj.volunteer).data

    def get_event_details(self, obj):
        return EventSerializer(obj.event).data
