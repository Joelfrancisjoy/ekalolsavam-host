from django.db import migrations

def generate_chess_numbers(apps, schema_editor):
    EventRegistration = apps.get_model('events', 'EventRegistration')
    
    for registration in EventRegistration.objects.filter(chess_number__isnull=True):
        # Generate a unique chess number using event ID and participant ID
        chess_number = f"{registration.event.id:03d}{registration.participant.id:05d}"
        registration.chess_number = chess_number
        registration.save()

def reverse_generate_chess_numbers(apps, schema_editor):
    # No need to reverse this migration
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('events', '0003_eventregistration_chess_number_and_more'),
    ]

    operations = [
        migrations.RunPython(generate_chess_numbers, reverse_generate_chess_numbers),
    ]







