"""
Django management command to train anomaly detection model for judge scoring.

Usage:
    python manage.py train_anomaly_model
    python manage.py train_anomaly_model --model isolation_forest
    python manage.py train_anomaly_model --samples 200
    python manage.py train_anomaly_model --evaluate
"""

from django.core.management.base import BaseCommand
from scores.ml_models.train_anomaly_model import train_model, evaluate_model


class Command(BaseCommand):
    help = 'Train anomaly detection model for judge scoring'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            default='isolation_forest',
            choices=['lof', 'isolation_forest', 'one_class_svm'],
            help='Model type to train (default: isolation_forest)'
        )
        parser.add_argument(
            '--samples',
            type=int,
            default=100,
            help='Number of training samples to generate (default: 100)'
        )
        parser.add_argument(
            '--contamination',
            type=float,
            default=0.1,
            help='Expected proportion of outliers (default: 0.1)'
        )
        parser.add_argument(
            '--evaluate',
            action='store_true',
            help='Evaluate the trained model'
        )

    def handle(self, *args, **options):
        model_type = options['model']
        num_samples = options['samples']
        contamination = options['contamination']
        evaluate = options['evaluate']

        self.stdout.write(self.style.SUCCESS(
            f'\n{"="*60}\n'
            f'Training Anomaly Detection Model\n'
            f'{"="*60}\n'
        ))

        try:
            # Train model
            results = train_model(
                model_type=model_type,
                num_samples=num_samples,
                contamination=contamination
            )
            
            self.stdout.write(self.style.SUCCESS(
                f'\n✅ Training completed successfully!\n'
                f'   Model: {model_type}\n'
                f'   Total samples: {results["total_samples"]}\n'
                f'   Normal scores: {results["normal_scores"]}\n'
                f'   Anomalous scores: {results["anomalous_scores"]}\n'
                f'   Anomaly rate: {results["anomaly_rate"]:.2%}\n'
            ))

            # Evaluate if requested
            if evaluate:
                self.stdout.write(self.style.WARNING('\nRunning evaluation...'))
                evaluate_model(model_type=model_type)

            self.stdout.write(self.style.SUCCESS(
                f'\n{"="*60}\n'
                f'Model saved and ready to use!\n'
                f'{"="*60}\n'
            ))

        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'\n❌ Training failed: {str(e)}\n'
            ))
            raise
