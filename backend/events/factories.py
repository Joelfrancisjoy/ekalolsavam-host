import factory
from factory import fuzzy
from django.utils import timezone
import datetime

from users.factories import UserFactory, JudgeUserFactory, VolunteerUserFactory


class VenueFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "events.Venue"

    name = factory.Faker("company", locale="en_IN")
    location = factory.Faker("address", locale="en_IN")
    capacity = fuzzy.FuzzyInteger(50, 2000)
    event_limit = fuzzy.FuzzyInteger(3, 15)


class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "events.Event"

    name = factory.LazyAttribute(
        lambda o: f"{o.category.replace('_', ' ').title()} - {factory.Faker('catch_phrase').evaluate(None, None, {'locale': None})}"
    )
    description = factory.Faker("paragraph", nb_sentences=4)
    category = fuzzy.FuzzyChoice(
        ["dance", "music", "theatre", "literary", "visual_arts"]
    )
    date = factory.Faker(
        "date_between",
        start_date="+1d",
        end_date="+60d",
    )
    start_time = factory.Faker("time_object")
    end_time = factory.LazyAttribute(
        lambda o: (
            datetime.datetime.combine(datetime.date.today(), o.start_time)
            + datetime.timedelta(hours=fuzzy.FuzzyInteger(1, 3).fuzz())
        ).time()
    )
    venue = factory.SubFactory(VenueFactory)
    max_participants = fuzzy.FuzzyInteger(10, 100)
    created_by = factory.SubFactory(UserFactory, as_admin=True)
    status = fuzzy.FuzzyChoice(["draft", "published", "in_progress"])

    @factory.post_generation
    def judges(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for judge in extracted:
                self.judges.add(judge)
        else:
            judges = JudgeUserFactory.create_batch(fuzzy.FuzzyInteger(1, 3).fuzz())
            self.judges.add(*judges)

    @factory.post_generation
    def volunteers(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for vol in extracted:
                self.volunteers.add(vol)


class JudgeProfileFactory(factory.django.DjangoModelFactory):
    """Factory for the Judge profile model (OneToOne with User)."""

    class Meta:
        model = "events.Judge"

    user = factory.SubFactory(JudgeUserFactory)
    specialization = fuzzy.FuzzyChoice(
        [
            "Classical Dance",
            "Western Music",
            "Theatre Arts",
            "Poetry & Literature",
            "Painting & Sculpture",
            "Instrumental Music",
            "Folk Dance",
            "Contemporary Dance",
        ]
    )

    @factory.post_generation
    def assigned_events(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for event in extracted:
                self.assigned_events.add(event)


class EventRegistrationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "events.EventRegistration"
        django_get_or_create = ("event", "participant")

    event = factory.SubFactory(EventFactory)
    participant = factory.SubFactory(UserFactory, as_student=True)
    status = fuzzy.FuzzyChoice(["pending", "confirmed"])
    chess_number = factory.Sequence(lambda n: f"CH-{n:05d}")
    registration_amount = fuzzy.FuzzyDecimal(0, 500, precision=2)
    amount_paid = factory.LazyAttribute(lambda o: o.registration_amount)


class ParticipantVerificationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "events.ParticipantVerification"

    event = factory.SubFactory(EventFactory)
    participant = factory.SubFactory(UserFactory, as_student=True)
    chess_number = factory.Sequence(lambda n: f"VCH-{n:05d}")
    volunteer = factory.SubFactory(VolunteerUserFactory)
    status = fuzzy.FuzzyChoice(["pending", "verified", "rejected"])
    notes = factory.Faker("sentence")
