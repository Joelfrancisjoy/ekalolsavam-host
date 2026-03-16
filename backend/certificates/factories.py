import uuid
import factory
from factory import fuzzy
from django.utils import timezone

from users.factories import StudentFactory
from events.factories import EventFactory


class CertificateFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "certificates.Certificate"

    participant = factory.SubFactory(StudentFactory)
    event = factory.SubFactory(EventFactory)
    school_name = factory.Faker("company", locale="en_IN")
    district_name = factory.Faker("city", locale="en_IN")
    category = fuzzy.FuzzyChoice(["LP", "UP", "HS", "HSS"])
    certificate_type = fuzzy.FuzzyChoice(["merit", "participation"])
    prize = fuzzy.FuzzyChoice(["1st", "2nd", "3rd", "consolation", "participation"])
    issue_date = factory.LazyFunction(timezone.now)
    certificate_number = factory.LazyFunction(
        lambda: f"CERT-{uuid.uuid4().hex[:10].upper()}"
    )
