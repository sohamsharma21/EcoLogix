"""
Vehicle Overload Detection Model Training Script
Trains a Random Forest classifier to detect vehicle overload conditions
"""

# ============================================
# Import Statements
# ============================================
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
import joblib
import json
import os
from datetime import datetime

# ============================================
# Configuration
# ============================================
RANDOM_STATE = 42
N_SAMPLES = 1000
TEST_SIZE = 0.2
MODEL_FILE = 'vehicle_overload_model.pkl'
SCALER_FILE = 'scaler.pkl'
CONFIG_FILE = 'model_config.json'

# ============================================
# Data Generation Functions
# ============================================

def generate_normal_vehicle_data(n_samples=500):
    """
    Generate synthetic data for normal (non-overloaded) vehicles
    
    Parameters:
    -----------
    n_samples : int
        Number of samples to generate
        
    Returns:
    --------
    DataFrame with vehicle features
    """
    print(f"Generating {n_samples} normal vehicle samples...")
    
    np.random.seed(RANDOM_STATE)
    
    data = {
        'current_load': np.random.uniform(2.0, 8.0, n_samples),  # Load less than max
        'max_load': np.random.uniform(10.0, 15.0, n_samples),
        'suspension': np.random.uniform(70, 100, n_samples),  # Good suspension
        'tire_pressure': np.random.uniform(28, 35, n_samples),  # Normal pressure
        'weight': np.random.uniform(3000, 8000, n_samples),
        'speed': np.random.uniform(30, 80, n_samples)  # Moderate speed
    }
    
    df = pd.DataFrame(data)
    
    # Calculate load_ratio
    df['load_ratio'] = (df['current_load'] / df['max_load']) * 100
    
    # Ensure load_ratio is less than 100 for normal vehicles
    df['load_ratio'] = df['load_ratio'].clip(upper=95)
    df['current_load'] = df['load_ratio'] * df['max_load'] / 100
    
    # Add label: 0 for normal (not overloaded)
    df['is_overloaded'] = 0
    
    return df

def generate_overloaded_vehicle_data(n_samples=500):
    """
    Generate synthetic data for overloaded vehicles
    
    Parameters:
    -----------
    n_samples : int
        Number of samples to generate
        
    Returns:
    --------
    DataFrame with vehicle features
    """
    print(f"Generating {n_samples} overloaded vehicle samples...")
    
    np.random.seed(RANDOM_STATE + 1)
    
    data = {
        'max_load': np.random.uniform(10.0, 15.0, n_samples),
        'suspension': np.random.uniform(20, 60, n_samples),  # Bad suspension
        'tire_pressure': np.random.uniform(20, 45, n_samples),  # Abnormal pressure
        'weight': np.random.uniform(5000, 10000, n_samples),
        'speed': np.random.uniform(50, 120, n_samples)  # Higher speed
    }
    
    df = pd.DataFrame(data)
    
    # Calculate load_ratio (over 100% for overloaded vehicles)
    df['load_ratio'] = np.random.uniform(105, 160, n_samples)
    
    # Calculate current_load based on load_ratio
    df['current_load'] = (df['load_ratio'] / 100) * df['max_load']
    
    # Add label: 1 for overloaded
    df['is_overloaded'] = 1
    
    return df

def create_synthetic_dataset(n_samples=1000):
    """
    Create synthetic training dataset with balanced classes
    
    Parameters:
    -----------
    n_samples : int
        Total number of samples to generate
        
    Returns:
    --------
    DataFrame with features and labels
    """
    print("=" * 60)
    print("Creating Synthetic Training Dataset")
    print("=" * 60)
    
    # Generate balanced dataset (50% normal, 50% overloaded)
    n_normal = n_samples // 2
    n_overloaded = n_samples - n_normal
    
    normal_df = generate_normal_vehicle_data(n_normal)
    overloaded_df = generate_overloaded_vehicle_data(n_overloaded)
    
    # Combine datasets
    df = pd.concat([normal_df, overloaded_df], ignore_index=True)
    
    # Shuffle the dataset
    df = df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    
    print(f"\nDataset created successfully!")
    print(f"Total samples: {len(df)}")
    print(f"Normal vehicles: {len(df[df['is_overloaded'] == 0])}")
    print(f"Overloaded vehicles: {len(df[df['is_overloaded'] == 1])}")
    print(f"\nDataset statistics:")
    print(df.describe())
    
    return df

# ============================================
# Data Validation
# ============================================

def validate_data(df):
    """
    Validate the dataset for training
    
    Parameters:
    -----------
    df : DataFrame
        Dataset to validate
        
    Returns:
    --------
    bool : True if valid, raises exception if invalid
    """
    print("\nValidating dataset...")
    
    # Check for required columns
    required_columns = ['current_load', 'max_load', 'load_ratio', 'suspension', 
                       'tire_pressure', 'weight', 'speed', 'is_overloaded']
    
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Check for null values
    if df.isnull().any().any():
        null_counts = df.isnull().sum()
        raise ValueError(f"Dataset contains null values:\n{null_counts[null_counts > 0]}")
    
    # Check for infinite values
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if np.isinf(df[numeric_cols]).any().any():
        raise ValueError("Dataset contains infinite values")
    
    # Check data ranges
    if (df['suspension'] < 0).any() or (df['suspension'] > 100).any():
        raise ValueError("Suspension values must be between 0 and 100")
    
    if (df['tire_pressure'] < 0).any() or (df['tire_pressure'] > 100).any():
        raise ValueError("Tire pressure values must be positive")
    
    if (df['current_load'] < 0).any() or (df['max_load'] < 0).any():
        raise ValueError("Load values must be positive")
    
    # Check label distribution
    label_counts = df['is_overloaded'].value_counts()
    if len(label_counts) < 2:
        raise ValueError("Dataset must contain both classes (0 and 1)")
    
    print("✓ Dataset validation passed!")
    return True

# ============================================
# Model Training
# ============================================

def train_model(X_train, y_train):
    """
    Train Random Forest classifier
    
    Parameters:
    -----------
    X_train : array-like
        Training features
    y_train : array-like
        Training labels
        
    Returns:
    --------
    RandomForestClassifier : Trained model
    """
    print("\n" + "=" * 60)
    print("Training Random Forest Classifier")
    print("=" * 60)
    
    print("Model parameters:")
    print(f"  - n_estimators: 100")
    print(f"  - max_depth: 10")
    print(f"  - random_state: {RANDOM_STATE}")
    
    # Initialize model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=RANDOM_STATE,
        n_jobs=-1,  # Use all available cores
        verbose=1
    )
    
    # Train model
    print("\nTraining in progress...")
    model.fit(X_train, y_train)
    
    print("✓ Model training completed!")
    
    return model

# ============================================
# Model Evaluation
# ============================================

def evaluate_model(model, X_test, y_test):
    """
    Evaluate model performance on test set
    
    Parameters:
    -----------
    model : Trained model
    X_test : array-like
        Test features
    y_test : array-like
        Test labels
        
    Returns:
    --------
    dict : Evaluation metrics
    """
    print("\n" + "=" * 60)
    print("Evaluating Model on Test Set")
    print("=" * 60)
    
    # Make predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    # Print metrics
    print(f"\nModel Performance Metrics:")
    print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1-Score:  {f1:.4f}")
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    print(f"\nConfusion Matrix:")
    print(f"                Predicted")
    print(f"              Normal  Overloaded")
    print(f"Actual Normal    {cm[0][0]:4d}      {cm[0][1]:4d}")
    print(f"      Overloaded {cm[1][0]:4d}      {cm[1][1]:4d}")
    
    # Classification report
    print(f"\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Overloaded']))
    
    metrics = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'confusion_matrix': cm.tolist()
    }
    
    return metrics

# ============================================
# Save Model and Artifacts
# ============================================

def save_model_artifacts(model, scaler, feature_names, metrics):
    """
    Save trained model, scaler, and configuration
    
    Parameters:
    -----------
    model : Trained model
    scaler : Fitted scaler
    feature_names : list
        List of feature names
    metrics : dict
        Evaluation metrics
    """
    print("\n" + "=" * 60)
    print("Saving Model Artifacts")
    print("=" * 60)
    
    try:
        # Save model
        print(f"Saving model to {MODEL_FILE}...")
        joblib.dump(model, MODEL_FILE)
        print(f"✓ Model saved successfully!")
        
        # Save scaler
        print(f"Saving scaler to {SCALER_FILE}...")
        joblib.dump(scaler, SCALER_FILE)
        print(f"✓ Scaler saved successfully!")
        
        # Save model configuration
        config = {
            'model_name': 'Vehicle Overload Detection',
            'model_version': '1.0.0',
            'model_type': 'RandomForestClassifier',
            'model_parameters': {
                'n_estimators': 100,
                'max_depth': 10,
                'random_state': RANDOM_STATE
            },
            'feature_names': feature_names,
            'training_date': datetime.now().isoformat(),
            'evaluation_metrics': metrics,
            'scaler_type': 'StandardScaler'
        }
        
        print(f"Saving configuration to {CONFIG_FILE}...")
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
        print(f"✓ Configuration saved successfully!")
        
        print(f"\nAll artifacts saved successfully!")
        print(f"  - Model: {MODEL_FILE}")
        print(f"  - Scaler: {SCALER_FILE}")
        print(f"  - Config: {CONFIG_FILE}")
        
    except Exception as e:
        print(f"✗ Error saving artifacts: {str(e)}")
        raise

# ============================================
# Test Predictions
# ============================================

def test_predictions(model, scaler, feature_names):
    """
    Generate predictions on test cases
    
    Parameters:
    -----------
    model : Trained model
    scaler : Fitted scaler
    feature_names : list
        List of feature names
    """
    print("\n" + "=" * 60)
    print("Testing Model Predictions")
    print("=" * 60)
    
    # Test cases
    test_cases = [
        {
            'name': 'Normal Vehicle',
            'current_load': 8.0,
            'max_load': 12.0,
            'suspension': 85,
            'tire_pressure': 32,
            'weight': 5000,
            'speed': 60
        },
        {
            'name': 'Slightly Overloaded',
            'current_load': 13.0,
            'max_load': 12.0,
            'suspension': 70,
            'tire_pressure': 30,
            'weight': 6000,
            'speed': 75
        },
        {
            'name': 'Severely Overloaded',
            'current_load': 18.0,
            'max_load': 12.0,
            'suspension': 40,
            'tire_pressure': 25,
            'weight': 8000,
            'speed': 90
        },
        {
            'name': 'Borderline Case',
            'current_load': 11.5,
            'max_load': 12.0,
            'suspension': 65,
            'tire_pressure': 28,
            'weight': 5500,
            'speed': 70
        }
    ]
    
    print("\nTest Case Predictions:")
    print("-" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        # Calculate load_ratio
        load_ratio = (test_case['current_load'] / test_case['max_load']) * 100
        
        # Prepare features in correct order
        features = np.array([[
            test_case['current_load'],
            test_case['max_load'],
            load_ratio,
            test_case['suspension'],
            test_case['tire_pressure'],
            test_case['weight'],
            test_case['speed']
        ]])
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0]
        
        # Print results
        print(f"\nTest Case {i}: {test_case['name']}")
        print(f"  Features:")
        print(f"    Current Load: {test_case['current_load']:.2f} tons")
        print(f"    Max Load: {test_case['max_load']:.2f} tons")
        print(f"    Load Ratio: {load_ratio:.2f}%")
        print(f"    Suspension: {test_case['suspension']}%")
        print(f"    Tire Pressure: {test_case['tire_pressure']} PSI")
        print(f"    Weight: {test_case['weight']} kg")
        print(f"    Speed: {test_case['speed']} km/h")
        print(f"  Prediction: {'OVERLOADED' if prediction == 1 else 'NORMAL'}")
        print(f"  Confidence: {probability[1]*100:.2f}% (overloaded), {probability[0]*100:.2f}% (normal)")

# ============================================
# Main Training Pipeline
# ============================================

def main():
    """
    Main training pipeline
    """
    print("\n" + "=" * 60)
    print("Vehicle Overload Detection Model Training")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Step 1: Create synthetic dataset
        df = create_synthetic_dataset(N_SAMPLES)
        
        # Step 2: Validate data
        validate_data(df)
        
        # Step 3: Prepare features and labels
        print("\n" + "=" * 60)
        print("Preparing Features and Labels")
        print("=" * 60)
        
        feature_names = ['current_load', 'max_load', 'load_ratio', 'suspension', 
                        'tire_pressure', 'weight', 'speed']
        
        X = df[feature_names].values
        y = df['is_overloaded'].values
        
        print(f"Features shape: {X.shape}")
        print(f"Labels shape: {y.shape}")
        
        # Step 4: Split data
        print(f"\nSplitting data (train: {int((1-TEST_SIZE)*100)}%, test: {int(TEST_SIZE*100)}%)...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
        )
        
        print(f"Training set: {X_train.shape[0]} samples")
        print(f"Test set: {X_test.shape[0]} samples")
        
        # Step 5: Normalize data
        print("\nNormalizing data using StandardScaler...")
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        print("✓ Data normalization completed!")
        
        # Step 6: Train model
        model = train_model(X_train_scaled, y_train)
        
        # Step 7: Evaluate model
        metrics = evaluate_model(model, X_test_scaled, y_test)
        
        # Step 8: Save artifacts
        save_model_artifacts(model, scaler, feature_names, metrics)
        
        # Step 9: Test predictions
        test_predictions(model, scaler, feature_names)
        
        print("\n" + "=" * 60)
        print("Training Pipeline Completed Successfully!")
        print("=" * 60)
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\n✗ Error in training pipeline: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

# ============================================
# Run Training
# ============================================

if __name__ == '__main__':
    main()

