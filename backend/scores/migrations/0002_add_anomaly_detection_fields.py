# Generated migration for anomaly detection fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scores', '0001_initial'),  # Adjust this to your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='score',
            name='is_flagged',
            field=models.BooleanField(default=False, help_text="Flagged as potentially anomalous"),
        ),
        migrations.AddField(
            model_name='score',
            name='anomaly_confidence',
            field=models.DecimalField(
                max_digits=4,
                decimal_places=3,
                null=True,
                blank=True,
                help_text="Anomaly confidence score (0.0-1.0)"
            ),
        ),
        migrations.AddField(
            model_name='score',
            name='anomaly_details',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text="Details about anomaly detection"
            ),
        ),
        migrations.AddField(
            model_name='score',
            name='admin_reviewed',
            field=models.BooleanField(default=False, help_text="Admin has reviewed this flagged score"),
        ),
        migrations.AddField(
            model_name='score',
            name='admin_notes',
            field=models.TextField(blank=True, null=True, help_text="Admin notes about flagged score"),
        ),
    ]
