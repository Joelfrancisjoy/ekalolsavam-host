"""
Training script for performance prediction model with sample data.

This script provides:
1. Sample training data for participant performance
2. Training function for the prediction model
3. Evaluation metrics

Usage:
    python manage.py train_performance_model
    OR
    python -m scores.ml_models.train_performance_model
"""

import random
import numpy as np
from .performance_predictor import PerformancePredictor


def generate_sample_data(num_samples=200):
    """
    Generate realistic sample participant performance data.
    
    Simulates various participant profiles:
    - Beginners (low past scores)
    - Average performers (medium scores)
    - High performers (high scores)
    - Improving participants (upward trend)
    - Declining participants (downward trend)
    """
    data = []
    
    categories = ['dance', 'music', 'theatre', 'literary', 'visual_arts']
    school_categories = ['LP', 'UP', 'HS', 'HSS']
    
    for i in range(num_samples):
        # Random participant profile
        profile_type = random.choice([
            'beginner', 'average', 'high_performer',
            'improving', 'declining', 'consistent'
        ])
        
        event_category = random.choice(categories)
        school_category = random.choice(school_categories)
        
        # Generate past scores based on profile
        num_past_events = random.randint(1, 15)
        
        if profile_type == 'beginner':
            # Low scores, some improvement
            base_score = random.uniform(40, 55)
            past_scores = [
                max(0, min(100, base_score + random.uniform(-5, 10) + i * 0.5))
                for i in range(num_past_events)
            ]
            # Predict slightly higher (learning curve)
            actual_score = min(100, past_scores[-1] + random.uniform(2, 8))
        
        elif profile_type == 'average':
            # Medium scores, stable
            base_score = random.uniform(60, 75)
            past_scores = [
                max(0, min(100, base_score + random.uniform(-8, 8)))
                for _ in range(num_past_events)
            ]
            actual_score = base_score + random.uniform(-5, 5)
        
        elif profile_type == 'high_performer':
            # High scores, very stable
            base_score = random.uniform(80, 95)
            past_scores = [
                max(0, min(100, base_score + random.uniform(-3, 3)))
                for _ in range(num_past_events)
            ]
            actual_score = base_score + random.uniform(-2, 2)
        
        elif profile_type == 'improving':
            # Clear upward trend
            start_score = random.uniform(50, 70)
            past_scores = [
                max(0, min(100, start_score + i * 2 + random.uniform(-3, 3)))
                for i in range(num_past_events)
            ]
            # Continue improvement
            actual_score = min(100, past_scores[-1] + random.uniform(3, 8))
        
        elif profile_type == 'declining':
            # Downward trend (burnout, loss of interest)
            start_score = random.uniform(70, 85)
            past_scores = [
                max(0, min(100, start_score - i * 1.5 + random.uniform(-3, 3)))
                for i in range(num_past_events)
            ]
            # Continue decline
            actual_score = max(0, past_scores[-1] - random.uniform(2, 6))
        
        else:  # consistent
            # Very stable performance
            base_score = random.uniform(65, 80)
            past_scores = [
                max(0, min(100, base_score + random.uniform(-2, 2)))
                for _ in range(num_past_events)
            ]
            actual_score = base_score + random.uniform(-1, 1)
        
        # Category-specific adjustments
        category_difficulty = {
            'dance': 0,
            'music': 2,  # Slightly easier
            'theatre': -2,  # Slightly harder
            'literary': 3,  # Easier
            'visual_arts': 0
        }
        actual_score += category_difficulty.get(event_category, 0)
        
        # School category adjustments (older students tend to score higher)
        school_bonus = {
            'LP': -5,  # Younger, less experience
            'UP': -2,
            'HS': 0,
            'HSS': 3  # Older, more experience
        }
        actual_score += school_bonus.get(school_category, 0)
        
        # Clip to valid range
        actual_score = max(0, min(100, actual_score))
        past_scores = [max(0, min(100, s)) for s in past_scores]
        
        data.append({
            'past_scores': past_scores,
            'event_category': event_category,
            'school_category': school_category,
            'num_events_participated': num_past_events,
            'actual_score': actual_score,
            'profile_type': profile_type  # For analysis only
        })
    
    return data


def train_model(model_type='random_forest', num_samples=200, test_size=0.2):
    """
    Train the performance prediction model.
    
    Args:
        model_type: 'decision_tree', 'random_forest', or 'neural_network'
        num_samples: Number of training samples to generate
        test_size: Fraction of data for testing
    
    Returns:
        Dict with training results
    """
    print(f"\n{'='*60}")
    print(f"Training Performance Prediction Model: {model_type.upper()}")
    print(f"{'='*60}\n")
    
    # Generate training data
    print(f"📊 Generating Training Data...")
    training_data = generate_sample_data(num_samples)
    
    # Analyze data distribution
    profile_counts = {}
    for d in training_data:
        profile = d.get('profile_type', 'unknown')
        profile_counts[profile] = profile_counts.get(profile, 0) + 1
    
    print(f"   Total samples: {len(training_data)}")
    print(f"   Profile distribution:")
    for profile, count in profile_counts.items():
        print(f"      {profile}: {count}")
    print()
    
    # Initialize and train
    predictor = PerformancePredictor(model_type=model_type)
    
    try:
        print("🔄 Training model...")
        results = predictor.train(training_data, test_size=test_size)
        
        print(f"\n✅ Training Complete!")
        print(f"   Model: {results['model_type']}")
        print(f"   Total samples: {results['total_samples']}")
        print(f"   Train samples: {results['train_samples']}")
        print(f"   Test samples: {results['test_samples']}")
        print(f"\n📈 Performance Metrics:")
        print(f"   Train RMSE: {results['train_rmse']:.2f}")
        print(f"   Test RMSE: {results['test_rmse']:.2f}")
        print(f"   Train MAE: {results['train_mae']:.2f}")
        print(f"   Test MAE: {results['test_mae']:.2f}")
        print(f"   Train R²: {results['train_r2']:.3f}")
        print(f"   Test R²: {results['test_r2']:.3f}")
        
        # Test with sample predictions
        print(f"\n🧪 Sample Predictions:")
        
        test_cases = [
            {
                'name': 'Beginner (New Participant)',
                'data': {
                    'past_scores': [45, 48, 52],
                    'event_category': 'dance',
                    'school_category': 'HS',
                    'num_events_participated': 3
                }
            },
            {
                'name': 'Average Performer',
                'data': {
                    'past_scores': [65, 68, 67, 70, 69],
                    'event_category': 'music',
                    'school_category': 'HSS',
                    'num_events_participated': 5
                }
            },
            {
                'name': 'High Performer',
                'data': {
                    'past_scores': [85, 88, 87, 90, 89, 91],
                    'event_category': 'literary',
                    'school_category': 'HSS',
                    'num_events_participated': 6
                }
            },
            {
                'name': 'Improving Participant',
                'data': {
                    'past_scores': [55, 60, 65, 70, 75],
                    'event_category': 'theatre',
                    'school_category': 'HS',
                    'num_events_participated': 5
                }
            },
            {
                'name': 'Declining Participant',
                'data': {
                    'past_scores': [80, 75, 72, 68, 65],
                    'event_category': 'visual_arts',
                    'school_category': 'HSS',
                    'num_events_participated': 5
                }
            },
            {
                'name': 'New Participant (No History)',
                'data': {
                    'past_scores': [],
                    'event_category': 'dance',
                    'school_category': 'UP',
                    'num_events_participated': 0
                }
            }
        ]
        
        for test_case in test_cases:
            predicted_score, details = predictor.predict(test_case['data'])
            past_scores = test_case['data']['past_scores']
            
            print(f"\n   📌 {test_case['name']}")
            print(f"      Past scores: {past_scores if past_scores else 'None (new participant)'}")
            if past_scores:
                print(f"      Past average: {np.mean(past_scores):.1f}")
            print(f"      Event: {test_case['data']['event_category']}")
            print(f"      School: {test_case['data']['school_category']}")
            print(f"      ➡️  Predicted score: {predicted_score:.1f}")
            print(f"      Confidence: {details['confidence']:.2%}")
        
        print(f"\n{'='*60}")
        print("✅ Model saved successfully!")
        print(f"{'='*60}\n")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        raise


def evaluate_model(model_type='random_forest'):
    """
    Evaluate the trained model with test cases.
    
    Args:
        model_type: 'decision_tree', 'random_forest', or 'neural_network'
    """
    predictor = PerformancePredictor(model_type=model_type)
    
    # Generate test data
    test_data = generate_sample_data(50)
    
    print(f"\n{'='*60}")
    print("Model Evaluation")
    print(f"{'='*60}\n")
    
    predictions = []
    actuals = []
    
    for data in test_data:
        participant_data = {
            'past_scores': data['past_scores'],
            'event_category': data['event_category'],
            'school_category': data['school_category'],
            'num_events_participated': data['num_events_participated']
        }
        
        predicted_score, _ = predictor.predict(participant_data)
        actual_score = data['actual_score']
        
        predictions.append(predicted_score)
        actuals.append(actual_score)
    
    # Calculate metrics
    predictions = np.array(predictions)
    actuals = np.array(actuals)
    
    mae = np.mean(np.abs(predictions - actuals))
    rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
    r2 = 1 - (np.sum((actuals - predictions) ** 2) / np.sum((actuals - np.mean(actuals)) ** 2))
    
    print(f"Test Set Evaluation ({len(test_data)} samples):")
    print(f"   MAE: {mae:.2f} points")
    print(f"   RMSE: {rmse:.2f} points")
    print(f"   R² Score: {r2:.3f}")
    
    # Show some examples
    print(f"\n📋 Sample Predictions vs Actual:")
    for i in range(min(5, len(test_data))):
        print(f"   {i+1}. Predicted: {predictions[i]:.1f} | Actual: {actuals[i]:.1f} | "
              f"Error: {abs(predictions[i] - actuals[i]):.1f}")
    
    print(f"\n{'='*60}\n")


if __name__ == '__main__':
    # Train all models
    print("Training Random Forest model...")
    train_model(model_type='random_forest', num_samples=200)
    
    print("\nTraining Decision Tree model...")
    train_model(model_type='decision_tree', num_samples=200)
    
    print("\nTraining Neural Network model...")
    train_model(model_type='neural_network', num_samples=200)
    
    # Evaluate
    print("\nEvaluating Random Forest...")
    evaluate_model(model_type='random_forest')
    
    print("\nEvaluating Decision Tree...")
    evaluate_model(model_type='decision_tree')
    
    print("\nEvaluating Neural Network...")
    evaluate_model(model_type='neural_network')
