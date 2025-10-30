"""
Sentiment Analysis for E-Kalolsavam Feedback System

This module provides sentiment analysis capabilities using multiple ML models:
- Naive Bayes (fast, baseline)
- SVM (better accuracy)
- Neural Network (optional, for advanced use)

Sentiment Score Scale: -1.0 (very negative) to +1.0 (very positive)
"""

import os
import pickle
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Try importing ML libraries with graceful fallback
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.svm import SVC
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, classification_report
    from sklearn.preprocessing import LabelEncoder
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. Sentiment analysis will use rule-based fallback.")


class SentimentAnalyzer:
    """
    Sentiment analyzer with multiple model support and automatic fallback.
    """
    
    # Sentiment categories
    POSITIVE = 'positive'
    NEUTRAL = 'neutral'
    NEGATIVE = 'negative'
    
    def __init__(self, model_type='naive_bayes'):
        """
        Initialize sentiment analyzer.
        
        Args:
            model_type: 'naive_bayes', 'svm', or 'rule_based'
        """
        self.model_type = model_type
        self.model_dir = Path(__file__).parent / 'models'
        self.model_dir.mkdir(exist_ok=True)
        
        self.vectorizer = None
        self.model = None
        self.label_encoder = None
        
        # Model file paths
        self.vectorizer_path = self.model_dir / f'vectorizer_{model_type}.pkl'
        self.model_path = self.model_dir / f'model_{model_type}.pkl'
        self.encoder_path = self.model_dir / f'encoder_{model_type}.pkl'
        
        # Rule-based keywords for fallback
        self.positive_keywords = {
            'excellent', 'amazing', 'wonderful', 'great', 'fantastic', 'awesome',
            'good', 'nice', 'beautiful', 'perfect', 'outstanding', 'brilliant',
            'love', 'loved', 'enjoy', 'enjoyed', 'best', 'impressive', 'superb',
            'well organized', 'well-organized', 'thank', 'thanks', 'appreciate',
            'happy', 'pleased', 'satisfied', 'delighted', 'fabulous'
        }
        
        self.negative_keywords = {
            'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'disappointing',
            'disappointed', 'hate', 'hated', 'dislike', 'boring', 'waste', 'useless',
            'pathetic', 'disgusting', 'annoying', 'frustrated', 'frustrating',
            'confusing', 'confused', 'difficult', 'problem', 'issue', 'complaint',
            'unorganized', 'chaotic', 'mess', 'messy', 'late', 'delayed', 'cancel'
        }
        
        # Load model if exists
        if SKLEARN_AVAILABLE:
            self._load_model()
    
    def _load_model(self) -> bool:
        """Load trained model from disk."""
        try:
            if self.vectorizer_path.exists() and self.model_path.exists():
                with open(self.vectorizer_path, 'rb') as f:
                    self.vectorizer = pickle.load(f)
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                if self.encoder_path.exists():
                    with open(self.encoder_path, 'rb') as f:
                        self.label_encoder = pickle.load(f)
                logger.info(f"Loaded {self.model_type} sentiment model successfully")
                return True
        except Exception as e:
            logger.warning(f"Failed to load model: {e}")
        return False
    
    def _save_model(self):
        """Save trained model to disk."""
        try:
            with open(self.vectorizer_path, 'wb') as f:
                pickle.dump(self.vectorizer, f)
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model, f)
            if self.label_encoder:
                with open(self.encoder_path, 'wb') as f:
                    pickle.dump(self.label_encoder, f)
            logger.info(f"Saved {self.model_type} sentiment model successfully")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    def train(self, texts: list, labels: list, test_size=0.2):
        """
        Train the sentiment analysis model.
        
        Args:
            texts: List of feedback text strings
            labels: List of sentiment labels ('positive', 'neutral', 'negative')
            test_size: Fraction of data to use for testing
        
        Returns:
            Dict with training metrics
        """
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for training. Install with: pip install scikit-learn")
        
        if len(texts) != len(labels):
            raise ValueError("Number of texts and labels must match")
        
        if len(texts) < 10:
            raise ValueError("Need at least 10 samples for training")
        
        # Encode labels
        self.label_encoder = LabelEncoder()
        y = self.label_encoder.fit_transform(labels)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            texts, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Vectorize text
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),  # Unigrams and bigrams
            min_df=2,
            stop_words='english'
        )
        X_train_vec = self.vectorizer.fit_transform(X_train)
        X_test_vec = self.vectorizer.transform(X_test)
        
        # Train model
        if self.model_type == 'naive_bayes':
            self.model = MultinomialNB(alpha=0.1)
        elif self.model_type == 'svm':
            self.model = SVC(kernel='linear', probability=True, C=1.0)
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
        
        self.model.fit(X_train_vec, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_vec)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Save model
        self._save_model()
        
        return {
            'accuracy': accuracy,
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'model_type': self.model_type,
            'classes': self.label_encoder.classes_.tolist()
        }
    
    def predict_sentiment(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        """
        Predict sentiment for a given text.
        
        Args:
            text: Feedback text to analyze
        
        Returns:
            Tuple of (sentiment_label, confidence_score, probabilities_dict)
            - sentiment_label: 'positive', 'neutral', or 'negative'
            - confidence_score: Float between 0 and 1
            - probabilities_dict: Dict with probabilities for each class
        """
        if not text or not text.strip():
            return self.NEUTRAL, 0.5, {self.NEUTRAL: 1.0}
        
        # Use ML model if available and trained
        if SKLEARN_AVAILABLE and self.model is not None and self.vectorizer is not None:
            return self._predict_ml(text)
        else:
            # Fallback to rule-based
            return self._predict_rule_based(text)
    
    def _predict_ml(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        """ML-based prediction."""
        try:
            # Vectorize
            X = self.vectorizer.transform([text])
            
            # Predict
            prediction = self.model.predict(X)[0]
            probabilities = self.model.predict_proba(X)[0]
            
            # Decode label
            sentiment = self.label_encoder.inverse_transform([prediction])[0]
            confidence = float(probabilities[prediction])
            
            # Build probabilities dict
            prob_dict = {
                label: float(prob)
                for label, prob in zip(self.label_encoder.classes_, probabilities)
            }
            
            return sentiment, confidence, prob_dict
        
        except Exception as e:
            logger.error(f"ML prediction failed: {e}. Falling back to rule-based.")
            return self._predict_rule_based(text)
    
    def _predict_rule_based(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        """Rule-based prediction using keyword matching."""
        text_lower = text.lower()
        
        # Count keyword matches
        positive_count = sum(1 for word in self.positive_keywords if word in text_lower)
        negative_count = sum(1 for word in self.negative_keywords if word in text_lower)
        
        # Determine sentiment
        if positive_count > negative_count:
            sentiment = self.POSITIVE
            confidence = min(0.6 + (positive_count * 0.1), 0.95)
        elif negative_count > positive_count:
            sentiment = self.NEGATIVE
            confidence = min(0.6 + (negative_count * 0.1), 0.95)
        else:
            sentiment = self.NEUTRAL
            confidence = 0.5
        
        # Build probabilities
        prob_dict = {
            self.POSITIVE: 0.0,
            self.NEUTRAL: 0.0,
            self.NEGATIVE: 0.0
        }
        prob_dict[sentiment] = confidence
        
        # Distribute remaining probability
        remaining = 1.0 - confidence
        for key in prob_dict:
            if key != sentiment:
                prob_dict[key] = remaining / 2
        
        return sentiment, confidence, prob_dict
    
    def calculate_sentiment_score(self, text: str) -> float:
        """
        Calculate numerical sentiment score from -1.0 to +1.0.
        
        Args:
            text: Feedback text
        
        Returns:
            Float score: -1.0 (very negative) to +1.0 (very positive)
        """
        sentiment, confidence, probabilities = self.predict_sentiment(text)
        
        # Map to numerical score
        if sentiment == self.POSITIVE:
            # Positive: 0.0 to +1.0
            score = probabilities.get(self.POSITIVE, 0.5)
        elif sentiment == self.NEGATIVE:
            # Negative: -1.0 to 0.0
            score = -probabilities.get(self.NEGATIVE, 0.5)
        else:
            # Neutral: close to 0
            score = probabilities.get(self.POSITIVE, 0.5) - probabilities.get(self.NEGATIVE, 0.5)
        
        # Ensure score is in valid range
        return max(-1.0, min(1.0, score))
    
    def analyze_batch(self, texts: list) -> list:
        """
        Analyze multiple texts at once.
        
        Args:
            texts: List of feedback texts
        
        Returns:
            List of dicts with sentiment analysis results
        """
        results = []
        for text in texts:
            sentiment, confidence, probabilities = self.predict_sentiment(text)
            score = self.calculate_sentiment_score(text)
            
            results.append({
                'text': text,
                'sentiment': sentiment,
                'confidence': confidence,
                'score': score,
                'probabilities': probabilities
            })
        
        return results


# Singleton instance
_analyzer_instance = None

def get_sentiment_analyzer(model_type='naive_bayes') -> SentimentAnalyzer:
    """Get or create sentiment analyzer instance."""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = SentimentAnalyzer(model_type=model_type)
    return _analyzer_instance
