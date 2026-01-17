from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fix certificate table schema to match model'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if the columns exist
            cursor.execute("DESCRIBE certificates_certificate;")
            columns = [row[0] for row in cursor.fetchall()]

            # Add missing columns if they don't exist
            missing_columns = []

            if 'school_name' not in columns:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD COLUMN school_name VARCHAR(200) NOT NULL DEFAULT '';")
                missing_columns.append('school_name')

            if 'district_name' not in columns:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD COLUMN district_name VARCHAR(100) NOT NULL DEFAULT '';")
                missing_columns.append('district_name')

            if 'category' not in columns:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD COLUMN category VARCHAR(3) NOT NULL DEFAULT 'HSS';")
                missing_columns.append('category')

            if 'certificate_type' not in columns:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD COLUMN certificate_type VARCHAR(15) NOT NULL DEFAULT 'participation';")
                missing_columns.append('certificate_type')

            if 'prize' not in columns:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD COLUMN prize VARCHAR(15) NULL;")
                missing_columns.append('prize')

            if 'issue_date' not in columns:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD COLUMN issue_date DATE NOT NULL DEFAULT (CURRENT_DATE());")
                missing_columns.append('issue_date')

            if 'certificate_number' not in columns:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD COLUMN certificate_number VARCHAR(50) NOT NULL DEFAULT '';")
                missing_columns.append('certificate_number')

            if missing_columns:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully added columns: {", ".join(missing_columns)}')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('All required columns already exist')
                )

            # Now add unique constraint to certificate_number
            try:
                cursor.execute(
                    "ALTER TABLE certificates_certificate ADD UNIQUE INDEX certificate_number_unique (certificate_number);")
                self.stdout.write(
                    self.style.SUCCESS(
                        'Successfully added unique constraint on certificate_number')
                )
            except Exception as e:
                # Constraint might already exist
                self.stdout.write(
                    self.style.WARNING(
                        f'Could not add unique constraint: {str(e)}')
                )

            # Update existing records to have proper certificate numbers
            cursor.execute("""
                UPDATE certificates_certificate 
                SET certificate_number = CONCAT('CERT-', event_id, '-', LPAD(id, 6, '0')) 
                WHERE certificate_number = '' OR certificate_number IS NULL
            """)

            updated_count = cursor.rowcount
            self.stdout.write(
                self.style.SUCCESS(
                    f'Updated {updated_count} records with certificate numbers')
            )
