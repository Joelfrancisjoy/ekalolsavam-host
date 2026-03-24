from datetime import datetime, time, timedelta
from io import StringIO

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from catalog.models import EventDefinition
from events.models import Event, Venue
from events.services.catalog_sync import (
    build_canonical_event_name_from_models,
    map_event_definition_category_to_event_category,
)
from users.models import User

TARGET_SET_GROUP = "group"
TARGET_SET_MATRIX = "matrix"
DEFAULT_TARGET_SET = TARGET_SET_GROUP

TARGET_GROUP_EVENT_NAMES = [
    "Group Song",
    "Vanchippattu",
    "Panchavadyam",
    "Band",
    "Western Music Group / Jazz / Triple",
    "Group Dance",
    "Western Dance",
    "Folk Dance",
    "Oppana",
    "Kolkali",
    "Duffmuttu",
    "Thiruvathirakkali",
    "Margamkali",
    "Parichamuttukali",
    "Poorakkali",
    "Drama",
    "Skit",
    "Chavittu Nadakam",
    "Yakshagana",
]

TARGET_INDIVIDUAL_EVENT_NAMES = [
    "Speech",
    "Poetry Recitation",
    "Essay Writing",
    "Classical Music",
    "Light Music",
    "Bharatanatyam",
    "Mohiniyattam",
    "Kuchipudi",
    "Mono Act",
    "Mime",
    "Oil Painting",
    "Painting - Water Colour",
    "Story Writing",
    "Poetry Writing",
    "Mappila Song",
    "Ghazal",
    "Pencil Drawing",
    "Cartoon",
    "Collage",
    "Colouring",
    "Mimicry",
    "Violin (Eastern)",
    "Instrumental Music",
]

TARGET_MATRIX_EVENT_NAMES = TARGET_GROUP_EVENT_NAMES + TARGET_INDIVIDUAL_EVENT_NAMES
TARGET_EVENT_NAME_ALIASES = {
    "Western Music Group / Jazz / Triple": ["Western Band / Jazz / Triple"],
}

AUTO_PROVISION_DESCRIPTION_PREFIX = "[AUTO-PROVISIONED GROUP EVENT]"
DEFAULT_VENUE_NAME = "Group Events Main Venue"
DEFAULT_VENUE_LOCATION = "Main Kalolsavam Venue"
DEFAULT_SLOT_MINUTES = 120
DEFAULT_FALLBACK_MAX_PARTICIPANTS = 30
DAY_END_TIME = time(20, 0)


class Command(BaseCommand):
    help = (
        "Create/publish scheduled events for the configured matrix targets with "
        "deterministic auto-slot scheduling. Defaults to GROUP targets for backward "
        "compatibility; use --target-set matrix for GROUP+INDIVIDUAL provisioning."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--target-set",
            choices=[TARGET_SET_GROUP, TARGET_SET_MATRIX],
            default=DEFAULT_TARGET_SET,
            help="Target set to provision: group (default) or matrix (group + individual).",
        )
        parser.add_argument(
            "--admin-username",
            help="Preferred active admin username to use as created_by.",
        )
        parser.add_argument(
            "--skip-catalog-seed",
            action="store_true",
            help="Skip running load_catalog_seed before provisioning.",
        )
        parser.add_argument(
            "--start-date",
            help="Provisioning start date in YYYY-MM-DD format (default: today).",
        )
        parser.add_argument(
            "--start-time",
            default="09:00",
            help="Provisioning start time in HH:MM or HH:MM:SS format (default: 09:00).",
        )
        parser.add_argument(
            "--slot-minutes",
            type=int,
            default=DEFAULT_SLOT_MINUTES,
            help="Duration for each provisioned slot in minutes (default: 120).",
        )
        parser.add_argument(
            "--default-max-participants",
            type=int,
            default=DEFAULT_FALLBACK_MAX_PARTICIPANTS,
            help="Fallback max_participants when catalog rules do not provide one.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview actions without writing changes.",
        )

    def handle(self, *args, **options):
        target_set = options["target_set"]
        target_event_names, required_participation_types, target_label = self._resolve_target_set(
            target_set
        )
        required_event_count = len(target_event_names)

        dry_run = options["dry_run"]
        start_date = self._parse_start_date(options.get("start_date"))
        start_time = self._parse_time_value(options.get("start_time"), label="start-time")
        slot_minutes = options["slot_minutes"]
        fallback_max_participants = options["default_max_participants"]

        if slot_minutes <= 0:
            raise CommandError("--slot-minutes must be greater than 0.")
        if slot_minutes > 180:
            raise CommandError("--slot-minutes must be 180 or less.")
        if fallback_max_participants < 2:
            raise CommandError("--default-max-participants must be at least 2.")
        if start_time >= DAY_END_TIME:
            raise CommandError(
                f"--start-time must be earlier than {DAY_END_TIME.strftime('%H:%M:%S')}."
            )

        catalog_status = self._ensure_catalog_seed(
            skip_seed=options["skip_catalog_seed"],
            dry_run=dry_run,
        )
        creator, used_fallback_admin = self._resolve_creator_admin(options.get("admin_username"))
        venue, venue_action = self._ensure_default_venue(
            dry_run=dry_run,
            required_event_count=required_event_count,
        )

        target_definitions, alias_resolutions = self._load_target_event_definitions(
            target_names=target_event_names,
            required_participation_types=required_participation_types,
        )
        schedule = self._build_schedule(
            start_date=start_date,
            start_time=start_time,
            slot_minutes=slot_minutes,
            count=required_event_count,
        )
        target_definition_ids = [definition.id for _, definition in target_definitions]
        auto_events_by_definition, duplicate_auto_events = self._load_existing_auto_events(
            target_definition_ids=target_definition_ids
        )

        created_count = 0
        updated_count = 0
        unchanged_count = 0
        schedule_actions = []

        for index, (target_name, definition) in enumerate(target_definitions):
            slot_date, slot_start, slot_end = schedule[index]
            target_fields = self._build_target_fields(
                event_definition=definition,
                venue=venue,
                creator=creator,
                slot_date=slot_date,
                slot_start=slot_start,
                slot_end=slot_end,
                fallback_max_participants=fallback_max_participants,
            )

            current_event = auto_events_by_definition.get(definition.id)
            if current_event is None:
                action = "create"
                created_count += 1
                if not dry_run:
                    Event.objects.create(**target_fields)
            else:
                changed_fields = self._collect_event_changes(current_event, target_fields)
                if changed_fields:
                    action = "update"
                    updated_count += 1
                    if not dry_run:
                        current_event.save(update_fields=changed_fields)
                else:
                    action = "unchanged"
                    unchanged_count += 1

            schedule_actions.append(
                (
                    target_name,
                    action,
                    slot_date.isoformat(),
                    slot_start.strftime("%H:%M"),
                    slot_end.strftime("%H:%M"),
                )
            )

        mode = "DRY RUN" if dry_run else "APPLY"
        self.stdout.write(self.style.SUCCESS(f"{target_label} event provisioning complete ({mode})."))
        self.stdout.write(f"Catalog seed: {catalog_status}")
        self.stdout.write(
            f"Target set: {target_set} "
            f"(participation types: {', '.join(sorted(required_participation_types))})"
        )
        self.stdout.write(
            f"Admin user: {creator.username}"
            + (" (fallback)" if used_fallback_admin else "")
        )
        self.stdout.write(
            f"Default venue: {DEFAULT_VENUE_NAME} "
            f"(action: {venue_action}, capacity={venue.capacity}, event_limit={venue.event_limit})"
        )
        if alias_resolutions:
            for canonical_name, resolved_name in alias_resolutions:
                self.stdout.write(
                    self.style.WARNING(
                        f"Using alias definition '{resolved_name}' for target '{canonical_name}'."
                    )
                )
        if duplicate_auto_events:
            self.stdout.write(
                self.style.WARNING(
                    f"Found {duplicate_auto_events} extra auto-provisioned duplicate event rows."
                )
            )
        self.stdout.write(f"Events targeted: {required_event_count}")
        self.stdout.write(f" - create: {created_count}")
        self.stdout.write(f" - update: {updated_count}")
        self.stdout.write(f" - unchanged: {unchanged_count}")

        for definition_name, action, date_value, start_value, end_value in schedule_actions:
            self.stdout.write(
                f"[{action}] {definition_name}: {date_value} {start_value}-{end_value}"
            )

    def _resolve_target_set(self, target_set):
        normalized_target_set = (target_set or DEFAULT_TARGET_SET).lower()
        if normalized_target_set == TARGET_SET_GROUP:
            return TARGET_GROUP_EVENT_NAMES, {"GROUP"}, "Group"
        if normalized_target_set == TARGET_SET_MATRIX:
            return TARGET_MATRIX_EVENT_NAMES, {"GROUP", "INDIVIDUAL"}, "Matrix"
        raise CommandError(
            f"Unsupported --target-set '{target_set}'. Expected one of: "
            f"{TARGET_SET_GROUP}, {TARGET_SET_MATRIX}."
        )

    def _ensure_catalog_seed(self, skip_seed, dry_run):
        if skip_seed:
            return "skipped (--skip-catalog-seed)"
        if dry_run:
            return "dry-run (would run load_catalog_seed)"

        captured_output = StringIO()
        call_command("load_catalog_seed", verbosity=0, stdout=captured_output)
        return "loaded"

    def _resolve_creator_admin(self, preferred_username):
        active_admins = User.objects.filter(role="admin", is_active=True).order_by("id")
        preferred_admin = None
        if preferred_username:
            preferred_admin = active_admins.filter(username=preferred_username).first()

        if preferred_admin is not None:
            return preferred_admin, False

        fallback_admin = active_admins.first()
        if fallback_admin is None:
            raise CommandError(
                "No active admin user found. Provide --admin-username for an active admin "
                "or create an active admin account."
            )

        used_fallback_admin = bool(preferred_username)
        return fallback_admin, used_fallback_admin

    def _ensure_default_venue(self, dry_run, required_event_count):
        required_capacity = max(1000, required_event_count)
        required_event_limit = required_event_count

        venue = Venue.objects.filter(name=DEFAULT_VENUE_NAME).first()
        if venue is None:
            if dry_run:
                return (
                    Venue(
                        name=DEFAULT_VENUE_NAME,
                        location=DEFAULT_VENUE_LOCATION,
                        capacity=required_capacity,
                        event_limit=required_event_limit,
                    ),
                    "would_create",
                )
            venue = Venue.objects.create(
                name=DEFAULT_VENUE_NAME,
                location=DEFAULT_VENUE_LOCATION,
                capacity=required_capacity,
                event_limit=required_event_limit,
            )
            return venue, "created"

        update_fields = []
        if not venue.location:
            venue.location = DEFAULT_VENUE_LOCATION
            update_fields.append("location")
        if venue.capacity < required_capacity:
            venue.capacity = required_capacity
            update_fields.append("capacity")
        if venue.event_limit < required_event_limit:
            venue.event_limit = required_event_limit
            update_fields.append("event_limit")

        if not update_fields:
            return venue, "unchanged"

        if dry_run:
            return venue, "would_update"

        venue.save(update_fields=update_fields)
        return venue, "updated"

    def _load_target_event_definitions(self, target_names, required_participation_types):
        candidate_names = set(target_names)
        for aliases in TARGET_EVENT_NAME_ALIASES.values():
            candidate_names.update(aliases)

        definitions_qs = (
            EventDefinition.objects.select_related("category", "participation_type")
            .prefetch_related("rules")
            .filter(
                event_name__in=candidate_names,
                participation_type__type_name__in=required_participation_types,
            )
        )
        definitions_by_name = {definition.event_name: definition for definition in definitions_qs}

        target_definitions = []
        missing_names = []
        alias_resolutions = []
        resolved_definition_ids = set()

        for target_name in target_names:
            definition = definitions_by_name.get(target_name)
            if definition is None:
                for alias_name in TARGET_EVENT_NAME_ALIASES.get(target_name, []):
                    definition = definitions_by_name.get(alias_name)
                    if definition is not None:
                        alias_resolutions.append((target_name, alias_name))
                        break

            if definition is None:
                missing_names.append(target_name)
                continue

            if definition.id in resolved_definition_ids:
                raise CommandError(
                    f"Multiple target names resolved to the same catalog definition: "
                    f"'{target_name}' ({definition.event_name})."
                )

            resolved_definition_ids.add(definition.id)
            target_definitions.append((target_name, definition))

        if missing_names:
            types_label = ", ".join(sorted(required_participation_types))
            raise CommandError(
                f"Missing {types_label} event definitions for: " + ", ".join(sorted(missing_names))
            )

        return target_definitions, alias_resolutions

    def _build_schedule(self, start_date, start_time, slot_minutes, count):
        slot_delta = timedelta(minutes=slot_minutes)
        current_date = start_date
        current_time = start_time
        schedule = []

        while len(schedule) < count:
            start_dt = datetime.combine(current_date, current_time)
            end_dt = start_dt + slot_delta
            day_end_dt = datetime.combine(current_date, DAY_END_TIME)

            if end_dt > day_end_dt:
                current_date += timedelta(days=1)
                current_time = start_time
                continue

            schedule.append((current_date, current_time, end_dt.time()))
            current_time = end_dt.time()

        return schedule

    def _load_existing_auto_events(self, target_definition_ids):
        existing_auto_events = (
            Event.objects.filter(
                event_definition_id__in=target_definition_ids,
                event_variant__isnull=True,
                description__startswith=AUTO_PROVISION_DESCRIPTION_PREFIX,
            )
            .select_related("venue", "created_by")
            .order_by("event_definition_id", "id")
        )

        event_map = {}
        duplicate_count = 0
        for event in existing_auto_events:
            if event.event_definition_id in event_map:
                duplicate_count += 1
                continue
            event_map[event.event_definition_id] = event

        return event_map, duplicate_count

    def _build_target_fields(
        self,
        event_definition,
        venue,
        creator,
        slot_date,
        slot_start,
        slot_end,
        fallback_max_participants,
    ):
        max_name_length = Event._meta.get_field("name").max_length
        canonical_name = build_canonical_event_name_from_models(
            event_definition,
            event_variant=None,
            max_length=max_name_length,
        )
        mapped_category = map_event_definition_category_to_event_category(
            event_definition,
            strict=True,
        )
        max_participants = self._resolve_max_participants(
            event_definition,
            fallback=fallback_max_participants,
        )

        return {
            "name": canonical_name,
            "description": (
                f"{AUTO_PROVISION_DESCRIPTION_PREFIX} {event_definition.event_name}"
            ),
            "category": mapped_category,
            "event_definition": event_definition,
            "event_variant": None,
            "date": slot_date,
            "start_time": slot_start,
            "end_time": slot_end,
            "venue": venue,
            "max_participants": max_participants,
            "created_by": creator,
            "status": "published",
        }

    def _resolve_max_participants(self, event_definition, fallback):
        base_rule_max_values = [
            value
            for value in event_definition.rules.filter(variant__isnull=True).values_list(
                "max_participants",
                flat=True,
            )
            if value is not None
        ]
        if base_rule_max_values:
            return max(base_rule_max_values)

        any_rule_max_values = [
            value
            for value in event_definition.rules.values_list("max_participants", flat=True)
            if value is not None
        ]
        if any_rule_max_values:
            return max(any_rule_max_values)

        return fallback

    def _collect_event_changes(self, event, target_fields):
        changed_fields = []

        for field_name, target_value in target_fields.items():
            if field_name in {"event_definition", "event_variant", "venue", "created_by"}:
                current_value = getattr(event, f"{field_name}_id", None)
                target_id = getattr(target_value, "id", None)
                if target_id is None:
                    if field_name == "venue":
                        current_name = getattr(getattr(event, "venue", None), "name", None)
                        target_name = getattr(target_value, "name", None)
                        if current_name != target_name:
                            setattr(event, field_name, target_value)
                            changed_fields.append(field_name)
                    elif current_value is not None:
                        setattr(event, field_name, target_value)
                        changed_fields.append(field_name)
                    continue

                if current_value != target_id:
                    setattr(event, field_name, target_value)
                    changed_fields.append(field_name)
                continue

            if getattr(event, field_name) != target_value:
                setattr(event, field_name, target_value)
                changed_fields.append(field_name)

        return changed_fields

    def _parse_start_date(self, value):
        if not value:
            return timezone.localdate()
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError as exc:
            raise CommandError("--start-date must be in YYYY-MM-DD format.") from exc

    def _parse_time_value(self, value, label):
        for fmt in ("%H:%M", "%H:%M:%S"):
            try:
                return datetime.strptime(value, fmt).time()
            except ValueError:
                continue
        raise CommandError(f"--{label} must be in HH:MM or HH:MM:SS format.")
