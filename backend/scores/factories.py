import uuid
import factory
from factory import fuzzy
from decimal import Decimal

from users.factories import UserFactory, StudentFactory, VolunteerUserFactory, JudgeUserFactory
from events.factories import EventFactory


class ScoreFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "scores.Score"

    event = factory.SubFactory(EventFactory)
    participant = factory.SubFactory(StudentFactory)
    judge = factory.SubFactory(JudgeUserFactory)

    # Use dynamic criteria_scores (the modern approach)
    criteria_scores = factory.LazyFunction(
        lambda: {
            "technical_skill": str(round(fuzzy.FuzzyDecimal(5, 25, precision=1).fuzz(), 1)),
            "artistic_expression": str(round(fuzzy.FuzzyDecimal(5, 25, precision=1).fuzz(), 1)),
            "stage_presence": str(round(fuzzy.FuzzyDecimal(5, 25, precision=1).fuzz(), 1)),
            "overall_impression": str(round(fuzzy.FuzzyDecimal(5, 25, precision=1).fuzz(), 1)),
        }
    )

    notes = factory.Faker("sentence")
    is_flagged = False
    admin_reviewed = False


class ResultFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "scores.Result"
        django_get_or_create = ("event", "participant")

    event = factory.SubFactory(EventFactory)
    participant = factory.SubFactory(StudentFactory)
    total_score = fuzzy.FuzzyDecimal(20, 100, precision=2)
    rank = factory.Sequence(lambda n: n + 1)
    published = False


class RecheckRequestFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "scores.RecheckRequest"

    result = factory.SubFactory(ResultFactory)
    participant = factory.LazyAttribute(lambda o: o.result.participant)
    full_name = factory.LazyAttribute(
        lambda o: f"{o.participant.first_name} {o.participant.last_name}"
    )
    category = factory.LazyAttribute(lambda o: o.result.event.category)
    event_name = factory.LazyAttribute(lambda o: o.result.event.name)
    chest_number = factory.Sequence(lambda n: f"RCH-{n:05d}")
    final_score = factory.LazyAttribute(lambda o: o.result.total_score)
    reason = factory.Faker("paragraph", nb_sentences=2)
    assigned_volunteer = factory.SubFactory(VolunteerUserFactory)
    status = "Pending"


class RazorpayPaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "scores.RazorpayPayment"

    recheck_request = factory.SubFactory(RecheckRequestFactory)
    razorpay_order_id = factory.LazyFunction(
        lambda: f"order_{uuid.uuid4().hex[:16]}"
    )
    razorpay_payment_id = factory.LazyAttribute(
        lambda o: f"pay_{uuid.uuid4().hex[:16]}" if o.status == "captured" else None
    )
    razorpay_signature = None
    amount = fuzzy.FuzzyDecimal(50, 500, precision=2)
    currency = "INR"
    status = fuzzy.FuzzyChoice(["created", "captured", "failed"])
