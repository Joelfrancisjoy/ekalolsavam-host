from events.management.commands.provision_group_events import (
    Command as GroupProvisionCommand,
    TARGET_SET_MATRIX,
)


class Command(GroupProvisionCommand):
    help = (
        "Create/publish scheduled matrix events for GROUP and INDIVIDUAL targets "
        "with deterministic auto-slot scheduling."
    )

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.set_defaults(target_set=TARGET_SET_MATRIX)
