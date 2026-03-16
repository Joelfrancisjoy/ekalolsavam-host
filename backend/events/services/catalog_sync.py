LEVEL_CODE_SORT_ORDER = {
    "LP": 0,
    "UP": 1,
    "HS": 2,
    "HSS": 3,
}


CATALOG_CATEGORY_TO_EVENT_CATEGORY = {
    "DANCE": "dance",
    "MUSIC": "music",
    "THEATRE": "theatre",
    "LITERARY": "literary",
    "FINE_ARTS": "visual_arts",
    "TRADITIONAL_ARTS": "traditional_arts",
}


def map_catalog_category_name_to_event_category(category_name, strict=True):
    normalized = (category_name or "").strip().upper()
    mapped = CATALOG_CATEGORY_TO_EVENT_CATEGORY.get(normalized)
    if mapped is None and strict:
        raise ValueError(f"Unsupported catalog category for scheduled events: {category_name}")
    return mapped


def map_event_definition_category_to_event_category(event_definition, strict=True):
    category_name = getattr(getattr(event_definition, "category", None), "category_name", None)
    return map_catalog_category_name_to_event_category(category_name, strict=strict)


def build_canonical_event_name(event_definition_name, event_variant_name=None, max_length=100):
    base_name = (event_definition_name or "").strip()
    variant_name = (event_variant_name or "").strip()
    canonical_name = f"{base_name} - {variant_name}" if variant_name else base_name
    return canonical_name[:max_length]


def build_canonical_event_name_from_models(event_definition, event_variant=None, max_length=100):
    variant_name = None
    if (
        event_variant is not None
        and getattr(event_variant, "event_id", None) == getattr(event_definition, "id", None)
    ):
        variant_name = getattr(event_variant, "variant_name", None)

    return build_canonical_event_name(
        getattr(event_definition, "event_name", ""),
        variant_name,
        max_length=max_length,
    )


def get_effective_level_codes(event_definition, event_variant=None):
    if event_definition is None:
        return []

    rules = list(event_definition.rules.all())
    if event_variant is not None:
        variant_rules = [rule for rule in rules if getattr(rule, "variant_id", None) == event_variant.id]
        rules = variant_rules if variant_rules else [rule for rule in rules if getattr(rule, "variant_id", None) is None]
    else:
        rules = [rule for rule in rules if getattr(rule, "variant_id", None) is None]

    level_codes = {
        getattr(getattr(rule, "level", None), "level_code", None)
        for rule in rules
    }
    level_codes.discard(None)
    return sorted(level_codes, key=lambda code: (LEVEL_CODE_SORT_ORDER.get(code, 99), code))


def repair_event_catalog_records(queryset=None, dry_run=False):
    from events.models import Event

    events_queryset = queryset if queryset is not None else Event.objects.all()
    events_queryset = events_queryset.select_related(
        "event_definition",
        "event_definition__category",
        "event_variant",
    )

    max_name_length = Event._meta.get_field("name").max_length
    stats = {
        "inspected_events": 0,
        "updated_events": 0,
        "updated_name": 0,
        "updated_category": 0,
        "cleared_invalid_variant": 0,
        "cleared_orphan_variant": 0,
        "unknown_catalog_category": 0,
    }

    for event in events_queryset:
        stats["inspected_events"] += 1
        fields_to_update = []

        event_definition = getattr(event, "event_definition", None)
        event_variant = getattr(event, "event_variant", None)

        if event_definition is None:
            if event_variant is not None:
                event.event_variant = None
                fields_to_update.append("event_variant")
                stats["cleared_orphan_variant"] += 1
        else:
            if event_variant is not None and getattr(event_variant, "event_id", None) != event_definition.id:
                event.event_variant = None
                event_variant = None
                fields_to_update.append("event_variant")
                stats["cleared_invalid_variant"] += 1

            canonical_name = build_canonical_event_name_from_models(
                event_definition,
                event_variant=event_variant,
                max_length=max_name_length,
            )
            if event.name != canonical_name:
                event.name = canonical_name
                fields_to_update.append("name")
                stats["updated_name"] += 1

            mapped_category = map_event_definition_category_to_event_category(event_definition, strict=False)
            if mapped_category is None:
                stats["unknown_catalog_category"] += 1
            elif event.category != mapped_category:
                event.category = mapped_category
                fields_to_update.append("category")
                stats["updated_category"] += 1

        if fields_to_update:
            stats["updated_events"] += 1
            if not dry_run:
                event.save(update_fields=list(dict.fromkeys(fields_to_update)))

    return stats
