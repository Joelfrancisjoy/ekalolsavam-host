from django.core.management.base import BaseCommand

from users.workflow_models import SchoolGroupEntry


class Command(BaseCommand):
    help = (
        "Audit school group entries for participant integrity issues "
        "(member count mismatch or invalid leader configuration)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--group-entry-id",
            type=int,
            help="Audit only one SchoolGroupEntry by id.",
        )

    def handle(self, *args, **options):
        group_entry_id = options.get("group_entry_id")
        queryset = SchoolGroupEntry.objects.all().prefetch_related("members")
        if group_entry_id is not None:
            queryset = queryset.filter(pk=group_entry_id)

        checked = 0
        issue_count = 0
        for group_entry in queryset:
            checked += 1
            members = list(group_entry.members.all())
            members_count = len(members)
            leader_count = sum(1 for member in members if member.is_leader)
            if members_count != group_entry.participant_count:
                issue_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"[count_mismatch] group_entry={group_entry.id} group_id={group_entry.group_id} "
                        f"participant_count={group_entry.participant_count} members_count={members_count}"
                    )
                )
            if leader_count != 1:
                issue_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"[leader_issue] group_entry={group_entry.id} group_id={group_entry.group_id} "
                        f"leaders_found={leader_count}"
                    )
                )

        if issue_count == 0:
            self.stdout.write(self.style.SUCCESS(f"Audit complete: checked {checked} group entries, no issues found."))
        else:
            self.stdout.write(
                self.style.ERROR(
                    f"Audit complete: checked {checked} group entries, found {issue_count} issue(s)."
                )
            )
