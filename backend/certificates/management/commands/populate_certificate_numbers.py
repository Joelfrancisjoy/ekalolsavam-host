from django.core.management.base import BaseCommand
from certificates.models import Certificate
import uuid


class Command(BaseCommand):
    help = 'Populate certificate numbers for existing certificates'

    def handle(self, *args, **options):
        certificates = Certificate.objects.filter(
            certificate_number__in=["", None])
        for cert in certificates:
            cert.certificate_number = f'CERT-{cert.event.id}-{uuid.uuid4().hex[:8].upper()}'
            cert.save()
            self.stdout.write(
                f'Updated certificate {cert.id} with number {cert.certificate_number}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {certificates.count()} certificates')
        )
