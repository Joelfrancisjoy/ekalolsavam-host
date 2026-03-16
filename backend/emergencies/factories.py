import factory
from factory import fuzzy

from users.factories import UserFactory, VolunteerUserFactory
from events.factories import EventFactory, VenueFactory


class EmergencyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "emergencies.Emergency"

    emergency_type = fuzzy.FuzzyChoice(["medical", "fire", "security", "other"])
    person_role = fuzzy.FuzzyChoice(
        ["participant", "judge", "volunteer", "staff", "public"]
    )
    person_user = factory.SubFactory(UserFactory)
    person_id_value = factory.Faker("numerify", text="ID-####")
    event = factory.SubFactory(EventFactory)
    venue = factory.SubFactory(VenueFactory)
    category = factory.Faker("word")
    cause_type = fuzzy.FuzzyChoice(["accident", "illness", "external", "unknown"])
    cause_description = factory.Faker("sentence", nb_words=10)
    severity = fuzzy.FuzzyChoice(["red", "orange", "yellow", "blue", "green"])
    status = fuzzy.FuzzyChoice(["active", "resolved", "cancelled"])
    created_from = fuzzy.FuzzyChoice(["public_button", "volunteer"])
    requires_schedule_adjustment = fuzzy.FuzzyChoice([True, False])
    schedule_adjusted = False
    hospital_notified = fuzzy.FuzzyChoice([True, False])
    hospital_reference_id = factory.Faker("numerify", text="HOSP-######")
    created_by = factory.SubFactory(VolunteerUserFactory)
