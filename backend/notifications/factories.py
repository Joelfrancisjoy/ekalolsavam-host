import factory
from factory import fuzzy

from users.factories import UserFactory


class NotificationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "notifications.Notification"

    user = factory.SubFactory(UserFactory)
    title = factory.Faker("sentence", nb_words=5)
    message = factory.Faker("paragraph", nb_sentences=2)
    notification_type = fuzzy.FuzzyChoice(["event", "registration", "result", "system"])
    is_read = fuzzy.FuzzyChoice([True, False])


class EmailTemplateFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "notifications.EmailTemplate"
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"template_{n}")
    subject = factory.Faker("sentence", nb_words=6)
    body = factory.Faker("paragraph", nb_sentences=5)
