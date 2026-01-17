from django.urls import path
from .views import (
    ScoreListCreateView,
    ResultListView,
    JudgeResultsView,
    submit_scores_bundle,
    scores_summary,
    get_event_criteria,
    student_scores,
    student_result_details,
    submit_recheck_request,
    student_recheck_request_details,
    student_recheck_request_pay,
    initiate_recheck_payment,
    verify_recheck_payment,
    volunteer_recheck_requests,
    volunteer_recheck_request_details,
    volunteer_accept_recheck_request,
    judge_recheck_requests
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

    # Student recheck workflow endpoints
    path('student/results/<int:result_id>/',
         student_result_details, name='student-result-details'),
    path('student/result-recheck/', submit_recheck_request,
         name='submit-recheck-request'),
    path('student/recheck-request/<uuid:recheck_request_id>/',
         student_recheck_request_details, name='student-recheck-request-details'),
    path('student/recheck-request/<uuid:recheck_request_id>/pay/',
         student_recheck_request_pay, name='student-recheck-request-pay'),
    path('student/recheck-request/<uuid:recheck_request_id>/initiate-payment/',
         initiate_recheck_payment, name='initiate-recheck-payment'),
    path('student/recheck-request/verify-payment/',
         verify_recheck_payment, name='verify-recheck-payment'),

    # Volunteer recheck workflow endpoints
    path('volunteer/result-re-evaluation/', volunteer_recheck_requests,
         name='volunteer-recheck-requests'),
    path('volunteer/result-re-evaluation/<uuid:recheck_request_id>/',
         volunteer_recheck_request_details, name='volunteer-recheck-request-details'),
    path('volunteer/result-re-evaluation/<uuid:recheck_request_id>/accept/',
         volunteer_accept_recheck_request, name='volunteer-accept-recheck-request'),

    # Judge recheck workflow endpoints
    path('judge/recheck-requests/', judge_recheck_requests,
         name='judge-recheck-requests'),

    # Anomaly detection endpoints
    path('flagged/', flagged_scores, name='flagged-scores'),
    path('flagged/<int:score_id>/review/',
         review_flagged_score, name='review-flagged-score'),
    path('judge-stats/', judge_anomaly_stats, name='judge-anomaly-stats'),
    path('judge/<int:judge_id>/analyze/',
         analyze_judge_pattern, name='analyze-judge-pattern'),
    path('event-anomalies/', event_anomaly_summary, name='event-anomaly-summary'),

    # Performance prediction endpoints
    path('predict-performance/', predict_performance, name='predict-performance'),
    path('batch-predict/', batch_predict_performance,
         name='batch-predict-performance'),
    path('performance-history/', participant_performance_history,
         name='performance-history'),
]
