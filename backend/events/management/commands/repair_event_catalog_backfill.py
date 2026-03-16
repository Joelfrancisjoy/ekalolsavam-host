from django.core.management.base import BaseCommand

from events.models import Event
from events.services.catalog_sync import repair_event_catalog_records


class Command(BaseCommand):
    help = (
        "Repair event records to match linked catalog definitions "
        "(canonical name/category and valid variant linkage)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without writing to the database.",
        )
        parser.add_argument(
            "--event-id",
            type=int,
            help="Repair only one event by ID.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        event_id = options.get("event_id")

        queryset = Event.objects.all()
        if event_id is not None:
            queryset = queryset.filter(pk=event_id)

        stats = repair_event_catalog_records(queryset=queryset, dry_run=dry_run)

        mode = "DRY RUN" if dry_run else "APPLY"
        self.stdout.write(self.style.SUCCESS(f"Catalog backfill repair complete ({mode})"))
        self.stdout.write(f"Inspected events: {stats['inspected_events']}")
        self.stdout.write(f"Updated events: {stats['updated_events']}")
        self.stdout.write(f" - name updates: {stats['updated_name']}")
        self.stdout.write(f" - category updates: {stats['updated_category']}")
        self.stdout.write(f" - cleared invalid variants: {stats['cleared_invalid_variant']}")
        self.stdout.write(f" - cleared orphan variants: {stats['cleared_orphan_variant']}")
        self.stdout.write(f" - unknown catalog categories: {stats['unknown_catalog_category']}")
