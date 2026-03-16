import factory
from factory import fuzzy

from users.factories import UserFactory
from events.factories import EventFactory


class FeedbackFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "feedback.Feedback"

    user = factory.SubFactory(UserFactory, as_student=True)
    event = factory.SubFactory(EventFactory)
    feedback_type = fuzzy.FuzzyChoice(["event", "system", "other"])
    subject = factory.Faker("sentence", nb_words=6)
    message = factory.Faker("paragraph", nb_sentences=3)
    category = fuzzy.FuzzyChoice(
        ["registration", "schedule", "venue", "organization", "technical", "other"]
    )
    rating = fuzzy.FuzzyInteger(1, 5)
    contact_email = factory.Faker("email")
    sentiment_score = fuzzy.FuzzyDecimal(0, 1, precision=2)
    sentiment_label = fuzzy.FuzzyChoice(["positive", "neutral", "negative"])
    sentiment_confidence = fuzzy.FuzzyFloat(0.3, 1.0)
