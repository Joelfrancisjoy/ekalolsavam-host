"""
seed_data — Automated relational database seeding using factory_boy.

Discovers factory classes across all installed Django apps and generates
realistic relational datasets respecting FK, O2O, and M2M dependencies.

Usage:
    python manage.py seed_data                    # Seed with default count (50)
    python manage.py seed_data --count 200        # Seed 200 root entities per factory group
    python manage.py seed_data --clear            # Clear seeded data first, then seed
    python manage.py seed_data --clear --count 0  # Only clear, don't seed
"""

import importlib
import inspect
import sys
import time

import factory
from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection, transaction


# ---------------------------------------------------------------------------
# Ordered seed plan — respects FK / O2O / M2M dependency order.
# Each entry: (factory_dotpath, count_multiplier)
#   count_multiplier is relative to --count.  E.g. 1.0 → same as count,
#   0.1 → 10 % of count.  Use 0 for factories that are created only as
#   sub-factories (i.e. don't seed directly).
# ---------------------------------------------------------------------------
SEED_PLAN = [
    # --- Foundation models (no FK deps) ---
    ("users.factories.SchoolFactory", 0.2),
    ("events.factories.VenueFactory", 0.15),
    ("notifications.factories.EmailTemplateFactory", 0.05),
    # --- Users (FK → School) ---
    ("users.factories.StudentFactory", 1.0),
    ("users.factories.JudgeUserFactory", 0.15),
    ("users.factories.VolunteerUserFactory", 0.2),
    ("users.factories.AdminUserFactory", 0.05),
    # --- Events (FK → Venue, User; M2M → User) ---
    ("events.factories.EventFactory", 0.3),
    ("events.factories.JudgeProfileFactory", 0.1),
    # --- Event-dependent models ---
    ("events.factories.EventRegistrationFactory", 0.8),
    ("events.factories.ParticipantVerificationFactory", 0.3),
    # --- Scores & Results ---
    ("scores.factories.ScoreFactory", 0.6),
    ("scores.factories.ResultFactory", 0.4),
    ("scores.factories.RecheckRequestFactory", 0.1),
    ("scores.factories.RazorpayPaymentFactory", 0.05),
    # --- Volunteers ---
    ("volunteers.factories.VolunteerShiftFactory", 0.2),
    ("volunteers.factories.VolunteerAssignmentFactory", 0.15),
    # --- Feedback / Notifications / Emergencies / Certificates ---
    ("feedback.factories.FeedbackFactory", 0.3),
    ("notifications.factories.NotificationFactory", 0.5),
    ("emergencies.factories.EmergencyFactory", 0.1),
    ("certificates.factories.CertificateFactory", 0.2),
]

# Models to clear in reverse-dependency order (child → parent).
CLEAR_ORDER = [
    "scores.RazorpayPayment",
    "scores.RecheckRequest",
    "scores.Score",
    "scores.Result",
    "certificates.Certificate",
    "emergencies.Emergency",
    "feedback.Feedback",
    "notifications.Notification",
    "notifications.EmailTemplate",
    "volunteers.VolunteerAssignment",
    "volunteers.VolunteerShift",
    "events.ParticipantVerification",
    "events.EventRegistration",
    "events.Judge",
    "events.Event",
    "events.Venue",
    "users.AllowedEmail",
    "users.User",
    "users.School",
]


def _import_factory(dotpath: str):
    """Import a factory class from a dotted path like 'users.factories.SchoolFactory'."""
    module_path, cls_name = dotpath.rsplit(".", 1)
    module = importlib.import_module(module_path)
    return getattr(module, cls_name)


def _discover_extra_factories():
    """
    Auto-discover factory classes in <app>/factories.py for any installed app
    that is NOT already covered by SEED_PLAN.  Returns a list of factory classes.
    """
    covered = {path for path, _ in SEED_PLAN}
    extras = []
    for app_config in apps.get_app_configs():
        module_name = f"{app_config.name}.factories"
        if module_name.rsplit(".", 1)[0] + ".factories" in {
            p.rsplit(".", 1)[0] + ".factories" for p in covered
        }:
            # Module already represented in SEED_PLAN — skip auto-discover
            # (individual classes may still be missing, but that's fine)
            continue
        try:
            module = importlib.import_module(module_name)
        except ImportError:
            continue
        for name, obj in inspect.getmembers(module, inspect.isclass):
            # Only pick up factories *defined* in this module (not imports)
            if (
                issubclass(obj, factory.django.DjangoModelFactory)
                and obj is not factory.django.DjangoModelFactory
                and obj.__module__ == module_name
            ):
                dotpath = f"{module_name}.{name}"
                if dotpath not in covered:
                    extras.append(dotpath)
    return extras


class Command(BaseCommand):
    help = "Seed the database with realistic relational data using factory_boy."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="Base count of root entities to generate (default: 50). "
            "Dependent models scale relative to this number.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing development data before seeding.",
        )

    def handle(self, *args, **options):
        count = options["count"]
        clear = options["clear"]
        verbosity = options["verbosity"]

        if clear:
            self._clear_data(verbosity)

        if count > 0:
            self._seed_data(count, verbosity)

        self.stdout.write(self.style.SUCCESS("\n✔ Seeding complete."))

    # ------------------------------------------------------------------
    # Clear
    # ------------------------------------------------------------------
    def _clear_data(self, verbosity):
        self.stdout.write(self.style.WARNING("\n🗑  Clearing existing data…"))
        total_deleted = 0
        for label in CLEAR_ORDER:
            try:
                model = apps.get_model(label)
            except LookupError:
                if verbosity >= 2:
                    self.stdout.write(f"  ⏭  {label} — model not found, skipping")
                continue

            # Protect superusers from deletion
            qs = model.objects.all()
            if label == "users.User":
                qs = qs.filter(is_superuser=False)

            n, _ = qs.delete()
            total_deleted += n
            if verbosity >= 2 or n > 0:
                self.stdout.write(f"  🗑  {label}: deleted {n} rows")

        self.stdout.write(
            self.style.WARNING(f"  Total rows deleted: {total_deleted}")
        )

    # ------------------------------------------------------------------
    # Seed
    # ------------------------------------------------------------------
    def _seed_data(self, count, verbosity):
        self.stdout.write(self.style.HTTP_INFO(f"\n🌱 Seeding with base count={count}…\n"))

        plan = list(SEED_PLAN)

        # Auto-discover extra factories not in SEED_PLAN
        extras = _discover_extra_factories()
        for dotpath in extras:
            plan.append((dotpath, 0.2))
            if verbosity >= 2:
                self.stdout.write(f"  🔍 Auto-discovered: {dotpath}")

        total_created = 0
        t0 = time.time()

        for dotpath, multiplier in plan:
            n = max(1, int(count * multiplier))
            try:
                factory_cls = _import_factory(dotpath)
            except (ImportError, AttributeError) as exc:
                self.stdout.write(
                    self.style.ERROR(f"  ✗ {dotpath} — import error: {exc}")
                )
                continue

            short_name = dotpath.rsplit(".", 1)[1]
            self.stdout.write(f"  ▸ {short_name:<40s} ×{n:>5d}  ", ending="")
            sys.stdout.flush()

            t1 = time.time()
            created = 0
            errors = 0
            for _ in range(n):
                try:
                    factory_cls.create()
                    created += 1
                except Exception as exc:
                    errors += 1
                    if verbosity >= 2:
                        self.stderr.write(f"\n    ⚠ {short_name}: {exc}")

            elapsed = time.time() - t1
            total_created += created
            status = self.style.SUCCESS(f"✓ {created}")
            if errors:
                status += self.style.WARNING(f"  ({errors} errors)")
            self.stdout.write(f"{status}  [{elapsed:.1f}s]")

        elapsed_total = time.time() - t0
        self.stdout.write(
            self.style.SUCCESS(
                f"\n  Total records created: {total_created}  [{elapsed_total:.1f}s]"
            )
        )
