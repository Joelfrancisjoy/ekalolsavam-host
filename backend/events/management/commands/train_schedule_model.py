from django.core.management.base import BaseCommand, CommandError

from events.ml_models.train_schedule_model import summarize_dataset, train_model


class Command(BaseCommand):
    help = "Train event scheduling recommender model (conflict-avoidance-first)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--lookback-days",
            type=int,
            default=365,
            help="How many historical days of events to include (default: 365)",
        )
        parser.add_argument(
            "--test-size",
            type=float,
            default=0.2,
            help="Fraction of data used for test split (default: 0.2)",
        )
        parser.add_argument(
            "--summary-only",
            action="store_true",
            help="Only print dataset summary without training",
        )

    def handle(self, *args, **options):
        lookback_days = options["lookback_days"]
        test_size = options["test_size"]
        summary_only = options["summary_only"]

        if lookback_days < 1:
            raise CommandError("--lookback-days must be >= 1")
        if not 0 < test_size < 1:
            raise CommandError("--test-size must be between 0 and 1")

        self.stdout.write(self.style.SUCCESS("\n=== Scheduling Dataset Summary ==="))
        summary = summarize_dataset(lookback_days=lookback_days)
        self.stdout.write(f"Samples: {summary['total_samples']}")
        self.stdout.write(f"Category counts: {summary['category_counts']}")
        self.stdout.write(f"Avg conflict penalty: {summary['avg_conflict_penalty']}")
        self.stdout.write(f"Avg overlaps: {summary['avg_overlaps']}")

        if summary_only:
            return

        self.stdout.write(self.style.SUCCESS("\n=== Training Scheduling Recommender ==="))
        results = train_model(lookback_days=lookback_days, test_size=test_size)
        self.stdout.write(
            self.style.SUCCESS(
                "Training completed. "
                f"samples={results['total_samples']}, "
                f"train_mae={results['train_mae']:.4f}, "
                f"test_mae={results['test_mae']:.4f}"
            )
        )
