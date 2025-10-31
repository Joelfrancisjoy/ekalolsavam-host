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