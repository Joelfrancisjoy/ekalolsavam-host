import logging
import pickle
from collections import Counter
from datetime import date as date_cls
from datetime import time, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from events.models import Event, EventRegistration, Venue

logger = logging.getLogger(__name__)

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import OneHotEncoder

    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. Scheduling recommendations will use rule-based fallback.")

DAY_START = time(9, 0)
DAY_END = time(20, 0)


def _time_to_minutes(value: time) -> int:
    return value.hour * 60 + value.minute


def _minutes_to_time(minutes: int) -> time:
    hours = minutes // 60
    mins = minutes % 60
    return time(hours, mins)


def _slots_for_duration(duration_minutes: int, day_start: time = DAY_START, day_end: time = DAY_END) -> List[Tuple[time, time]]:
    slots: List[Tuple[time, time]] = []
    cursor = _time_to_minutes(day_start)
    end_boundary = _time_to_minutes(day_end)
    while cursor + duration_minutes <= end_boundary:
        start = _minutes_to_time(cursor)
        end = _minutes_to_time(cursor + duration_minutes)
        slots.append((start, end))
        cursor += duration_minutes
    return slots


class ScheduleRecommender:
    """
    Conflict-avoidance-first event scheduling recommender.

    Provides an additive advisory layer:
    - ML scoring when model artifacts are available.
    - Deterministic rule-based fallback when ML is unavailable or untrained.
    """

    def __init__(self):
        self.model_dir = Path(__file__).parent / "models"
        self.model_dir.mkdir(exist_ok=True)

        self.model_path = self.model_dir / "schedule_recommender.pkl"
        self.encoder_path = self.model_dir / "schedule_recommender_encoder.pkl"

        self.model = None
        self.encoder = None
        self.is_trained = False

        if SKLEARN_AVAILABLE:
            self._load_model()

    def _load_model(self) -> bool:
        try:
            if self.model_path.exists() and self.encoder_path.exists():
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                with open(self.encoder_path, "rb") as f:
                    self.encoder = pickle.load(f)
                self.is_trained = True
                logger.info("Loaded scheduling recommender model")
                return True
        except (OSError, pickle.UnpicklingError, EOFError, AttributeError, ImportError, ValueError, TypeError) as exc:
            logger.warning("Failed to load schedule model: %s", exc)
        return False

    def _save_model(self):
        with open(self.model_path, "wb") as f:
            pickle.dump(self.model, f)
        with open(self.encoder_path, "wb") as f:
            pickle.dump(self.encoder, f)

    def _event_duration_minutes(self, event: Event) -> int:
        start_minutes = _time_to_minutes(event.start_time)
        end_minutes = _time_to_minutes(event.end_time)
        duration = max(end_minutes - start_minutes, 30)
        return duration

    def build_training_dataset(self, lookback_days: int = 365) -> List[Dict]:
        """
        Build dataset from historical events using conflict-avoidance-oriented labels.

        Label (target):
        - conflict_penalty = venue_overlap_count + judge_overlap_count + volunteer_overlap_count
        """
        threshold_date = date_cls.today() - timedelta(days=max(1, int(lookback_days)))
        events = (
            Event.objects.filter(date__gte=threshold_date)
            .select_related("venue")
            .prefetch_related("judges", "volunteers")
            .order_by("date", "start_time")
        )

        rows: List[Dict] = []
        for event in events:
            rows.append(self._build_feature_row_for_existing_event(event))
        return rows

    def _overlap_queryset(self, event_date: date_cls, start_time: time, end_time: time, exclude_event_id: Optional[int] = None):
        qs = Event.objects.filter(
            date=event_date,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_event_id is not None:
            qs = qs.exclude(pk=exclude_event_id)
        return qs

    def _build_feature_row_for_existing_event(self, event: Event) -> Dict:
        overlap_qs = self._overlap_queryset(
            event_date=event.date,
            start_time=event.start_time,
            end_time=event.end_time,
            exclude_event_id=event.id,
        ).prefetch_related("judges", "volunteers")

        venue_overlap_count = overlap_qs.filter(venue_id=event.venue_id).count()

        event_judge_ids = set(event.judges.values_list("id", flat=True))
        event_volunteer_ids = set(event.volunteers.values_list("id", flat=True))

        judge_overlap_count = 0
        volunteer_overlap_count = 0

        for candidate in overlap_qs:
            if event_judge_ids and set(candidate.judges.values_list("id", flat=True)).intersection(event_judge_ids):
                judge_overlap_count += 1
            if event_volunteer_ids and set(candidate.volunteers.values_list("id", flat=True)).intersection(event_volunteer_ids):
                volunteer_overlap_count += 1

        confirmed_count = EventRegistration.objects.filter(event=event, status__in=["confirmed", "approved"]).count()
        capacity_ratio = 0.0
        if event.max_participants:
            capacity_ratio = min(confirmed_count / float(event.max_participants), 2.0)

        conflict_penalty = float(venue_overlap_count + judge_overlap_count + volunteer_overlap_count)
        total_overlap_count = float(venue_overlap_count + judge_overlap_count + volunteer_overlap_count)

        return {
            "event_id": event.id,
            "event_category": event.category,
            "weekday": event.date.weekday(),
            "start_minutes": _time_to_minutes(event.start_time),
            "duration_minutes": self._event_duration_minutes(event),
            "venue_capacity": float(event.venue.capacity if event.venue else 0),
            "event_limit": float(event.venue.event_limit if event.venue else 0),
            "max_participants": float(event.max_participants or 0),
            "historical_registrations": float(confirmed_count),
            "capacity_ratio": float(capacity_ratio),
            "total_overlap_count": total_overlap_count,
            "venue_overlap_count": float(venue_overlap_count),
            "judge_overlap_count": float(judge_overlap_count),
            "volunteer_overlap_count": float(volunteer_overlap_count),
            "conflict_penalty": conflict_penalty,
        }

    def train(self, lookback_days: int = 365, test_size: float = 0.2) -> Dict:
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for training. Install with: pip install scikit-learn")

        rows = self.build_training_dataset(lookback_days=lookback_days)
        if len(rows) < 20:
            raise ValueError("Need at least 20 historical events for training")

        categorical = np.array([[row["event_category"]] for row in rows], dtype=object)
        numeric = np.array(
            [
                [
                    row["weekday"],
                    row["start_minutes"],
                    row["duration_minutes"],
                    row["venue_capacity"],
                    row["event_limit"],
                    row["max_participants"],
                    row["historical_registrations"],
                    row["capacity_ratio"],
                    row["total_overlap_count"],
                ]
                for row in rows
            ],
            dtype=float,
        )
        y = np.array([row["conflict_penalty"] for row in rows], dtype=float)

        self.encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        cat_encoded = self.encoder.fit_transform(categorical)
        X = np.hstack([numeric, cat_encoded])

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=42,
        )

        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)
        train_pred = self.model.predict(X_train)
        test_pred = self.model.predict(X_test)

        self.is_trained = True
        self._save_model()

        train_mae = float(np.mean(np.abs(train_pred - y_train)))
        test_mae = float(np.mean(np.abs(test_pred - y_test)))

        return {
            "total_samples": int(len(rows)),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "train_mae": train_mae,
            "test_mae": test_mae,
            "model_type": "random_forest_regressor",
        }

    def _build_candidate_feature_row(
        self,
        *,
        target_event: Event,
        candidate_date: date_cls,
        candidate_start: time,
        candidate_end: time,
        venue: Venue,
    ) -> Dict:
        overlap_qs = self._overlap_queryset(
            event_date=candidate_date,
            start_time=candidate_start,
            end_time=candidate_end,
            exclude_event_id=target_event.id,
        ).prefetch_related("judges", "volunteers")

        venue_overlap_count = overlap_qs.filter(venue_id=venue.id).count()

        target_judge_ids = set(target_event.judges.values_list("id", flat=True))
        target_volunteer_ids = set(target_event.volunteers.values_list("id", flat=True))

        judge_overlap_count = 0
        volunteer_overlap_count = 0
        for existing in overlap_qs:
            if target_judge_ids and set(existing.judges.values_list("id", flat=True)).intersection(target_judge_ids):
                judge_overlap_count += 1
            if target_volunteer_ids and set(existing.volunteers.values_list("id", flat=True)).intersection(target_volunteer_ids):
                volunteer_overlap_count += 1

        confirmed_count = EventRegistration.objects.filter(
            event=target_event,
            status__in=["confirmed", "approved"],
        ).count()
        capacity_ratio = min(confirmed_count / float(target_event.max_participants), 2.0) if target_event.max_participants else 0.0

        return {
            "event_category": target_event.category,
            "weekday": candidate_date.weekday(),
            "start_minutes": _time_to_minutes(candidate_start),
            "duration_minutes": max(_time_to_minutes(candidate_end) - _time_to_minutes(candidate_start), 30),
            "venue_capacity": float(venue.capacity),
            "event_limit": float(venue.event_limit),
            "max_participants": float(target_event.max_participants or 0),
            "historical_registrations": float(confirmed_count),
            "capacity_ratio": float(capacity_ratio),
            "total_overlap_count": float(venue_overlap_count + judge_overlap_count + volunteer_overlap_count),
            "venue_overlap_count": float(venue_overlap_count),
            "judge_overlap_count": float(judge_overlap_count),
            "volunteer_overlap_count": float(volunteer_overlap_count),
        }

    def _vectorize_row(self, row: Dict) -> np.ndarray:
        if self.encoder is None:
            raise ValueError("Encoder is not initialized")

        categorical = np.array([[row["event_category"]]], dtype=object)
        numeric = np.array(
            [
                [
                    row["weekday"],
                    row["start_minutes"],
                    row["duration_minutes"],
                    row["venue_capacity"],
                    row["event_limit"],
                    row["max_participants"],
                    row["historical_registrations"],
                    row["capacity_ratio"],
                    row["total_overlap_count"],
                ]
            ],
            dtype=float,
        )
        cat_encoded = self.encoder.transform(categorical)
        return np.hstack([numeric, cat_encoded])

    def recommend_timeslots(
        self,
        *,
        event: Event,
        from_date: date_cls,
        to_date: date_cls,
        venue_id: Optional[int] = None,
        top_k: int = 5,
    ) -> List[Dict]:
        if from_date > to_date:
            raise ValueError("from_date must be <= to_date")
        if top_k < 1:
            raise ValueError("top_k must be >= 1")

        duration = self._event_duration_minutes(event)
        candidate_venues = Venue.objects.all()
        if venue_id:
            candidate_venues = candidate_venues.filter(pk=venue_id)
        candidate_venues = list(candidate_venues)
        if not candidate_venues:
            raise ValueError("No candidate venues available for recommendation")

        recommendations: List[Dict] = []
        current_date = from_date
        slots = _slots_for_duration(duration)
        if not slots:
            raise ValueError("Could not generate slots for the given duration")

        while current_date <= to_date:
            for venue in candidate_venues:
                for start_value, end_value in slots:
                    row = self._build_candidate_feature_row(
                        target_event=event,
                        candidate_date=current_date,
                        candidate_start=start_value,
                        candidate_end=end_value,
                        venue=venue,
                    )
                    venue_conflicts = int(row["venue_overlap_count"])
                    judge_conflicts = int(row["judge_overlap_count"])
                    volunteer_conflicts = int(row["volunteer_overlap_count"])

                    if self.is_trained and self.model is not None and self.encoder is not None:
                        features = self._vectorize_row(row)
                        predicted_penalty = float(self.model.predict(features)[0])
                        method = "ml"
                    else:
                        predicted_penalty = float(row["total_overlap_count"])
                        method = "rule_based"

                    recommendations.append(
                        {
                            "date": current_date.isoformat(),
                            "start_time": start_value.strftime("%H:%M:%S"),
                            "end_time": end_value.strftime("%H:%M:%S"),
                            "venue_id": venue.id,
                            "venue_name": venue.name,
                            "predicted_conflict_penalty": round(max(predicted_penalty, 0.0), 4),
                            "conflict_breakdown": {
                                "venue_overlap": venue_conflicts,
                                "judge_overlap": judge_conflicts,
                                "volunteer_overlap": volunteer_conflicts,
                                "total_overlap": int(row["total_overlap_count"]),
                            },
                            "method": method,
                        }
                    )
            current_date += timedelta(days=1)

        recommendations.sort(
            key=lambda item: (
                item["predicted_conflict_penalty"],
                item["conflict_breakdown"]["total_overlap"],
                item["date"],
                item["start_time"],
                item["venue_name"],
            )
        )
        return recommendations[:top_k]

    def summarize_dataset(self, lookback_days: int = 365) -> Dict:
        rows = self.build_training_dataset(lookback_days=lookback_days)
        if not rows:
            return {
                "total_samples": 0,
                "category_counts": {},
                "avg_conflict_penalty": 0.0,
                "avg_overlaps": {
                    "venue": 0.0,
                    "judge": 0.0,
                    "volunteer": 0.0,
                },
            }

        category_counts = Counter(row["event_category"] for row in rows)
        avg_conflict_penalty = float(np.mean([row["conflict_penalty"] for row in rows]))
        avg_venue_overlap = float(np.mean([row["venue_overlap_count"] for row in rows]))
        avg_judge_overlap = float(np.mean([row["judge_overlap_count"] for row in rows]))
        avg_volunteer_overlap = float(np.mean([row["volunteer_overlap_count"] for row in rows]))

        return {
            "total_samples": len(rows),
            "category_counts": dict(category_counts),
            "avg_conflict_penalty": round(avg_conflict_penalty, 4),
            "avg_overlaps": {
                "venue": round(avg_venue_overlap, 4),
                "judge": round(avg_judge_overlap, 4),
                "volunteer": round(avg_volunteer_overlap, 4),
            },
        }


_schedule_recommender_instance = None


def get_schedule_recommender() -> ScheduleRecommender:
    global _schedule_recommender_instance
    if _schedule_recommender_instance is None:
        _schedule_recommender_instance = ScheduleRecommender()
    return _schedule_recommender_instance
