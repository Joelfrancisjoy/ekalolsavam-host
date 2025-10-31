"""
Django management command to train performance prediction model.

Usage:
    python manage.py train_performance_model
    python manage.py train_performance_model --model random_forest
    python manage.py train_performance_model --samples 300
    python manage.py train_performance_model --evaluate
"""

from django.core.management.base import BaseCommand
from scores.ml_models.train_performance_model import train_model, evaluate_model


class Command(BaseCommand):
    help = 'Train performance prediction model for participants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            default='random_forest',
            choices=['decision_tree', 'random_forest', 'neural_network'],
            help='Model type to train (default: random_forest)'
        )
        parser.add_argument(
            '--samples',
            type=int,
            default=200,
            help='Number of training samples to generate (default: 200)'
        )
        parser.add_argument(
            '--test-size',
            type=float,
            default=0.2,
            help='Fraction of data for testing (default: 0.2)'
        )
        parser.add_argument(
            '--evaluate',
            action='store_true',
            help='Evaluate the trained model'
        )

    def handle(self, *args, **options):
        model_type = options['model']
        num_samples = options['samples']
        test_size = options['test_size']
        evaluate = options['evaluate']

        self.stdout.write(self.style.SUCCESS(
            f'\n{"="*60}\n'
            f'Training Performance Prediction Model\n'
            f'{"="*60}\n'
        ))

        try:
            # Train model
            results = train_model(
                model_type=model_type,
                num_samples=num_samples,
                test_size=test_size
            )
            
            self.stdout.write(self.style.SUCCESS(
                f'\n✅ Training completed successfully!\n'
                f'   Model: {model_type}\n'
                f'   Test RMSE: {results["test_rmse"]:.2f} points\n'
                f'   Test MAE: {results["test_mae"]:.2f} points\n'
                f'   Test R²: {results["test_r2"]:.3f}\n'
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
