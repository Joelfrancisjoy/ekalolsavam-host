from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Avg, Count, Q
from .models import Feedback
from .serializers import FeedbackSerializer, FeedbackCreateSerializer
from .ml_models.sentiment_analyzer import get_sentiment_analyzer
import logging

logger = logging.getLogger(__name__)


class FeedbackListView(generics.ListAPIView):
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Feedback.objects.all()
        return Feedback.objects.filter(user=user)


class FeedbackCreateView(generics.CreateAPIView):
    serializer_class = FeedbackCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Save feedback with automatic sentiment analysis (score, label, confidence)."""
        # Support both 'message' and (legacy) 'text' keys
        message = serializer.validated_data.get('message') or self.request.data.get('text', '')

        sentiment_score = None
        sentiment_label = 'neutral'
        sentiment_confidence = 0.5
        try:
            analyzer = get_sentiment_analyzer()
            # Predict label+confidence for display and storage
            label, confidence, _ = analyzer.predict_sentiment(message or '')
            score = analyzer.calculate_sentiment_score(message or '')
            sentiment_label = label
            sentiment_confidence = float(confidence)
            sentiment_score = score
            logger.info(
                f"Sentiment analysis completed: label={sentiment_label}, conf={sentiment_confidence:.2f}, score={sentiment_score:.2f}"
            )
        except Exception as e:
            logger.warning(f"Sentiment analysis failed: {e}. Saving without sentiment fields.")

        # Persist feedback with computed fields
        serializer.save(
            user=self.request.user,
            sentiment_score=sentiment_score,
            sentiment_label=sentiment_label,
            sentiment_confidence=sentiment_confidence,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sentiment_analytics(request):
    """
    Get sentiment analytics for feedback.
    
    Query params:
        - event: Filter by event ID
        - feedback_type: Filter by feedback type
        - days: Last N days (default: 30)
    
    Returns:
        - overall_sentiment: Average sentiment score
        - sentiment_distribution: Count by sentiment category
        - recent_feedback: Latest feedback with sentiment
        - trends: Sentiment over time
    """
    user = request.user
    
    # Only admins can view analytics
    if user.role != 'admin':
        return Response(
            {"error": "Only admins can view sentiment analytics"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get query parameters
    event_id = request.query_params.get('event')
    feedback_type = request.query_params.get('feedback_type')
    days = int(request.query_params.get('days', 30))
    
    # Build queryset
    queryset = Feedback.objects.exclude(sentiment_score__isnull=True)
    
    if event_id:
        queryset = queryset.filter(event_id=event_id)
    if feedback_type:
        queryset = queryset.filter(feedback_type=feedback_type)
    
    # Calculate metrics
    total_count = queryset.count()
    
    if total_count == 0:
        return Response({
            'message': 'No feedback data available',
            'total_count': 0,
            'overall_sentiment': None,
            'sentiment_distribution': {
                'positive': 0,
                'neutral': 0,
                'negative': 0
            },
            'average_score': None,
            'recent_feedback': []
        })
    
    # Overall sentiment
    avg_sentiment = queryset.aggregate(Avg('sentiment_score'))['sentiment_score__avg']
    
    # Sentiment distribution
    positive_count = queryset.filter(sentiment_score__gte=0.3).count()
    negative_count = queryset.filter(sentiment_score__lte=-0.3).count()
    neutral_count = total_count - positive_count - negative_count
    
    # Recent feedback
    recent = queryset.order_by('-created_at')[:10]
    recent_data = []
    
    for feedback in recent:
        sentiment_label = 'neutral'
        if feedback.sentiment_score >= 0.3:
            sentiment_label = 'positive'
        elif feedback.sentiment_score <= -0.3:
            sentiment_label = 'negative'
        
        recent_data.append({
            'id': feedback.id,
            'subject': feedback.subject,
            'message': feedback.message[:100] + '...' if len(feedback.message) > 100 else feedback.message,
            'sentiment_score': round(feedback.sentiment_score, 2),
            'sentiment_label': sentiment_label,
            'feedback_type': feedback.feedback_type,
            'created_at': feedback.created_at.isoformat(),
            'user': feedback.user.username
        })
    
    # Response
    return Response({
        'total_count': total_count,
        'overall_sentiment': round(avg_sentiment, 2) if avg_sentiment else None,
        'sentiment_distribution': {
            'positive': positive_count,
            'neutral': neutral_count,
            'negative': negative_count
        },
        'sentiment_percentages': {
            'positive': round((positive_count / total_count) * 100, 1),
            'neutral': round((neutral_count / total_count) * 100, 1),
            'negative': round((negative_count / total_count) * 100, 1)
        },
        'average_score': round(avg_sentiment, 2) if avg_sentiment else None,
        'recent_feedback': recent_data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_text(request):
    """
    Analyze sentiment of arbitrary text (for testing/preview).
    
    POST body:
        {
            "text": "Your feedback text here"
        }
    
    Returns:
        Sentiment analysis results
    """
    text = request.data.get('text', '')
    
    if not text:
        return Response(
            {"error": "Text field is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        analyzer = get_sentiment_analyzer()
        sentiment, confidence, probabilities = analyzer.predict_sentiment(text)
        score = analyzer.calculate_sentiment_score(text)
        
        return Response({
            'text': text,
            'sentiment': sentiment,
            'confidence': round(confidence, 3),
            'score': round(score, 2),
            'probabilities': {k: round(v, 3) for k, v in probabilities.items()}
        })
    
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        return Response(
            {"error": f"Analysis failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class AdminFeedbackListView(generics.ListAPIView):
    """
    Admin-only endpoint to list all feedback with filtering capabilities.
    """
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) != 'admin':
            return Feedback.objects.none()
        
        qs = Feedback.objects.all()
        
        # Filter by feedback_type
        feedback_type = self.request.query_params.get('feedback_type')
        if feedback_type:
            qs = qs.filter(feedback_type=feedback_type)
        
        # Filter by sentiment
        sentiment = self.request.query_params.get('sentiment')
        if sentiment in ('positive', 'neutral', 'negative'):
            qs = qs.filter(sentiment_label=sentiment)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        
        return qs