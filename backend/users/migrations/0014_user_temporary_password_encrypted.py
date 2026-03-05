from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0013_user_availability_user_availability_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='temporary_password_encrypted',
            field=models.TextField(blank=True, null=True),
        ),
    ]
