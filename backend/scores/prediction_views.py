"""
Views for participant performance prediction.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg, Max, Min, Count
from .models import Score
from events.models import Event
from users.models import User
from .ml_models.performance_predictor import get_performance_predictor
import logging

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def predict_performance(request):
    """
    Predict participant's performance for an event.
    
    GET: Predict for current user
    POST: Predict for specific participant (judges/admins only)
    
    Query/Body params:
        - participant_id: Participant user ID (optional for GET, required for POST)
        - event_id: Event ID (required)
        - event_category: Event category (optional, will be fetched from event)
    
    Returns:
        Predicted score with confidence and details
    """
    user = request.user
    
    # Get parameters
    if request.method == 'POST':
        participant_id = request.data.get('participant_id')
        event_id = request.data.get('event_id')
    else:
        participant_id = request.query_params.get('participant_id', user.id)
        event_id = request.query_params.get('event_id')
    
    # Authorization check
    if request.method == 'POST' and user.role not in ['judge', 'admin']:
        return Response(
            {"error": "Only judges and admins can predict for other participants"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if not event_id:
        return Response(
            {"error": "event_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get event
        event = Event.objects.get(id=event_id)
        
        # Get participant
        participant = User.objects.get(id=participant_id)
        
        # Get participant's historical scores
        past_scores_qs = Score.objects.filter(
            participant=participant
        ).order_by('submitted_at')
        
        past_scores = [float(score.total_score) for score in past_scores_qs]
        
        # Get participant's school category
        school_category = 'HS'  # Default
        if hasattr(participant, 'school') and participant.school:
            school_category = participant.school.category
        
        # Count events participated
        num_events = Score.objects.filter(participant=participant).values('event').distinct().count()
        
        # Prepare data for prediction
        participant_data = {
            'past_scores': past_scores,
            'event_category': event.category,
            'school_category': school_category,
            'num_events_participated': num_events
        }
        
        # Get predictor and predict
        predictor = get_performance_predictor()
        predicted_score, details = predictor.predict(participant_data)
        
        # Calculate score range (confidence interval)
        confidence = details.get('confidence', 0.7)
        margin = (1 - confidence) * 15  # Lower confidence = wider range
        
        score_range = {
            'min': max(0, predicted_score - margin),
            'max': min(100, predicted_score + margin)
        }
        
        return Response({
            'participant': {
                'id': participant.id,
                'username': participant.username
            },
            'event': {
                'id': event.id,
                'name': event.name,
                'category': event.category
            },
            'prediction': {
                'predicted_score': round(predicted_score, 1),
                'score_range': {
                    'min': round(score_range['min'], 1),
                    'max': round(score_range['max'], 1)
                },
                'confidence': round(confidence, 3),
                'method': details.get('method', 'unknown')
            },
            'historical_data': {
                'past_scores': past_scores,
                'avg_score': round(details['past_performance']['avg'], 1) if details['past_performance']['avg'] else None,
                'max_score': round(details['past_performance']['max'], 1) if details['past_performance'].get('max') else None,
                'min_score': round(details['past_performance']['min'], 1) if details['past_performance'].get('min') else None,
                'events_participated': num_events
            }
        })
    
    except Event.DoesNotExist:
        return Response(
            {"error": "Event not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except User.DoesNotExist:
        return Response(
            {"error": "Participant not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Performance prediction failed: {e}")
        return Response(
            {"error": f"Prediction failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def batch_predict_performance(request):
    """
    Predict performance for multiple participants in an event.
    
    Query params:
        - event_id: Event ID (required)
    
    Returns:
        List of predictions for all registered participants
    """
    user = request.user
    
    # Only judges and admins can use batch prediction
    if user.role not in ['judge', 'admin']:
        return Response(
            {"error": "Only judges and admins can use batch prediction"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    event_id = request.query_params.get('event_id')
    
    if not event_id:
        return Response(
            {"error": "event_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get event
        event = Event.objects.get(id=event_id)
        
        # Get all registered participants for this event
        from events.models import EventRegistration
        registrations = EventRegistration.objects.filter(event=event, status='approved')
        
        predictions = []
        predictor = get_performance_predictor()
        
        for registration in registrations:
            participant = registration.user
            
            # Get participant's historical scores
            past_scores_qs = Score.objects.filter(
                participant=participant
            ).order_by('submitted_at')
            
            past_scores = [float(score.total_score) for score in past_scores_qs]
            
            # Get participant's school category
            school_category = 'HS'  # Default
            if hasattr(participant, 'school') and participant.school:
                school_category = participant.school.category
            
            # Count events participated
            num_events = Score.objects.filter(participant=participant).values('event').distinct().count()
            
            # Prepare data for prediction
            participant_data = {
                'past_scores': past_scores,
                'event_category': event.category,
                'school_category': school_category,
                'num_events_participated': num_events
            }
            
            # Predict
            predicted_score, details = predictor.predict(participant_data)
            
            predictions.append({
                'participant': {
                    'id': participant.id,
                    'username': participant.username
                },
                'predicted_score': round(predicted_score, 1),
                'confidence': round(details.get('confidence', 0.7), 3),
                'past_avg': round(details['past_performance']['avg'], 1) if details['past_performance']['avg'] else None,
                'events_participated': num_events
            })
        
        # Sort by predicted score (highest first)
        predictions.sort(key=lambda x: x['predicted_score'], reverse=True)
        
        return Response({
            'event': {
                'id': event.id,
                'name': event.name,
                'category': event.category
            },
            'total_participants': len(predictions),
            'predictions': predictions
        })
    
    except Event.DoesNotExist:
        return Response(
            {"error": "Event not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        return Response(
            {"error": f"Prediction failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def participant_performance_history(request):
    """
    Get participant's performance history and trends.
    
    Query params:
        - participant_id: Participant user ID (optional, defaults to current user)
    
    Returns:
        Historical performance data with trends and statistics
    """
    user = request.user
    participant_id = request.query_params.get('participant_id', user.id)
    
    # Authorization check
    if str(participant_id) != str(user.id) and user.role not in ['judge', 'admin']:
        return Response(
            {"error": "You can only view your own performance history"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        participant = User.objects.get(id=participant_id)
        
        # Get all scores
        scores = Score.objects.filter(participant=participant).order_by('submitted_at')
        
        if scores.count() == 0:
            return Response({
                'participant': {
                    'id': participant.id,
                    'username': participant.username
                },
                'message': 'No performance history available',
                'total_events': 0
            })
        
        # Build history
        history = []
        for score in scores:
            history.append({
                'event_id': score.event.id,
                'event_name': score.event.name,
                'event_category': score.event.category,
                'total_score': float(score.total_score),
                'submitted_at': score.submitted_at.isoformat()
            })
        
        # Calculate statistics
        scores_list = [float(s.total_score) for s in scores]
        
        # Calculate trend (linear regression)
        if len(scores_list) >= 2:
            x = list(range(len(scores_list)))
            y = scores_list
            n = len(x)
            
            # Simple linear regression
            x_mean = sum(x) / n
            y_mean = sum(y) / n
            
            numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
            denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
            
            if denominator != 0:
                slope = numerator / denominator
                trend = 'improving' if slope > 1 else 'declining' if slope < -1 else 'stable'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'
        
        # Category breakdown
        category_stats = {}
        for score in scores:
            category = score.event.category
            if category not in category_stats:
                category_stats[category] = []
            category_stats[category].append(float(score.total_score))
        
        category_averages = {
            cat: round(sum(scores) / len(scores), 1)
            for cat, scores in category_stats.items()
        }
        
        return Response({
            'participant': {
                'id': participant.id,
                'username': participant.username
            },
            'statistics': {
                'total_events': len(scores_list),
                'average_score': round(sum(scores_list) / len(scores_list), 1),
                'max_score': round(max(scores_list), 1),
                'min_score': round(min(scores_list), 1),
                'latest_score': round(scores_list[-1], 1),
                'trend': trend
            },
            'category_performance': category_averages,
            'history': history
        })
    
    except User.DoesNotExist:
        return Response(
            {"error": "Participant not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Performance history failed: {e}")
        return Response(
            {"error": f"Failed to retrieve history: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
