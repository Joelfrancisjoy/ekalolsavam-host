from django.db import models
from users.models import User
from events.models import Event
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image, ImageDraw
from django.utils import timezone


class Certificate(models.Model):
    CERTIFICATE_TYPES = [
        ('merit', 'Merit Certificate'),
        ('participation', 'Participation Certificate'),
    ]

    PRIZE_CHOICES = [
        ('1st', '1st Prize'),
        ('2nd', '2nd Prize'),
        ('3rd', '3rd Prize'),
        ('consolation', 'Consolation Prize'),
        ('participation', 'Participation'),
    ]

    CATEGORY_CHOICES = [
        ('LP', 'LP'),
        ('UP', 'UP'),
        ('HS', 'HS'),
        ('HSS', 'HSS'),
    ]

    participant = models.ForeignKey(User, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    school_name = models.CharField(
        max_length=200, verbose_name="School Name", default="")
    district_name = models.CharField(
        max_length=100, verbose_name="District Name", default="")
    category = models.CharField(
        max_length=3, choices=CATEGORY_CHOICES, verbose_name="Participant Category", default="HSS")
    certificate_type = models.CharField(
        max_length=15, choices=CERTIFICATE_TYPES, verbose_name="Certificate Type", default="participation")
    prize = models.CharField(max_length=15, choices=PRIZE_CHOICES,
                             blank=True, null=True, verbose_name="Prize/Rank")
    issue_date = models.DateField(
        default=timezone.now, verbose_name="Issue Date")
    certificate_number = models.CharField(
        max_length=50, unique=True, blank=False, verbose_name="Certificate Number")
    certificate_file = models.FileField(
        upload_to='certificates/', blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True)

    def __str__(self):
        return f"Certificate for {self.participant.username} - {self.event.name}"

    def save(self, *args, **kwargs):
        # Generate certificate number if not exists
        if not self.certificate_number:
            import uuid
            self.certificate_number = f"CERT-{self.event.id}-{uuid.uuid4().hex[:8].upper()}"

        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.qr_code:
            self.generate_qr_code()
            super().save(update_fields=['qr_code'])

    def generate_qr_code(self):
        qr_content = f"Certificate ID: {self.id} | Participant: {self.participant.username} | Event: {self.event.name}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_content)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        filename = f'qr_{self.id}.png'
        filebuffer = File(buffer, name=filename)
        self.qr_code.save(filename, filebuffer)
