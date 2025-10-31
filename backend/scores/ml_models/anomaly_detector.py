"""
Anomaly Detection for Judge Scoring System

This module provides anomaly detection capabilities to identify biased or 
anomalous judge scores using multiple ML models:
- Local Outlier Factor (LOF) - Fast, density-based
- Isolation Forest - Robust to outliers
- One-Class SVM - Good for high-dimensional data

Anomaly Score: 0.0 (normal) to 1.0 (highly anomalous)
"""

import os
import pickle
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

# Try importing ML libraries with graceful fallback
try:
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.ensemble import IsolationForest
    from sklearn.svm import OneClassSVM
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. Anomaly detection will use rule-based fallback.")


class AnomalyDetector:
    """
    Anomaly detector for judge scoring with multiple model support.
    """
    
    # Anomaly thresholds
    THRESHOLD_HIGH = 0.8  # High confidence anomaly
    THRESHOLD_MEDIUM = 0.6  # Medium confidence anomaly
    THRESHOLD_LOW = 0.4  # Low confidence anomaly
    
    def __init__(self, model_type='isolation_forest'):
        """
        Initialize anomaly detector.
        
        Args:
            model_type: 'lof', 'isolation_forest', or 'one_class_svm'
        """
        self.model_type = model_type
        self.model_dir = Path(__file__).parent / 'models'
        self.model_dir.mkdir(exist_ok=True)
        
        self.scaler = None
        self.model = None
        
        # Model file paths
        self.scaler_path = self.model_dir / f'scaler_{model_type}.pkl'
        self.model_path = self.model_dir / f'anomaly_{model_type}.pkl'
        
        # Feature names for reference
        self.feature_names = [
            'technical_skill',
            'artistic_expression',
            'stage_presence',
            'overall_impression',
            'total_score'
        ]
        
        # Rule-based thresholds for fallback
        self.normal_ranges = {
            'technical_skill': (0, 25),
            'artistic_expression': (0, 25),
            'stage_presence': (0, 25),
            'overall_impression': (0, 25),
            'total_score': (0, 100)
        }
        
        # Load model if exists
        if SKLEARN_AVAILABLE:
            self._load_model()
    
    def _load_model(self) -> bool:
        """Load trained model from disk."""
        try:
            if self.scaler_path.exists() and self.model_path.exists():
                with open(self.scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info(f"Loaded {self.model_type} anomaly detection model successfully")
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
            logger.info(f"Saved {self.model_type} anomaly detection model successfully")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    def train(self, scores_data: List[Dict], contamination=0.1):
        """
        Train the anomaly detection model.
        
        Args:
            scores_data: List of score dictionaries with keys:
                        technical_skill, artistic_expression, stage_presence,
                        overall_impression, total_score
            contamination: Expected proportion of outliers (default: 0.1 = 10%)
        
        Returns:
            Dict with training metrics
        """
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for training. Install with: pip install scikit-learn")
        
        if len(scores_data) < 20:
            raise ValueError("Need at least 20 samples for training")
        
        # Extract features
        X = self._extract_features(scores_data)
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model based on type
        if self.model_type == 'lof':
            self.model = LocalOutlierFactor(
                n_neighbors=min(20, len(X) // 2),
                contamination=contamination,
                novelty=True  # Allow prediction on new data
            )
            self.model.fit(X_scaled)
            
        elif self.model_type == 'isolation_forest':
            self.model = IsolationForest(
                n_estimators=100,
                contamination=contamination,
                random_state=42,
                max_samples='auto'
            )
            self.model.fit(X_scaled)
            
        elif self.model_type == 'one_class_svm':
            self.model = OneClassSVM(
                kernel='rbf',
                gamma='auto',
                nu=contamination  # nu is similar to contamination
            )
            self.model.fit(X_scaled)
            
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
        
        # Evaluate on training data
        predictions = self.model.predict(X_scaled)
        anomalies = np.sum(predictions == -1)
        normal = np.sum(predictions == 1)
        
        # Save model
        self._save_model()
        
        return {
            'model_type': self.model_type,
            'total_samples': len(X),
            'normal_scores': int(normal),
            'anomalous_scores': int(anomalies),
            'anomaly_rate': float(anomalies / len(X)),
            'contamination': contamination
        }
    
    def _extract_features(self, scores_data: List[Dict]) -> np.ndarray:
        """Extract feature matrix from score data."""
        features = []
        for score in scores_data:
            feature_vector = [
                float(score.get('technical_skill', 0)),
                float(score.get('artistic_expression', 0)),
                float(score.get('stage_presence', 0)),
                float(score.get('overall_impression', 0)),
                float(score.get('total_score', 0))
            ]
            features.append(feature_vector)
        return np.array(features)
    
    def detect_anomaly(self, score_data: Dict) -> Tuple[bool, float, Dict]:
        """
        Detect if a score is anomalous.
        
        Args:
            score_data: Dictionary with score values
        
        Returns:
            Tuple of (is_anomaly, confidence, details)
            - is_anomaly: Boolean indicating if score is anomalous
            - confidence: Float between 0 and 1 (0=normal, 1=highly anomalous)
            - details: Dict with additional information
        """
        # Use ML model if available and trained
        if SKLEARN_AVAILABLE and self.model is not None and self.scaler is not None:
            return self._detect_ml(score_data)
        else:
            # Fallback to rule-based
            return self._detect_rule_based(score_data)
    
    def _detect_ml(self, score_data: Dict) -> Tuple[bool, float, Dict]:
        """ML-based anomaly detection."""
        try:
            # Extract and scale features
            X = self._extract_features([score_data])
            X_scaled = self.scaler.transform(X)
            
            # Predict
            prediction = self.model.predict(X_scaled)[0]
            
            # Get anomaly score (different methods for different models)
            if self.model_type == 'lof':
                # LOF: negative score means outlier, more negative = more anomalous
                anomaly_score_raw = -self.model.score_samples(X_scaled)[0]
                # Normalize to 0-1 range (typical LOF scores range from -5 to 5)
                confidence = min(max((anomaly_score_raw + 1) / 6, 0), 1)
                
            elif self.model_type == 'isolation_forest':
                # Isolation Forest: score_samples returns average path length
                # Lower values indicate anomalies
                anomaly_score_raw = -self.model.score_samples(X_scaled)[0]
                # Normalize to 0-1 range
                confidence = min(max((anomaly_score_raw + 0.5) / 1, 0), 1)
                
            elif self.model_type == 'one_class_svm':
                # One-Class SVM: decision_function returns signed distance
                anomaly_score_raw = -self.model.decision_function(X_scaled)[0]
                # Normalize to 0-1 range
                confidence = min(max((anomaly_score_raw + 1) / 2, 0), 1)
            
            else:
                confidence = 0.5
            
            is_anomaly = prediction == -1
            
            # Build details
            details = {
                'method': 'ml',
                'model_type': self.model_type,
                'prediction': int(prediction),
                'raw_score': float(anomaly_score_raw) if 'anomaly_score_raw' in locals() else None,
                'features': {
                    name: float(score_data.get(name, 0))
                    for name in self.feature_names
                },
                'severity': self._get_severity(confidence)
            }
            
            return is_anomaly, confidence, details
        
        except Exception as e:
            logger.error(f"ML anomaly detection failed: {e}. Falling back to rule-based.")
            return self._detect_rule_based(score_data)
    
    def _detect_rule_based(self, score_data: Dict) -> Tuple[bool, float, Dict]:
        """Rule-based anomaly detection using statistical thresholds."""
        anomalies = []
        total_checks = 0
        
        # Check each score against normal ranges
        for feature, (min_val, max_val) in self.normal_ranges.items():
            value = float(score_data.get(feature, 0))
            total_checks += 1
            
            # Check if out of range
            if value < min_val or value > max_val:
                anomalies.append({
                    'feature': feature,
                    'value': value,
                    'expected_range': (min_val, max_val),
                    'reason': 'out_of_range'
                })
            
            # Check for suspicious patterns
            # All zeros
            if value == 0 and feature != 'total_score':
                anomalies.append({
                    'feature': feature,
                    'value': value,
                    'reason': 'zero_score'
                })
            
            # Perfect scores (might indicate bias)
            if value == max_val and feature != 'total_score':
                # This is suspicious if ALL scores are perfect
                pass  # We'll check this separately
        
        # Check for all perfect scores
        if all(score_data.get(f, 0) == 25 for f in ['technical_skill', 'artistic_expression', 
                                                       'stage_presence', 'overall_impression']):
            anomalies.append({
                'feature': 'all_scores',
                'reason': 'all_perfect_scores',
                'value': 100
            })
        
        # Check for all same scores (suspicious uniformity)
        scores = [score_data.get(f, 0) for f in ['technical_skill', 'artistic_expression',
                                                   'stage_presence', 'overall_impression']]
        if len(set(scores)) == 1 and scores[0] > 0:
            anomalies.append({
                'feature': 'all_scores',
                'reason': 'uniform_scores',
                'value': scores[0]
            })
        
        # Calculate confidence based on number of anomalies
        confidence = min(len(anomalies) / 3, 1.0)  # 3+ anomalies = 100% confidence
        is_anomaly = len(anomalies) > 0
        
        details = {
            'method': 'rule_based',
            'anomalies_found': anomalies,
            'total_checks': total_checks,
            'features': {
                name: float(score_data.get(name, 0))
                for name in self.feature_names
            },
            'severity': self._get_severity(confidence)
        }
        
        return is_anomaly, confidence, details
    
    def _get_severity(self, confidence: float) -> str:
        """Get severity level based on confidence."""
        if confidence >= self.THRESHOLD_HIGH:
            return 'high'
        elif confidence >= self.THRESHOLD_MEDIUM:
            return 'medium'
        elif confidence >= self.THRESHOLD_LOW:
            return 'low'
        else:
            return 'none'
    
    def analyze_judge_pattern(self, judge_scores: List[Dict]) -> Dict:
        """
        Analyze a judge's scoring pattern for bias or anomalies.
        
        Args:
            judge_scores: List of all scores from a specific judge
        
        Returns:
            Dict with analysis results
        """
        if not judge_scores:
            return {'error': 'No scores provided'}
        
        # Extract features
        X = self._extract_features(judge_scores)
        
        # Calculate statistics
        stats = {
            'total_scores': len(judge_scores),
            'mean_scores': {
                name: float(np.mean(X[:, i]))
                for i, name in enumerate(self.feature_names)
            },
            'std_scores': {
                name: float(np.std(X[:, i]))
                for i, name in enumerate(self.feature_names)
            },
            'min_scores': {
                name: float(np.min(X[:, i]))
                for i, name in enumerate(self.feature_names)
            },
            'max_scores': {
                name: float(np.max(X[:, i]))
                for i, name in enumerate(self.feature_names)
            }
        }
        
        # Detect patterns
        patterns = []
        
        # Check for low variance (always giving similar scores)
        for name, std in stats['std_scores'].items():
            if std < 2.0 and name != 'total_score':  # Very low variance
                patterns.append({
                    'pattern': 'low_variance',
                    'feature': name,
                    'std': std,
                    'description': f'Judge shows very low variance in {name} scores'
                })
        
        # Check for bias towards high scores
        for name, mean in stats['mean_scores'].items():
            if mean > 22 and name != 'total_score':  # Consistently high scores
                patterns.append({
                    'pattern': 'high_bias',
                    'feature': name,
                    'mean': mean,
                    'description': f'Judge tends to give very high {name} scores'
                })
        
        # Check for bias towards low scores
        for name, mean in stats['mean_scores'].items():
            if mean < 10 and name != 'total_score':  # Consistently low scores
                patterns.append({
                    'pattern': 'low_bias',
                    'feature': name,
                    'mean': mean,
                    'description': f'Judge tends to give very low {name} scores'
                })
        
        stats['patterns'] = patterns
        stats['bias_detected'] = len(patterns) > 0
        
        return stats
    
    def batch_detect(self, scores_data: List[Dict]) -> List[Dict]:
        """
        Detect anomalies in multiple scores at once.
        
        Args:
            scores_data: List of score dictionaries
        
        Returns:
            List of dicts with anomaly detection results
        """
        results = []
        for score in scores_data:
            is_anomaly, confidence, details = self.detect_anomaly(score)
            results.append({
                'score': score,
                'is_anomaly': is_anomaly,
                'confidence': confidence,
                'details': details
            })
        return results


# Singleton instance
_detector_instance = None

def get_anomaly_detector(model_type='isolation_forest') -> AnomalyDetector:
    """Get or create anomaly detector instance."""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = AnomalyDetector(model_type=model_type)
    return _detector_instance
