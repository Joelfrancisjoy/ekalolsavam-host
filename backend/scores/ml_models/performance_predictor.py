"""
Participant Performance Prediction System

This module provides ML-based performance prediction for participants based on:
- Historical performance data
- Event category
- School and student class
- Participation patterns

Models implemented:
- Decision Tree Regressor
- Random Forest Regressor
- Neural Network (MLPRegressor)
"""

import os
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Tuple, Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

# Try importing ML libraries with graceful fallback
try:
    from sklearn.tree import DecisionTreeRegressor
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.neural_network import MLPRegressor
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. Performance prediction will use rule-based fallback.")


class PerformancePredictor:
    """
    ML-based performance predictor for participants.
    """
    
    def __init__(self, model_type='random_forest'):
        """
        Initialize performance predictor.
        
        Args:
            model_type: 'decision_tree', 'random_forest', or 'neural_network'
        """
        self.model_type = model_type
        self.model_dir = Path(__file__).parent / 'models'
        self.model_dir.mkdir(exist_ok=True)
        
        self.scaler = None
        self.model = None
        self.category_encoder = None
        self.school_category_encoder = None
        
        # Model file paths
        self.scaler_path = self.model_dir / f'scaler_performance_{model_type}.pkl'
        self.model_path = self.model_dir / f'performance_{model_type}.pkl'
        self.category_encoder_path = self.model_dir / f'category_encoder_performance_{model_type}.pkl'
        self.school_encoder_path = self.model_dir / f'school_encoder_performance_{model_type}.pkl'
        
        # Feature names for reference
        self.feature_names = [
            'avg_past_score',
            'max_past_score',
            'min_past_score',
            'num_events_participated',
            'event_category_encoded',
            'school_category_encoded',
            'score_variance',
            'participation_rate'
        ]
        
        # Load model if exists
        if SKLEARN_AVAILABLE:
            self._load_model()
    
    def _load_model(self) -> bool:
        """Load trained model from disk."""
        try:
            if (self.scaler_path.exists() and self.model_path.exists() and
                self.category_encoder_path.exists() and self.school_encoder_path.exists()):
                
                with open(self.scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(self.category_encoder_path, 'rb') as f:
                    self.category_encoder = pickle.load(f)
                with open(self.school_encoder_path, 'rb') as f:
                    self.school_category_encoder = pickle.load(f)
                
                logger.info(f"Loaded {self.model_type} performance prediction model successfully")
                return True
        except Exception as e:
            logger.warning(f"Failed to load model: {e}")
        return False
    
    def _save_model(self):
        """Save trained model to disk."""
        try:
            with open(self.scaler_path, 'wb') as f:
                pickle.dump(self.scaler, f)
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model, f)
            with open(self.category_encoder_path, 'wb') as f:
                pickle.dump(self.category_encoder, f)
            with open(self.school_encoder_path, 'wb') as f:
                pickle.dump(self.school_category_encoder, f)
            
            logger.info(f"Saved {self.model_type} performance prediction model successfully")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    def engineer_features(self, participant_data: Dict) -> np.ndarray:
        """
        Engineer features from participant data.
        
        Args:
            participant_data: Dict with keys:
                - past_scores: List of past scores
                - event_category: Event category (dance/music/theatre/literary/visual_arts)
                - school_category: School category (LP/UP/HS/HSS)
                - num_events_participated: Total events participated
        
        Returns:
            Feature vector as numpy array
        """
        past_scores = participant_data.get('past_scores', [])
        
        # Calculate statistical features
        if past_scores:
            avg_past_score = np.mean(past_scores)
            max_past_score = np.max(past_scores)
            min_past_score = np.min(past_scores)
            score_variance = np.var(past_scores)
        else:
            # Default values for new participants
            avg_past_score = 50.0  # Neutral starting point
            max_past_score = 50.0
            min_past_score = 50.0
            score_variance = 0.0
        
        num_events = participant_data.get('num_events_participated', 0)
        
        # Encode categorical features
        event_category = participant_data.get('event_category', 'dance')
        school_category = participant_data.get('school_category', 'HS')
        
        # Use encoders if available, otherwise use simple mapping
        if self.category_encoder is not None:
            try:
                event_category_encoded = self.category_encoder.transform([event_category])[0]
            except:
                event_category_encoded = 0
        else:
            category_map = {'dance': 0, 'music': 1, 'theatre': 2, 'literary': 3, 'visual_arts': 4}
            event_category_encoded = category_map.get(event_category, 0)
        
        if self.school_category_encoder is not None:
            try:
                school_category_encoded = self.school_category_encoder.transform([school_category])[0]
            except:
                school_category_encoded = 0
        else:
            school_map = {'LP': 0, 'UP': 1, 'HS': 2, 'HSS': 3}
            school_category_encoded = school_map.get(school_category, 2)
        
        # Calculate participation rate (events participated / total possible events)
        # Assuming max 20 events per season
        participation_rate = min(num_events / 20.0, 1.0) if num_events > 0 else 0.0
        
        # Build feature vector
        features = np.array([
            avg_past_score,
            max_past_score,
            min_past_score,
            num_events,
            event_category_encoded,
            school_category_encoded,
            score_variance,
            participation_rate
        ])
        
        return features.reshape(1, -1)
    
    def train(self, training_data: List[Dict], test_size=0.2):
        """
        Train the performance prediction model.
        
        Args:
            training_data: List of dicts with keys:
                - past_scores: List of past scores
                - event_category: Event category
                - school_category: School category
                - num_events_participated: Number of events
                - actual_score: Actual score achieved (target)
            test_size: Fraction of data for testing
        
        Returns:
            Dict with training metrics
        """
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for training. Install with: pip install scikit-learn")
        
        if len(training_data) < 20:
            raise ValueError("Need at least 20 samples for training")
        
        # Extract features and targets
        X_list = []
        y_list = []
        
        # First pass: collect categories for encoding
        event_categories = []
        school_categories = []
        
        for data in training_data:
            event_categories.append(data.get('event_category', 'dance'))
            school_categories.append(data.get('school_category', 'HS'))
        
        # Fit encoders
        self.category_encoder = LabelEncoder()
        self.school_category_encoder = LabelEncoder()
        
        self.category_encoder.fit(event_categories)
        self.school_category_encoder.fit(school_categories)
        
        # Second pass: engineer features
        for data in training_data:
            features = self.engineer_features(data)
            X_list.append(features[0])
            y_list.append(data['actual_score'])
        
        X = np.array(X_list)
        y = np.array(y_list)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model based on type
        if self.model_type == 'decision_tree':
            self.model = DecisionTreeRegressor(
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
        
        elif self.model_type == 'random_forest':
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        
        elif self.model_type == 'neural_network':
            self.model = MLPRegressor(
                hidden_layer_sizes=(100, 50, 25),
                activation='relu',
                solver='adam',
                alpha=0.001,
                batch_size='auto',
                learning_rate='adaptive',
                max_iter=500,
                random_state=42,
                early_stopping=True,
                validation_fraction=0.1
            )
        
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
        
        # Train
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_train_pred = self.model.predict(X_train_scaled)
        y_test_pred = self.model.predict(X_test_scaled)
        
        train_mse = mean_squared_error(y_train, y_train_pred)
        test_mse = mean_squared_error(y_test, y_test_pred)
        train_r2 = r2_score(y_train, y_train_pred)
        test_r2 = r2_score(y_test, y_test_pred)
        train_mae = mean_absolute_error(y_train, y_train_pred)
        test_mae = mean_absolute_error(y_test, y_test_pred)
        
        # Save model
        self._save_model()
        
        return {
            'model_type': self.model_type,
            'total_samples': len(X),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'train_mse': float(train_mse),
            'test_mse': float(test_mse),
            'train_r2': float(train_r2),
            'test_r2': float(test_r2),
            'train_mae': float(train_mae),
            'test_mae': float(test_mae),
            'train_rmse': float(np.sqrt(train_mse)),
            'test_rmse': float(np.sqrt(test_mse))
        }
    
    def predict(self, participant_data: Dict) -> Tuple[float, Dict]:
        """
        Predict participant's performance.
        
        Args:
            participant_data: Dict with participant features
        
        Returns:
            Tuple of (predicted_score, details)
        """
        # Use ML model if available and trained
        if SKLEARN_AVAILABLE and self.model is not None and self.scaler is not None:
            return self._predict_ml(participant_data)
        else:
            # Fallback to rule-based
            return self._predict_rule_based(participant_data)
    
    def _predict_ml(self, participant_data: Dict) -> Tuple[float, Dict]:
        """ML-based prediction."""
        try:
            # Engineer features
            X = self.engineer_features(participant_data)
            
            # Scale
            X_scaled = self.scaler.transform(X)
            
            # Predict
            predicted_score = self.model.predict(X_scaled)[0]
            
            # Clip to valid range (0-100)
            predicted_score = max(0, min(100, predicted_score))
            
            # Calculate confidence based on historical data
            past_scores = participant_data.get('past_scores', [])
            if past_scores:
                # Lower variance = higher confidence
                variance = np.var(past_scores)
                confidence = max(0.5, min(1.0, 1.0 - (variance / 100)))
            else:
                # New participant = lower confidence
                confidence = 0.6
            
            details = {
                'method': 'ml',
                'model_type': self.model_type,
                'features_used': self.feature_names,
                'confidence': confidence,
                'past_performance': {
                    'avg': float(np.mean(past_scores)) if past_scores else None,
                    'max': float(np.max(past_scores)) if past_scores else None,
                    'min': float(np.min(past_scores)) if past_scores else None,
                    'count': len(past_scores)
                }
            }
            
            return float(predicted_score), details
        
        except Exception as e:
            logger.error(f"ML prediction failed: {e}. Falling back to rule-based.")
            return self._predict_rule_based(participant_data)
    
    def _predict_rule_based(self, participant_data: Dict) -> Tuple[float, Dict]:
        """Rule-based prediction fallback."""
        past_scores = participant_data.get('past_scores', [])
        
        if past_scores:
            # Use weighted average: recent scores weighted more
            if len(past_scores) >= 3:
                # Weight: 50% recent, 30% middle, 20% old
                recent_avg = np.mean(past_scores[-3:])
                predicted_score = recent_avg
            else:
                predicted_score = np.mean(past_scores)
            
            # Adjust based on trend
            if len(past_scores) >= 2:
                trend = past_scores[-1] - past_scores[0]
                predicted_score += trend * 0.1  # Small trend adjustment
            
            confidence = 0.7
        else:
            # New participant: use category average
            category_defaults = {
                'dance': 65.0,
                'music': 68.0,
                'theatre': 62.0,
                'literary': 70.0,
                'visual_arts': 65.0
            }
            event_category = participant_data.get('event_category', 'dance')
            predicted_score = category_defaults.get(event_category, 65.0)
            confidence = 0.5
        
        # Clip to valid range
        predicted_score = max(0, min(100, predicted_score))
        
        details = {
            'method': 'rule_based',
            'confidence': confidence,
            'past_performance': {
                'avg': float(np.mean(past_scores)) if past_scores else None,
                'count': len(past_scores)
            }
        }
        
        return float(predicted_score), details
    
    def batch_predict(self, participants_data: List[Dict]) -> List[Dict]:
        """
        Predict performance for multiple participants.
        
        Args:
            participants_data: List of participant data dicts
        
        Returns:
            List of prediction results
        """
        results = []
        for data in participants_data:
            predicted_score, details = self.predict(data)
            results.append({
                'participant_data': data,
                'predicted_score': predicted_score,
                'details': details
            })
        return results


# Singleton instance
_predictor_instance = None

def get_performance_predictor(model_type='random_forest') -> PerformancePredictor:
    """Get or create performance predictor instance."""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = PerformancePredictor(model_type=model_type)
    return _predictor_instance
