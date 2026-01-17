from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Certificate
from .serializers import CertificateSerializer
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib.units import inch
from reportlab.lib.colors import blue, black, red
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from django.http import HttpResponse, FileResponse
from io import BytesIO
import os
from django.conf import settings
from datetime import datetime


class CertificateListView(generics.ListAPIView):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Certificate.objects.all()
        return Certificate.objects.filter(participant=user)


class GenerateCertificateView(generics.CreateAPIView):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Only admins should generate certificates
        user = request.user
        if getattr(user, 'role', None) != 'admin':
            return Response({'detail': 'Only admins can generate certificates.'}, status=status.HTTP_403_FORBIDDEN)

        # Get all required data from request
        participant_id = request.data.get('participant')
        event_id = request.data.get('event')
        school_name = request.data.get('school_name')
        district_name = request.data.get('district_name')
        category = request.data.get('category')
        certificate_type = request.data.get('certificate_type')
        prize = request.data.get('prize')

        if not all([participant_id, event_id, school_name, district_name, category, certificate_type]):
            return Response({'detail': 'All fields are required: participant, event, school_name, district_name, category, certificate_type.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the certificate with all required fields
        certificate = Certificate.objects.create(
            participant_id=participant_id,
            event_id=event_id,
            school_name=school_name,
            district_name=district_name,
            category=category,
            certificate_type=certificate_type,
            prize=prize,
            issue_date=datetime.now().date(),
        )

        serializer = self.get_serializer(certificate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def generate_pdf_certificate(request, certificate_id):
    try:
        certificate = Certificate.objects.get(id=certificate_id)
    except Certificate.DoesNotExist:
        return HttpResponse("Certificate not found", status=404)

    # Create a file-like buffer to receive PDF data
    buffer = BytesIO()

    # Create the PDF object with landscape A4 format
    p = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # Define colors
    blue_color = (0.1, 0.1, 0.4)  # Professional dark blue
    cream_color = (0.98, 0.96, 0.9)  # Light cream background
    black_color = (0, 0, 0)  # Matte black

    # Set background color
    p.setFillColorRGB(*cream_color)
    p.rect(0, 0, width, height, fill=True)

    # Draw border
    p.setLineWidth(2)
    p.setStrokeColorRGB(*black_color)
    p.rect(30, 30, width - 60, height - 60)

    # Add blue accent line at top
    p.setFillColorRGB(*blue_color)
    p.rect(30, height - 40, width - 60, 10, fill=True)

    # Set font styles
    p.setFont("Helvetica-Bold", 24)
    p.setFillColorRGB(*blue_color)

    # Center position for header
    header_y = height - 100
    center_x = width / 2

    # Add organization title
    p.drawCentredString(center_x, header_y, "KERALA KALOLSAVAM")

    # Certificate title
    p.setFont("Helvetica-Bold", 32)
    cert_title = "CERTIFICATE OF MERIT" if certificate.certificate_type == 'merit' else "CERTIFICATE OF PARTICIPATION"
    p.drawCentredString(center_x, header_y - 60, cert_title)

    # Main certificate content
    p.setFont("Helvetica", 18)
    p.setFillColorRGB(*black_color)

    content_start_y = header_y - 120

    # Certificate text content
    text_lines = [
        f"This is to certify that {certificate.participant.get_full_name()}",
        f"of {certificate.school_name}, District: {certificate.district_name}",
        f"Category: {certificate.category}",
        f"has successfully participated in the event '{certificate.event.name}'"
    ]

    if certificate.certificate_type == 'merit' and certificate.prize:
        prize_text = {
            '1st': 'and secured 1st Prize',
            '2nd': 'and secured 2nd Prize',
            '3rd': 'and secured 3rd Prize',
            'consolation': 'and received Consolation Prize',
            'participation': 'as a participant'
        }.get(certificate.prize, f'and received {certificate.prize}')
        text_lines.append(prize_text)
    else:
        text_lines.append("as a participant")

    text_lines.append(
        f"held during the {certificate.event.date.strftime('%Y')} Kalolsavam.")

    y_position = content_start_y
    for line in text_lines:
        p.drawCentredString(center_x, y_position, line)
        y_position -= 30

    # Authorization section
    auth_y = y_position - 80
    p.drawCentredString(
        center_x, auth_y, "Authorized by Kalolsavam Management")

    # Signature blocks
    signature_width = 150
    left_signature_x = center_x - 100 - signature_width
    right_signature_x = center_x + 100

    # Draw signature lines
    p.line(left_signature_x, auth_y - 40,
           left_signature_x + signature_width, auth_y - 40)
    p.line(right_signature_x, auth_y - 40,
           right_signature_x + signature_width, auth_y - 40)

    # Signature labels
    p.setFont("Helvetica", 12)
    p.drawCentredString(left_signature_x + signature_width/2,
                        auth_y - 60, "Chairperson / Program Chairman")
    p.drawCentredString(right_signature_x + signature_width/2,
                        auth_y - 60, "General Convener / Authorized Officer")

    # Footer section
    footer_y = 100
    p.setFont("Helvetica", 10)

    # Left: Issue date
    issue_date_str = certificate.issue_date.strftime('%B %d, %Y')
    p.drawString(50, footer_y, f"Date: {issue_date_str}")

    # Center: Certificate number
    p.drawCentredString(center_x, footer_y,
                        f"Certificate No: {certificate.certificate_number}")

    # Right: QR code placeholder
    p.drawString(width - 200, footer_y, "Verification QR Code")

    # Close the PDF object cleanly
    p.showPage()
    p.save()

    # FileResponse sets the Content-Disposition header so that browsers
    # present the option to save the file.
    buffer.seek(0)
    filename = f"certificate_{certificate.id}.pdf"
    return FileResponse(buffer, as_attachment=True, filename=filename, content_type='application/pdf')
