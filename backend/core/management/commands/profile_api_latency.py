"""
profile_api_latency

Profiles key API GET endpoints using DRF APIClient against the current Django DB
configuration (e.g. Supabase pooler), reporting latency and SQL query counts.

Usage:
    python manage.py profile_api_latency
    python manage.py profile_api_latency --runs 5
    python manage.py profile_api_latency --runs 5 --warmup 1 --event-id 73
"""

import statistics
import time

from django.core.management.base import BaseCommand
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from events.models import Event, EventRegistration
from users.models import User


class Command(BaseCommand):
    help = "Profile key API endpoint latency and SQL query counts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--runs",
            type=int,
            default=3,
            help="Number of measured runs per endpoint (default: 3).",
        )
        parser.add_argument(
            "--warmup",
            type=int,
            default=1,
            help="Warmup requests per endpoint before measurement (default: 1).",
        )
        parser.add_argument(
            "--event-id",
            type=int,
            default=None,
            help="Explicit event ID for /api/events/<id>/participants/ profiling.",
        )

    def handle(self, *args, **options):
        runs = max(1, int(options["runs"]))
        warmup = max(0, int(options["warmup"]))
        event_id = options["event_id"]

        client = APIClient()

        admin = User.objects.filter(role="admin", is_active=True).first()
        judge = User.objects.filter(role="judge", is_active=True).first()
        student = User.objects.filter(role="student", is_active=True).first()

        if not admin:
            self.stdout.write(
                self.style.WARNING("No active admin user found. Nothing to profile.")
            )
            return

        self.stdout.write(self.style.HTTP_INFO("Profiling endpoints...\n"))

        endpoints = [
            ("admin-users", "/api/auth/users/", admin),
            ("admin-school-participants", "/api/auth/admin/school-participants/", admin),
            ("events-list-published", "/api/events/?published_only=true", admin),
        ]

        if judge:
            endpoints.append(("judge-recheck-requests", "/api/scores/judge/recheck-requests/", judge))
        if student:
            endpoints.append(("student-scores", "/api/scores/student/", student))

        participants_target = self._resolve_participants_target(event_id)
        if participants_target:
            endpoints.extend(participants_target)

        for label, path, user in endpoints:
            result = self._profile_endpoint(
                client=client,
                user=user,
                path=path,
                runs=runs,
                warmup=warmup,
            )
            self._print_result(label, path, result)

    def _resolve_participants_target(self, explicit_event_id):
        event = None
        if explicit_event_id:
            event = Event.objects.filter(pk=explicit_event_id).first()
        if event is None:
            reg = EventRegistration.objects.select_related("event").order_by("-id").first()
            event = reg.event if reg else Event.objects.order_by("-id").first()
        if event is None:
            return []

        endpoints = []
        judge = event.judges.first()
        if judge:
            endpoints.append(
                (
                    "judge-event-participants",
                    f"/api/events/{event.id}/participants/",
                    judge,
                )
            )

        volunteer = event.volunteers.first()
        if volunteer is None:
            try:
                from volunteers.models import VolunteerAssignment

                assignment = VolunteerAssignment.objects.filter(
                    shift__event=event
                ).select_related("volunteer").first()
                if assignment:
                    volunteer = assignment.volunteer
            except Exception:
                volunteer = None

        if volunteer:
            endpoints.append(
                (
                    "volunteer-event-participants",
                    f"/api/events/{event.id}/participants/",
                    volunteer,
                )
            )

        return endpoints

    def _profile_endpoint(self, client, user, path, runs, warmup):
        for _ in range(warmup):
            client.force_authenticate(user=user)
            client.get(path)

        latencies_ms = []
        query_counts = []
        statuses = []

        for _ in range(runs):
            client.force_authenticate(user=user)
            connection.force_debug_cursor = True
            t0 = time.perf_counter()
            with CaptureQueriesContext(connection) as ctx:
                response = client.get(path)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0

            latencies_ms.append(elapsed_ms)
            query_counts.append(len(ctx.captured_queries))
            statuses.append(response.status_code)

        return {
            "latencies_ms": latencies_ms,
            "query_counts": query_counts,
            "statuses": statuses,
        }

    def _print_result(self, label, path, result):
        latencies = result["latencies_ms"]
        query_counts = result["query_counts"]
        statuses = result["statuses"]

        avg_ms = statistics.mean(latencies)
        min_ms = min(latencies)
        max_ms = max(latencies)
        avg_queries = statistics.mean(query_counts)

        self.stdout.write(
            f"{label:<30s} {path}\n"
            f"  status={statuses} | avg_ms={avg_ms:.2f} | min_ms={min_ms:.2f} | max_ms={max_ms:.2f} | avg_queries={avg_queries:.2f}\n"
        )
