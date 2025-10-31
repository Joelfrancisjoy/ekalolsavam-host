"""
Views for anomaly detection in judge scoring.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count
from .models import Score
from .serializers import ScoreSerializer
from .ml_models.anomaly_detector import get_anomaly_detector
import logging

logger = logging.getLogger(__name__)


def check_score_anomaly(score_data):
    """
    Check if a score is anomalous using the trained ML model.
    
    Args:
        score_data: Dict with score values
    
    Returns:
        Tuple of (is_anomaly, confidence, details)
    """
    try:
        detector = get_anomaly_detector()
        is_anomaly, confidence, details = detector.detect_anomaly(score_data)
        logger.info(f"Anomaly check: is_anomaly={is_anomaly}, confidence={confidence:.3f}")
        return is_anomaly, confidence, details
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        # Return safe defaults on error
        return False, 0.0, {'method': 'error', 'error': str(e)}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def flagged_scores(request):
    """
    Get all flagged scores for admin review.
    
    Query params:
        - event: Filter by event ID
        - judge: Filter by judge ID
        - severity: Filter by severity (high, medium, low)
        - reviewed: Filter by review status (true/false)
    
    Returns:
        List of flagged scores with details
    """
    user = request.user
    
    # Only admins can view flagged scores
    if user.role != 'admin':
        return Response(
            {"error": "Only admins can view flagged scores"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Build queryset
    queryset = Score.objects.filter(is_flagged=True)
    
    # Apply filters
    event_id = request.query_params.get('event')
    if event_id:
        queryset = queryset.filter(event_id=event_id)
    
    judge_id = request.query_params.get('judge')
    if judge_id:
        queryset = queryset.filter(judge_id=judge_id)
    
    severity = request.query_params.get('severity')
    if severity:
        queryset = queryset.filter(anomaly_details__severity=severity)
    
    reviewed = request.query_params.get('reviewed')
    if reviewed is not None:
        reviewed_bool = reviewed.lower() == 'true'
        queryset = queryset.filter(admin_reviewed=reviewed_bool)
    
    # Order by confidence (highest first)
    queryset = queryset.order_by('-anomaly_confidence', '-submitted_at')
    
    # Serialize
    scores = []
    for score in queryset:
        scores.append({
            'id': score.id,
            'event': {
                'id': score.event.id,
                'name': score.event.name,
                'category': score.event.category
            },
            'participant': {
                'id': score.participant.id,
                'username': score.participant.username
            },
            'judge': {
                'id': score.judge.id,
                'username': score.judge.username
            },
            'scores': {
                'technical_skill': float(score.technical_skill) if score.technical_skill else 0,
                'artistic_expression': float(score.artistic_expression) if score.artistic_expression else 0,
                'stage_presence': float(score.stage_presence) if score.stage_presence else 0,
                'overall_impression': float(score.overall_impression) if score.overall_impression else 0,
                'total_score': float(score.total_score)
            },
            'anomaly': {
                'confidence': float(score.anomaly_confidence) if score.anomaly_confidence else 0,
                'severity': score.anomaly_details.get('severity', 'unknown'),
                'details': score.anomaly_details
            },
            'admin_reviewed': score.admin_reviewed,
            'admin_notes': score.admin_notes,
            'submitted_at': score.submitted_at.isoformat()
        })
    
    # Summary stats
    total_flagged = queryset.count()
    reviewed_count = queryset.filter(admin_reviewed=True).count()
    pending_count = total_flagged - reviewed_count
    
    severity_counts = {
        'high': queryset.filter(anomaly_details__severity='high').count(),
        'medium': queryset.filter(anomaly_details__severity='medium').count(),
        'low': queryset.filter(anomaly_details__severity='low').count()
    }
    
    return Response({
        'total_flagged': total_flagged,
        'reviewed': reviewed_count,
        'pending': pending_count,
        'severity_counts': severity_counts,
        'scores': scores
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_flagged_score(request, score_id):
    """
    Mark a flagged score as reviewed by admin.
    
    POST body:
        {
            "approved": true/false,
            "notes": "Admin notes"
        }
    """
    user = request.user
    
    # Only admins can review
    if user.role != 'admin':
        return Response(
            {"error": "Only admins can review flagged scores"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        score = Score.objects.get(id=score_id, is_flagged=True)
    except Score.DoesNotExist:
        return Response(
            {"error": "Flagged score not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    approved = request.data.get('approved', True)
    notes = request.data.get('notes', '')
    
    # Update score
    score.admin_reviewed = True
    score.admin_notes = notes
    
    # If not approved, could add additional handling here
    # (e.g., notify judge, remove score, etc.)
    
    score.save()
    
    return Response({
        'status': 'ok',
        'message': 'Score reviewed successfully',
        'score_id': score.id,
        'approved': approved
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def judge_anomaly_stats(request):
    """
    Get anomaly statistics for all judges.
    
    Returns:
        List of judges with their anomaly rates
    """
    user = request.user
    
    # Only admins can view stats
    if user.role != 'admin':
        return Response(
            {"error": "Only admins can view judge statistics"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all judges with scores
    from users.models import User
    judges = User.objects.filter(role='judge', judged_scores__isnull=False).distinct()
    
    stats = []
    for judge in judges:
        total_scores = Score.objects.filter(judge=judge).count()
        flagged_scores = Score.objects.filter(judge=judge, is_flagged=True).count()
        
        if total_scores > 0:
            anomaly_rate = (flagged_scores / total_scores) * 100
            
            # Get severity breakdown
            high_severity = Score.objects.filter(
                judge=judge,
                is_flagged=True,
                anomaly_details__severity='high'
            ).count()
            
            medium_severity = Score.objects.filter(
                judge=judge,
                is_flagged=True,
                anomaly_details__severity='medium'
            ).count()
            
            low_severity = Score.objects.filter(
                judge=judge,
                is_flagged=True,
                anomaly_details__severity='low'
            ).count()
            
            stats.append({
                'judge_id': judge.id,
                'judge_name': judge.username,
                'total_scores': total_scores,
                'flagged_scores': flagged_scores,
                'anomaly_rate': round(anomaly_rate, 2),
                'severity_breakdown': {
                    'high': high_severity,
                    'medium': medium_severity,
                    'low': low_severity
                }
            })
    
    # Sort by anomaly rate (highest first)
    stats.sort(key=lambda x: x['anomaly_rate'], reverse=True)
    
    return Response({
        'total_judges': len(stats),
        'judges': stats
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def event_anomaly_summary(request):
    """
    Get anomaly counts per event for admin panel display.
    
    Returns:
        Dict with event_id -> anomaly count mapping
    """
    user = request.user
    
    # Only admins can view
    if user.role != 'admin':
        return Response(
            {"error": "Only admins can view anomaly summary"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all flagged scores grouped by event
    from django.db.models import Count
    
    event_anomalies = Score.objects.filter(is_flagged=True).values('event_id').annotate(
        count=Count('id'),
        unreviewed=Count('id', filter=Q(admin_reviewed=False))
    )
    
    # Build response dict
    summary = {}
    for item in event_anomalies:
        summary[item['event_id']] = {
            'total_flagged': item['count'],
            'unreviewed': item['unreviewed']
        }
    
    return Response(summary)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_judge_pattern(request, judge_id):
    """
    Analyze a specific judge's scoring pattern for bias.
    
    Returns:
        Detailed analysis of judge's scoring patterns
    """
    user = request.user
    
    # Only admins can analyze patterns
    if user.role != 'admin':
        return Response(
            {"error": "Only admins can analyze judge patterns"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from users.models import User
        judge = User.objects.get(id=judge_id, role='judge')
    except User.DoesNotExist:
        return Response(
            {"error": "Judge not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get all scores from this judge
    scores = Score.objects.filter(judge=judge)
    
    if scores.count() == 0:
        return Response(
            {"error": "No scores found for this judge"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Prepare data for analysis
    judge_scores = []
    for score in scores:
        judge_scores.append({
            'technical_skill': float(score.technical_skill) if score.technical_skill else 0,
            'artistic_expression': float(score.artistic_expression) if score.artistic_expression else 0,
            'stage_presence': float(score.stage_presence) if score.stage_presence else 0,
            'overall_impression': float(score.overall_impression) if score.overall_impression else 0,
            'total_score': float(score.total_score)
        })
    
    # Analyze pattern
    try:
        detector = get_anomaly_detector()
        analysis = detector.analyze_judge_pattern(judge_scores)
        
        return Response({
            'judge_id': judge.id,
            'judge_name': judge.username,
            'analysis': analysis
        })
    
    except Exception as e:
        logger.error(f"Pattern analysis failed: {e}")
        return Response(
            {"error": f"Analysis failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
