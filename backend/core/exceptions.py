class DomainError(Exception):
    """Base class for all business rule violations."""
    pass


class PermissionViolation(DomainError):
    pass


class InvalidStateTransition(DomainError):
    pass


class NotFoundError(DomainError):
    pass


class ConflictError(DomainError):
    pass
