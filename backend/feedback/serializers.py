from rest_framework import serializers
from .models import Feedback


class FeedbackSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Feedback
        fields = '__all__'
        read_only_fields = ['user', 'sentiment_score', 'sentiment_label', 'sentiment_confidence', 'created_at']
    
    def get_user_details(self, obj):
        from users.serializers import UserSerializer
        return UserSerializer(obj.user).data

class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = [
            'event', 'feedback_type', 'subject', 'message',
            'category', 'rating', 'contact_email',
            'sentiment_score', 'sentiment_label', 'sentiment_confidence',
            'id', 'created_at'
        ]
        read_only_fields = ['sentiment_score', 'sentiment_label', 'sentiment_confidence', 'id', 'created_at']


class SentimentAnalyticsQuerySerializer(serializers.Serializer):
    event = serializers.IntegerField(required=False)
    feedback_type = serializers.ChoiceField(choices=Feedback.FEEDBACK_TYPES, required=False)
    days = serializers.IntegerField(required=False, min_value=1, default=30)


class SentimentDistributionSerializer(serializers.Serializer):
    positive = serializers.IntegerField()
    neutral = serializers.IntegerField()
    negative = serializers.IntegerField()


class SentimentPercentagesSerializer(serializers.Serializer):
    positive = serializers.FloatField()
    neutral = serializers.FloatField()
    negative = serializers.FloatField()


class RecentFeedbackSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    subject = serializers.CharField(allow_blank=True)
    message = serializers.CharField()
    sentiment_score = serializers.FloatField(allow_null=True)
    sentiment_label = serializers.ChoiceField(choices=Feedback.SENTIMENT_CHOICES)
    feedback_type = serializers.ChoiceField(choices=Feedback.FEEDBACK_TYPES)
    created_at = serializers.DateTimeField()
    user = serializers.CharField()


class SentimentAnalyticsResponseSerializer(serializers.Serializer):
    message = serializers.CharField(required=False)
    total_count = serializers.IntegerField()
    overall_sentiment = serializers.FloatField(allow_null=True)
    sentiment_distribution = SentimentDistributionSerializer()
    sentiment_percentages = SentimentPercentagesSerializer(required=False)
    average_score = serializers.FloatField(allow_null=True)
    recent_feedback = RecentFeedbackSerializer(many=True)


class AnalyzeTextRequestSerializer(serializers.Serializer):
    text = serializers.CharField()


class AnalyzeTextResponseSerializer(serializers.Serializer):
    text = serializers.CharField()
    sentiment = serializers.ChoiceField(choices=Feedback.SENTIMENT_CHOICES)
    confidence = serializers.FloatField()
    score = serializers.FloatField()
    probabilities = serializers.DictField(child=serializers.FloatField())
