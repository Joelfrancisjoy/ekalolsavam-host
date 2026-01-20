VALID_TRANSITIONS = {
    "draft": ["published"],
    "published": ["registration_closed"],
    "registration_closed": ["in_progress"],
    "in_progress": ["scoring_closed"],
    "scoring_closed": ["results_published"],
    "results_published": ["archived"],
}


def transition_event(event, target):
    allowed = VALID_TRANSITIONS.get(event.status, [])

    if target not in allowed:
        raise ValueError(
            f"Invalid transition: {event.status} → {target}"
        )

    event.status = target
    event.save(update_fields=["status"])
    return event


def can_transition(current, target):
    """Check if a transition is allowed."""
    return target in VALID_TRANSITIONS.get(current, [])
