    """
Quick test script to verify sentiment analysis is working.
Run: python test_sentiment.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_kalolsavam.settings')
django.setup()

from feedback.ml_models.sentiment_analyzer import get_sentiment_analyzer

def test_sentiment_analysis():
    print("\n" + "="*60)
    print("🧪 Testing Sentiment Analysis Models")
    print("="*60 + "\n")
    
    # Test cases
    test_cases = [
        "The event was absolutely amazing! Excellent organization and wonderful performances.",
        "It was an okay event. Nothing special but not bad either.",
        "Terrible experience! Very disappointed with the poor organization and delays.",
        "Great job by the volunteers! Everything was well coordinated.",
        "The venue was overcrowded and the sound system was awful.",
    ]
    
    # Test both models
    for model_type in ['naive_bayes', 'svm']:
        print(f"\n{'─'*60}")
        print(f"📊 Testing {model_type.upper().replace('_', ' ')} Model")
        print(f"{'─'*60}\n")
        
        analyzer = get_sentiment_analyzer(model_type=model_type)
        
        for i, text in enumerate(test_cases, 1):
            sentiment, confidence, probabilities = analyzer.predict_sentiment(text)
            score = analyzer.calculate_sentiment_score(text)
            
            # Emoji based on sentiment
            emoji = "😊" if sentiment == "positive" else "😞" if sentiment == "negative" else "😐"
            
            print(f"{i}. {emoji} Text: '{text[:60]}...'")
            print(f"   Sentiment: {sentiment.upper()}")
            print(f"   Confidence: {confidence:.2%}")
            print(f"   Score: {score:.2f}")
            print(f"   Probabilities: Pos={probabilities['positive']:.2f}, "
                  f"Neu={probabilities['neutral']:.2f}, Neg={probabilities['negative']:.2f}")
            print()
    
    print("="*60)
    print("✅ Sentiment Analysis Test Complete!")
    print("="*60 + "\n")

if __name__ == '__main__':
    test_sentiment_analysis()
