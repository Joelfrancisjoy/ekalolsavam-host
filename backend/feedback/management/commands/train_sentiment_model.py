"""
Django management command to train sentiment analysis model.

Usage:
    python manage.py train_sentiment_model
    python manage.py train_sentiment_model --model svm
    python manage.py train_sentiment_model --evaluate
"""

from django.core.management.base import BaseCommand
from feedback.ml_models.train_sentiment_model import train_model, evaluate_model


class Command(BaseCommand):
    help = 'Train sentiment analysis model for feedback'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            default='naive_bayes',
            choices=['naive_bayes', 'svm'],
            help='Model type to train (default: naive_bayes)'
        )
        parser.add_argument(
            '--evaluate',
            action='store_true',
            help='Evaluate the trained model'
        )
        parser.add_argument(
            '--test-size',
            type=float,
            default=0.2,
            help='Fraction of data for testing (default: 0.2)'
        )

    def handle(self, *args, **options):
        model_type = options['model']
        test_size = options['test_size']
        evaluate = options['evaluate']

        self.stdout.write(self.style.SUCCESS(
            f'\n{"="*60}\n'
            f'Training Sentiment Analysis Model\n'
            f'{"="*60}\n'
        ))

        try:
            # Train model
            results = train_model(model_type=model_type, test_size=test_size)
            
            self.stdout.write(self.style.SUCCESS(
                f'\n✅ Training completed successfully!\n'
                f'   Model: {model_type}\n'
                f'   Accuracy: {results["accuracy"]:.2%}\n'
                f'   Training samples: {results["train_samples"]}\n'
                f'   Test samples: {results["test_samples"]}\n'
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
