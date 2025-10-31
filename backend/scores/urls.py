from django.urls import path
from .views import (
    ScoreListCreateView,
    ResultListView,
    JudgeResultsView,
    submit_scores_bundle,
    scores_summary,
    get_event_criteria,
    student_scores
)
from .anomaly_views import (
    flagged_scores,
    review_flagged_score,
    judge_anomaly_stats,
    analyze_judge_pattern,
    event_anomaly_summary
)
from .prediction_views import (
    predict_performance,
    batch_predict_performance,
    participant_performance_history
)

urlpatterns = [
    path('', ScoreListCreateView.as_view(), name='score-list-create'),
    path('results/', ResultListView.as_view(), name='result-list'),
    path('judge-results/', JudgeResultsView.as_view(), name='judge-results'),
    path('submit/', submit_scores_bundle, name='submit-scores'),
    path('summary/', scores_summary, name='scores-summary'),
    path('criteria/', get_event_criteria, name='event-criteria'),
    path('student/', student_scores, name='student-scores'),
    
    # Anomaly detection endpoints
    path('flagged/', flagged_scores, name='flagged-scores'),
    path('flagged/<int:score_id>/review/', review_flagged_score, name='review-flagged-score'),
    path('judge-stats/', judge_anomaly_stats, name='judge-anomaly-stats'),
    path('judge/<int:judge_id>/analyze/', analyze_judge_pattern, name='analyze-judge-pattern'),
    path('event-anomalies/', event_anomaly_summary, name='event-anomaly-summary'),
    
    # Performance prediction endpoints
    path('predict-performance/', predict_performance, name='predict-performance'),
    path('batch-predict/', batch_predict_performance, name='batch-predict-performance'),
    path('performance-history/', participant_performance_history, name='performance-history'),
]