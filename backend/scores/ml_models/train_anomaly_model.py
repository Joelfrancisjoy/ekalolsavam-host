"""
Training script for anomaly detection model with sample scoring data.

This script provides:
1. Sample training data for judge scores
2. Training function for the anomaly detection model
3. Evaluation metrics

Usage:
    python manage.py train_anomaly_model
    OR
    python -m scores.ml_models.train_anomaly_model
"""

import random
from .anomaly_detector import AnomalyDetector


# Generate realistic sample training data
def generate_sample_scores(num_samples=100):
    """
    Generate sample judge scores for training.
    Mix of normal scores and anomalous scores.
    """
    scores = []
    
    # Generate normal scores (90% of data)
    for i in range(int(num_samples * 0.9)):
        # Normal scores: reasonable distribution
        technical = random.uniform(15, 24)
        artistic = random.uniform(15, 24)
        stage = random.uniform(15, 24)
        overall = random.uniform(15, 24)
        
        # Add some natural variation
        if random.random() < 0.3:  # 30% chance of slightly lower score
            technical -= random.uniform(0, 5)
            artistic -= random.uniform(0, 5)
        
        scores.append({
            'technical_skill': max(0, min(25, technical)),
            'artistic_expression': max(0, min(25, artistic)),
            'stage_presence': max(0, min(25, stage)),
            'overall_impression': max(0, min(25, overall)),
            'total_score': max(0, min(100, technical + artistic + stage + overall))
        })
    
    # Generate anomalous scores (10% of data)
    anomaly_types = [
        'all_perfect',  # All 25s - suspicious
        'all_zeros',    # All 0s - error or bias
        'all_same',     # All same value - suspicious uniformity
        'extreme_low',  # Unusually low scores
        'extreme_high_variance',  # One very high, others very low
    ]
    
    for i in range(int(num_samples * 0.1)):
        anomaly_type = random.choice(anomaly_types)
        
        if anomaly_type == 'all_perfect':
            scores.append({
                'technical_skill': 25,
                'artistic_expression': 25,
                'stage_presence': 25,
                'overall_impression': 25,
                'total_score': 100
            })
        
        elif anomaly_type == 'all_zeros':
            scores.append({
                'technical_skill': 0,
                'artistic_expression': 0,
                'stage_presence': 0,
                'overall_impression': 0,
                'total_score': 0
            })
        
        elif anomaly_type == 'all_same':
            value = random.choice([10, 12, 15, 18, 20])
            scores.append({
                'technical_skill': value,
                'artistic_expression': value,
                'stage_presence': value,
                'overall_impression': value,
                'total_score': value * 4
            })
        
        elif anomaly_type == 'extreme_low':
            scores.append({
                'technical_skill': random.uniform(0, 5),
                'artistic_expression': random.uniform(0, 5),
                'stage_presence': random.uniform(0, 5),
                'overall_impression': random.uniform(0, 5),
                'total_score': random.uniform(0, 20)
            })
        
        elif anomaly_type == 'extreme_high_variance':
            high_score = 25
            low_scores = [random.uniform(0, 8) for _ in range(3)]
            all_scores = [high_score] + low_scores
            random.shuffle(all_scores)
            scores.append({
                'technical_skill': all_scores[0],
                'artistic_expression': all_scores[1],
                'stage_presence': all_scores[2],
                'overall_impression': all_scores[3],
                'total_score': sum(all_scores)
            })
    
    # Shuffle to mix normal and anomalous
    random.shuffle(scores)
    return scores


def train_model(model_type='isolation_forest', num_samples=100, contamination=0.1):
    """
    Train the anomaly detection model.
    
    Args:
        model_type: 'lof', 'isolation_forest', or 'one_class_svm'
        num_samples: Number of training samples to generate
        contamination: Expected proportion of outliers
    
    Returns:
        Dict with training results
    """
    print(f"\n{'='*60}")
    print(f"Training Anomaly Detection Model: {model_type.upper()}")
    print(f"{'='*60}\n")
    
    # Generate training data
    print(f"📊 Generating Training Data...")
    scores_data = generate_sample_scores(num_samples)
    print(f"   Total samples: {len(scores_data)}")
    print(f"   Expected anomalies: ~{int(len(scores_data) * contamination)}")
    print()
    
    # Initialize and train
    detector = AnomalyDetector(model_type=model_type)
    
    try:
        print("🔄 Training model...")
        results = detector.train(scores_data, contamination=contamination)
        
        print(f"\n✅ Training Complete!")
        print(f"   Model: {results['model_type']}")
        print(f"   Total samples: {results['total_samples']}")
        print(f"   Normal scores: {results['normal_scores']}")
        print(f"   Anomalous scores: {results['anomalous_scores']}")
        print(f"   Anomaly rate: {results['anomaly_rate']:.2%}")
        
        # Test with sample predictions
        print(f"\n🧪 Sample Predictions:")
        
        test_cases = [
            {
                'name': 'Normal Score',
                'data': {
                    'technical_skill': 20.0,
                    'artistic_expression': 18.5,
                    'stage_presence': 19.0,
                    'overall_impression': 20.5,
                    'total_score': 78.0
                }
            },
            {
                'name': 'Perfect Score (Suspicious)',
                'data': {
                    'technical_skill': 25.0,
                    'artistic_expression': 25.0,
                    'stage_presence': 25.0,
                    'overall_impression': 25.0,
                    'total_score': 100.0
                }
            },
            {
                'name': 'All Zeros (Error)',
                'data': {
                    'technical_skill': 0.0,
                    'artistic_expression': 0.0,
                    'stage_presence': 0.0,
                    'overall_impression': 0.0,
                    'total_score': 0.0
                }
            },
            {
                'name': 'Uniform Scores (Suspicious)',
                'data': {
                    'technical_skill': 15.0,
                    'artistic_expression': 15.0,
                    'stage_presence': 15.0,
                    'overall_impression': 15.0,
                    'total_score': 60.0
                }
            },
            {
                'name': 'High Variance (Suspicious)',
                'data': {
                    'technical_skill': 25.0,
                    'artistic_expression': 5.0,
                    'stage_presence': 3.0,
                    'overall_impression': 4.0,
                    'total_score': 37.0
                }
            }
        ]
        
        for test_case in test_cases:
            is_anomaly, confidence, details = detector.detect_anomaly(test_case['data'])
            
            status = "🚨 ANOMALY" if is_anomaly else "✅ NORMAL"
            severity = details.get('severity', 'none').upper()
            
            print(f"\n   {status} - {test_case['name']}")
            print(f"   Confidence: {confidence:.2%} | Severity: {severity}")
            print(f"   Scores: T={test_case['data']['technical_skill']:.1f}, "
                  f"A={test_case['data']['artistic_expression']:.1f}, "
                  f"S={test_case['data']['stage_presence']:.1f}, "
                  f"O={test_case['data']['overall_impression']:.1f}")
        
        print(f"\n{'='*60}")
        print("✅ Model saved successfully!")
        print(f"{'='*60}\n")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        raise


def evaluate_model(model_type='isolation_forest'):
    """
    Evaluate the trained model with test cases.
    
    Args:
        model_type: 'lof', 'isolation_forest', or 'one_class_svm'
    """
    detector = AnomalyDetector(model_type=model_type)
    
    test_cases = [
        ('Normal', {'technical_skill': 20, 'artistic_expression': 19, 'stage_presence': 21, 'overall_impression': 20, 'total_score': 80}, False),
        ('Perfect', {'technical_skill': 25, 'artistic_expression': 25, 'stage_presence': 25, 'overall_impression': 25, 'total_score': 100}, True),
        ('Zeros', {'technical_skill': 0, 'artistic_expression': 0, 'stage_presence': 0, 'overall_impression': 0, 'total_score': 0}, True),
        ('Uniform', {'technical_skill': 18, 'artistic_expression': 18, 'stage_presence': 18, 'overall_impression': 18, 'total_score': 72}, True),
        ('Normal 2', {'technical_skill': 22, 'artistic_expression': 20, 'stage_presence': 19, 'overall_impression': 21, 'total_score': 82}, False),
    ]
    
    print(f"\n{'='*60}")
    print("Model Evaluation")
    print(f"{'='*60}\n")
    
    correct = 0
    for name, data, expected_anomaly in test_cases:
        is_anomaly, confidence, details = detector.detect_anomaly(data)
        is_correct = is_anomaly == expected_anomaly
        correct += is_correct
        
        status = "✅" if is_correct else "❌"
        result = "ANOMALY" if is_anomaly else "NORMAL"
        expected = "ANOMALY" if expected_anomaly else "NORMAL"
        
        print(f"{status} {name:12s} | Expected: {expected:7s} | Got: {result:7s} ({confidence:.2%})")
    
    accuracy = correct / len(test_cases)
    print(f"\nEvaluation Accuracy: {accuracy:.2%} ({correct}/{len(test_cases)})")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    # Train all models
    print("Training Isolation Forest model...")
    train_model(model_type='isolation_forest', num_samples=100)
    
    print("\nTraining LOF model...")
    train_model(model_type='lof', num_samples=100)
    
    print("\nTraining One-Class SVM model...")
    train_model(model_type='one_class_svm', num_samples=100)
    
    # Evaluate
    print("\nEvaluating Isolation Forest...")
    evaluate_model(model_type='isolation_forest')
    
    print("\nEvaluating LOF...")
    evaluate_model(model_type='lof')
    
    print("\nEvaluating One-Class SVM...")
    evaluate_model(model_type='one_class_svm')
