import factory
from factory import fuzzy
from django.contrib.auth.hashers import make_password


class SchoolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "users.School"

    name = factory.Faker("company", locale="en_IN")
    category = fuzzy.FuzzyChoice(["LP", "UP", "HS", "HSS"])
    is_active = True


class UserFactory(factory.django.DjangoModelFactory):
    """Base user factory. Use role-specific subfactories for realistic data."""

    class Meta:
        model = "users.User"
        django_get_or_create = ("username",)
        exclude = ["_seq"]

    _seq = factory.Sequence(lambda n: n)

    username = factory.LazyAttribute(
        lambda o: f"{o.first_name.lower()}.{o.last_name.lower()}.{o._seq}"
    )
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    email = factory.LazyAttribute(
        lambda o: f"{o.username}@example.com"
    )
    password = factory.LazyFunction(lambda: make_password("testpass123"))
    role = "student"
    phone = factory.Faker("numerify", text="+91##########")
    is_active = True
    approval_status = "approved"

    class Params:
        """Traits for different user roles."""

        as_student = factory.Trait(
            role="student",
            school=factory.SubFactory(SchoolFactory),
            student_class=fuzzy.FuzzyInteger(1, 12),
        )
        as_judge = factory.Trait(
            role="judge",
        )
        as_admin = factory.Trait(
            role="admin",
            is_staff=True,
        )
        as_volunteer = factory.Trait(
            role="volunteer",
            availability=fuzzy.FuzzyChoice(["available", "busy", "offline"]),
        )
        as_school = factory.Trait(
            role="school",
            contact_email=factory.Faker("company_email"),
        )


class StudentFactory(UserFactory):
    """Convenience factory that creates a student user."""

    role = "student"
    school = factory.SubFactory(SchoolFactory)
    student_class = fuzzy.FuzzyInteger(1, 12)


class JudgeUserFactory(UserFactory):
    """Convenience factory that creates a judge user."""

    role = "judge"


class VolunteerUserFactory(UserFactory):
    """Convenience factory that creates a volunteer user."""

    role = "volunteer"
    availability = fuzzy.FuzzyChoice(["available", "busy", "offline"])


class AdminUserFactory(UserFactory):
    """Convenience factory that creates an admin user."""

    role = "admin"
    is_staff = True


class AllowedEmailFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "users.AllowedEmail"
        django_get_or_create = ("email",)

    email = factory.Faker("email")
    is_active = True
    created_by = factory.SubFactory(UserFactory, as_admin=True)
