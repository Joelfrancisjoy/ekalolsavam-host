import factory
from factory import fuzzy
import datetime

from users.factories import VolunteerUserFactory
from events.factories import EventFactory


class VolunteerShiftFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "volunteers.VolunteerShift"

    event = factory.SubFactory(EventFactory)
    date = factory.Faker("date_between", start_date="+1d", end_date="+60d")
    start_time = factory.Faker("time_object")
    end_time = factory.LazyAttribute(
        lambda o: (
            datetime.datetime.combine(datetime.date.today(), o.start_time)
            + datetime.timedelta(hours=fuzzy.FuzzyInteger(2, 6).fuzz())
        ).time()
    )
    description = factory.Faker("sentence", nb_words=10)
    required_volunteers = fuzzy.FuzzyInteger(2, 10)
    status = fuzzy.FuzzyChoice(["available", "assigned", "completed"])


class VolunteerAssignmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "volunteers.VolunteerAssignment"
        django_get_or_create = ("volunteer", "shift")

    volunteer = factory.SubFactory(VolunteerUserFactory)
    shift = factory.SubFactory(VolunteerShiftFactory)
    checked_in = False
    checked_out = False
