import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import (
    ArtCategory,
    Level,
    ParticipationType,
    EventDefinition,
    EventVariant,
    EventRule,
)


class Command(BaseCommand):
    help = 'Load catalog seed JSON into normalized Kalolsavam master tables.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            default=str(Path('catalog') / 'seed_catalog.json'),
            help='Path to seed JSON file (default: catalog/seed_catalog.json)',
        )

    def handle(self, *args, **options):
        path = Path(options['path'])
        if not path.is_absolute():
            path = Path.cwd() / path

        if not path.exists():
            raise FileNotFoundError(f'Seed file not found: {path}')

        payload = json.loads(path.read_text(encoding='utf-8'))

        categories = payload.get('categories') or []
        levels = payload.get('levels') or []
        participation_types = payload.get('participation_types') or []
        events = payload.get('events') or []

        for c in categories:
            name = str(c).strip()
            if not name:
                continue
            ArtCategory.objects.get_or_create(category_name=name)

        for lvl in levels:
            code = str(lvl.get('level_code') or '').strip()
            name = str(lvl.get('level_name') or '').strip()
            if not code:
                continue
            obj, created = Level.objects.get_or_create(level_code=code, defaults={'level_name': name or code})
            if not created and name and obj.level_name != name:
                obj.level_name = name
                obj.save(update_fields=['level_name'])

        for pt in participation_types:
            name = str(pt).strip()
            if not name:
                continue
            ParticipationType.objects.get_or_create(type_name=name)

        category_map = {c.category_name: c for c in ArtCategory.objects.all()}
        level_map = {l.level_code: l for l in Level.objects.all()}
        pt_map = {p.type_name: p for p in ParticipationType.objects.all()}

        existing_defs = {d.event_code: d for d in EventDefinition.objects.all()}
        existing_variants = {(v.event_id, v.variant_name): v for v in EventVariant.objects.all()}
        existing_rules = {
            (r.event_id, r.variant_id, r.level_id, r.gender_eligibility): r
            for r in EventRule.objects.all()
        }

        created_events = 0
        updated_events = 0
        created_variants = 0
        created_rules = 0

        total_events = len(events)
        for idx, ev in enumerate(events, start=1):
            event_code = str(ev.get('event_code') or '').strip()
            event_name = str(ev.get('event_name') or '').strip()
            category_name = str(ev.get('category') or '').strip()
            participation_type_name = str(ev.get('participation_type') or '').strip()

            if not event_code or not event_name:
                raise ValueError('Each event must have event_code and event_name')
            if category_name not in category_map:
                raise ValueError(f'Unknown category for {event_code}: {category_name}')
            if participation_type_name not in pt_map:
                raise ValueError(f'Unknown participation_type for {event_code}: {participation_type_name}')

            if idx % 5 == 0 or idx == 1 or idx == total_events:
                self.stdout.write(f'Processing {idx}/{total_events}: {event_code} - {event_name}')

            with transaction.atomic():
                obj = existing_defs.get(event_code)
                if obj is None:
                    obj = EventDefinition.objects.create(
                        event_code=event_code,
                        event_name=event_name,
                        category=category_map[category_name],
                        participation_type=pt_map[participation_type_name],
                    )
                    existing_defs[event_code] = obj
                    created_events += 1
                else:
                    changed = False
                    if obj.event_name != event_name:
                        obj.event_name = event_name
                        changed = True
                    if obj.category_id != category_map[category_name].id:
                        obj.category = category_map[category_name]
                        changed = True
                    if obj.participation_type_id != pt_map[participation_type_name].id:
                        obj.participation_type = pt_map[participation_type_name]
                        changed = True
                    if changed:
                        obj.save(update_fields=['event_name', 'category', 'participation_type'])
                        updated_events += 1

                variants = ev.get('variants') or []
                variant_map = {}
                for v in variants:
                    vname = str(v).strip()
                    if not vname:
                        continue
                    key = (obj.id, vname)
                    vobj = existing_variants.get(key)
                    if vobj is None:
                        vobj = EventVariant.objects.create(event=obj, variant_name=vname)
                        existing_variants[key] = vobj
                        created_variants += 1
                    variant_map[vname] = vobj

                rules = ev.get('rules') or []
                for r in rules:
                    level_code = str(r.get('level') or '').strip()
                    gender = str(r.get('gender_eligibility') or '').strip()
                    duration = r.get('duration_minutes', None)
                    min_p = r.get('min_participants', None)
                    max_p = r.get('max_participants', None)
                    variant_name = r.get('variant', None)

                    if level_code not in level_map:
                        raise ValueError(f'Unknown level for {event_code}: {level_code}')

                    is_group = participation_type_name == 'GROUP'
                    if is_group:
                        if min_p is None or max_p is None:
                            raise ValueError(f'{event_code} is GROUP; rule must include min_participants and max_participants')
                        if int(min_p) > int(max_p):
                            raise ValueError(f'{event_code} has invalid rule: min_participants > max_participants')
                    else:
                        if min_p is not None or max_p is not None:
                            raise ValueError(f'{event_code} is INDIVIDUAL; rule must not include min_participants/max_participants')

                    variant_obj = None
                    if variant_name is not None:
                        vn = str(variant_name).strip()
                        if vn:
                            variant_obj = variant_map.get(vn)
                            if variant_obj is None:
                                key = (obj.id, vn)
                                variant_obj = existing_variants.get(key)
                                if variant_obj is None:
                                    variant_obj = EventVariant.objects.create(event=obj, variant_name=vn)
                                    existing_variants[key] = variant_obj
                                    created_variants += 1
                                variant_map[vn] = variant_obj

                    rule_key = (obj.id, getattr(variant_obj, 'id', None), level_map[level_code].id, gender)
                    rule_obj = existing_rules.get(rule_key)
                    if rule_obj is None:
                        rule_obj = EventRule.objects.create(
                            event=obj,
                            variant=variant_obj,
                            level=level_map[level_code],
                            gender_eligibility=gender,
                            duration_minutes=duration,
                            min_participants=min_p,
                            max_participants=max_p,
                        )
                        existing_rules[rule_key] = rule_obj
                        created_rules += 1
                    else:
                        changed = False
                        if rule_obj.duration_minutes != duration:
                            rule_obj.duration_minutes = duration
                            changed = True
                        if rule_obj.min_participants != min_p:
                            rule_obj.min_participants = min_p
                            changed = True
                        if rule_obj.max_participants != max_p:
                            rule_obj.max_participants = max_p
                            changed = True
                        if changed:
                            rule_obj.save(update_fields=['duration_minutes', 'min_participants', 'max_participants'])

        self.stdout.write(self.style.SUCCESS('Catalog seed load complete'))
        self.stdout.write(f'EventDefinitions created: {created_events}, updated: {updated_events}')
        self.stdout.write(f'EventVariants created: {created_variants}')
        self.stdout.write(f'EventRules created: {created_rules}')
