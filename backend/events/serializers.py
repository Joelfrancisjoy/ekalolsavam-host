from rest_framework import serializers
from .models import Event, Venue, EventRegistration, Judge, ParticipantVerification

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

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, data):
        venue = data.get('venue')
        date = data.get('date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        instance = getattr(self, 'instance', None)  # For update

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

        return data

    def create(self, validated_data):
        # Remove write-only fields not present on the model
        validated_data.pop('first_name', None)
        validated_data.pop('last_name', None)
        return super().create(validated_data)


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
