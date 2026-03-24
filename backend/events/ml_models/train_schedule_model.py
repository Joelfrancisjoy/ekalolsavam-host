from events.ml_models.schedule_recommender import ScheduleRecommender


def train_model(lookback_days=365, test_size=0.2):
    recommender = ScheduleRecommender()
    return recommender.train(lookback_days=lookback_days, test_size=test_size)


def summarize_dataset(lookback_days=365):
    recommender = ScheduleRecommender()
    return recommender.summarize_dataset(lookback_days=lookback_days)
