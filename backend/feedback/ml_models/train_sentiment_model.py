"""
Training script for sentiment analysis model with sample data.

This script provides:
1. Sample training data for E-Kalolsavam feedback
2. Training function for the sentiment model
3. Evaluation metrics

Usage:
    python manage.py train_sentiment_model
    OR
    python -m feedback.ml_models.train_sentiment_model
"""

from .sentiment_analyzer import SentimentAnalyzer


# Sample training data for E-Kalolsavam feedback
SAMPLE_TRAINING_DATA = {
    'positive': [
        "The event was excellently organized! Amazing performances by all participants.",
        "Wonderful experience! The judges were fair and the venue was perfect.",
        "Great job by the organizing team. Everything was smooth and well-coordinated.",
        "Fantastic event! My child loved participating in the dance competition.",
        "Outstanding organization. The volunteers were very helpful and friendly.",
        "Best Kalolsavam ever! The cultural programs were brilliant.",
        "Loved the music competition. Well organized and on time.",
        "Beautiful venue and excellent arrangements. Thank you!",
        "The judges were professional and the scoring was transparent.",
        "Impressive event management. Everything went according to schedule.",
        "Great experience for students. Very well organized cultural fest.",
        "Wonderful performances! The event was a huge success.",
        "Excellent coordination between volunteers and organizers.",
        "Amazing cultural programs. My daughter enjoyed every moment.",
        "Perfect venue with good facilities. Well done!",
        "The event exceeded our expectations. Brilliant organization.",
        "Fantastic performances by all participants. Great event!",
        "Very satisfied with the arrangements and hospitality.",
        "Outstanding event! The cultural diversity was amazing.",
        "Superb organization and management. Keep it up!",
        "The dance performances were breathtaking. Excellent event.",
        "Great platform for students to showcase their talents.",
        "Well organized and executed. Congratulations to the team!",
        "Loved the theatrical performances. Very professional.",
        "Excellent judging criteria and fair evaluation.",
        "The event was a memorable experience for everyone.",
        "Brilliant coordination and time management.",
        "Amazing cultural showcase. Very well presented.",
        "Great facilities and helpful volunteers everywhere.",
        "Wonderful opportunity for students. Thank you!",
    ],
    'neutral': [
        "The event was okay. Some parts were good, others could be improved.",
        "Average organization. The performances were decent.",
        "It was fine. Nothing exceptional but not bad either.",
        "The event happened as scheduled. Standard arrangements.",
        "Moderate experience. Some delays but overall acceptable.",
        "The venue was adequate. Performances were average.",
        "It was an okay event. Met basic expectations.",
        "Neither impressed nor disappointed. Just average.",
        "The event was conducted. Some issues but manageable.",
        "Standard cultural fest. Nothing particularly special.",
        "Acceptable arrangements. Could have been better.",
        "The event was fine. Some good moments, some not so good.",
        "Average coordination. Things worked out eventually.",
        "It was alright. Expected more but it was okay.",
        "Moderate satisfaction. Some aspects were good.",
        "The event was conducted as planned. Nothing more.",
        "Decent performances but organization could improve.",
        "It was an average experience overall.",
        "The event was okay for a school fest.",
        "Neither great nor terrible. Just okay.",
    ],
    'negative': [
        "Very disappointed with the organization. Too many delays.",
        "Terrible experience! The event was poorly managed.",
        "Awful coordination. Everything was chaotic and confusing.",
        "Poor organization. The venue was overcrowded and uncomfortable.",
        "Disappointing event. Many technical issues and delays.",
        "Horrible experience! The judging seemed biased.",
        "Waste of time. The event was completely disorganized.",
        "Very poor management. Too much confusion everywhere.",
        "Frustrated with the long delays and poor communication.",
        "The event was a mess. No proper planning at all.",
        "Pathetic organization. Volunteers were unhelpful and rude.",
        "Terrible venue with inadequate facilities.",
        "Disappointed with the judging process. Not transparent.",
        "Awful experience. Would not recommend to anyone.",
        "Poor time management. Everything was running late.",
        "Confusing schedule and lack of proper information.",
        "Very bad organization. Complete chaos throughout.",
        "Disappointed with the overall arrangements.",
        "The event was poorly executed. Many problems.",
        "Terrible coordination between organizers and volunteers.",
        "Frustrating experience due to constant delays.",
        "Poor facilities and overcrowded venue.",
        "Disappointing performances and bad sound system.",
        "Awful management. Nothing went as planned.",
        "Very dissatisfied with the entire event.",
        "Poor communication and unhelpful staff.",
        "Terrible experience. Will not participate again.",
        "Disappointing event with many issues.",
        "Bad organization and poor planning.",
        "Frustrated with the unprofessional management.",
    ]
}


def get_training_data():
    """
    Get training data in the format required by the model.
    
    Returns:
        Tuple of (texts, labels)
    """
    texts = []
    labels = []
    
    for sentiment, feedback_list in SAMPLE_TRAINING_DATA.items():
        for feedback in feedback_list:
            texts.append(feedback)
            labels.append(sentiment)
    
    return texts, labels


def train_model(model_type='naive_bayes', test_size=0.2):
    """
    Train the sentiment analysis model.
    
    Args:
        model_type: 'naive_bayes' or 'svm'
        test_size: Fraction of data to use for testing
    
    Returns:
        Dict with training results
    """
    print(f"\n{'='*60}")
    print(f"Training Sentiment Analysis Model: {model_type.upper()}")
    print(f"{'='*60}\n")
    
    # Get training data
    texts, labels = get_training_data()
    print(f"📊 Training Data Statistics:")
    print(f"   Total samples: {len(texts)}")
    print(f"   Positive: {labels.count('positive')}")
    print(f"   Neutral: {labels.count('neutral')}")
    print(f"   Negative: {labels.count('negative')}")
    print()
    
    # Initialize and train
    analyzer = SentimentAnalyzer(model_type=model_type)
    
    try:
        print("🔄 Training model...")
        results = analyzer.train(texts, labels, test_size=test_size)
        
        print(f"\n✅ Training Complete!")
        print(f"   Accuracy: {results['accuracy']:.2%}")
        print(f"   Training samples: {results['train_samples']}")
        print(f"   Test samples: {results['test_samples']}")
        print(f"   Classes: {', '.join(results['classes'])}")
        
        # Test with sample predictions
        print(f"\n🧪 Sample Predictions:")
        test_samples = [
            "This event was absolutely amazing! Great organization.",
            "The event was okay, nothing special.",
            "Terrible experience. Very disappointed with everything."
        ]
        
        for sample in test_samples:
            sentiment, confidence, _ = analyzer.predict_sentiment(sample)
            score = analyzer.calculate_sentiment_score(sample)
            print(f"\n   Text: '{sample[:50]}...'")
            print(f"   Sentiment: {sentiment.upper()} (confidence: {confidence:.2%})")
            print(f"   Score: {score:.2f}")
        
        print(f"\n{'='*60}")
        print("✅ Model saved successfully!")
        print(f"{'='*60}\n")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        raise


def evaluate_model(model_type='naive_bayes'):
    """
    Evaluate the trained model with additional test cases.
    
    Args:
        model_type: 'naive_bayes' or 'svm'
    """
    analyzer = SentimentAnalyzer(model_type=model_type)
    
    test_cases = [
        ("Excellent event! Loved every moment.", "positive"),
        ("The organization was terrible and chaotic.", "negative"),
        ("It was an average event, nothing special.", "neutral"),
        ("Amazing performances by all students!", "positive"),
        ("Very disappointed with the arrangements.", "negative"),
    ]
    
    print(f"\n{'='*60}")
    print("Model Evaluation")
    print(f"{'='*60}\n")
    
    correct = 0
    for text, expected in test_cases:
        sentiment, confidence, _ = analyzer.predict_sentiment(text)
        is_correct = sentiment == expected
        correct += is_correct
        
        status = "✅" if is_correct else "❌"
        print(f"{status} Expected: {expected:8s} | Got: {sentiment:8s} ({confidence:.2%})")
        print(f"   Text: '{text}'")
        print()
    
    accuracy = correct / len(test_cases)
    print(f"Evaluation Accuracy: {accuracy:.2%} ({correct}/{len(test_cases)})")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    # Train both models
    print("Training Naive Bayes model...")
    train_model(model_type='naive_bayes')
    
    print("\nTraining SVM model...")
    train_model(model_type='svm')
    
    # Evaluate
    print("\nEvaluating Naive Bayes...")
    evaluate_model(model_type='naive_bayes')
    
    print("\nEvaluating SVM...")
    evaluate_model(model_type='svm')
