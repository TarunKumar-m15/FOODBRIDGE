import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib

app = Flask(__name__)
CORS(app) # Allow cross-origin requests

# Load model pipeline on start
MODEL_PATH = 'shelf_life_model.joblib'
model_pipeline = None

if os.path.exists(MODEL_PATH):
    try:
        model_pipeline = joblib.load(MODEL_PATH)
        print("✓ Model pipeline successfully loaded.")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
else:
    print("⚠ Model artifact not found. Flask will run in rule-based simulation mode.")

def calculate_confidence(preprocessor, regressor, features_df, predicted_days):
    """
    Computes a prediction confidence score (0.0 to 1.0)
    using the standard deviation of decision tree outputs in the Random Forest
    """
    try:
        # Preprocess features
        preprocessed = preprocessor.transform(features_df)
        # Get predictions from all individual trees
        tree_preds = [tree.predict(preprocessed)[0] for tree in regressor.estimators_]
        std_dev = np.std(tree_preds)
        
        # High std_dev indicates high disagreement, thus lower confidence
        mean_pred = np.mean(tree_preds)
        if mean_pred == 0:
            return 1.0
        confidence = 1.0 - (std_dev / (mean_pred * 2.0))
        return round(float(np.clip(confidence, 0.5, 0.99)), 2)
    except Exception:
        return 0.85 # Fallback confidence index

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}
    
    # 1) Handle missing values & validate inputs
    food_name = data.get('foodName', 'Food Item')
    category = data.get('category', 'Cooked Food')
    storage_method = data.get('storageMethod', 'Room Temperature')
    
    # Sensible defaults based on storage method
    default_temp = {
        'Freezer': -18.0,
        'Refrigerator': 4.0,
        'Room Temperature': 22.0
    }.get(storage_method, 22.0)
    
    default_humidity = {
        'Freezer': 40.0,
        'Refrigerator': 80.0,
        'Room Temperature': 50.0
    }.get(storage_method, 50.0)

    temperature = data.get('temperature')
    if temperature is None:
        temperature = default_temp
    else:
        try:
            temperature = float(temperature)
        except ValueError:
            temperature = default_temp

    humidity = data.get('humidity')
    if humidity is None:
        humidity = default_humidity
    else:
        try:
            humidity = float(humidity)
        except ValueError:
            humidity = default_humidity
            
    packaging = data.get('packaging', 'Open')
    
    try:
        freshness_score = int(data.get('freshnessScore', 7))
        freshness_score = max(1, min(10, freshness_score))
    except (ValueError, TypeError):
        freshness_score = 7

    donation_date_str = data.get('donationDate', datetime.utcnow().isoformat())
    try:
        donation_date = datetime.fromisoformat(donation_date_str.replace('Z', '+00:00'))
    except Exception:
        donation_date = datetime.utcnow()

    # 2) Inference - ML Pipeline vs Rule-Engine Fallback
    features_df = pd.DataFrame([{
        'Category': category,
        'Storage Method': storage_method,
        'Temperature': temperature,
        'Humidity': humidity,
        'Packaging': packaging,
        'Freshness Score': freshness_score
    }])

    predicted_days = 0.0
    confidence = 0.85
    is_simulated = True

    if model_pipeline is not None:
        try:
            predicted_days = float(model_pipeline.predict(features_df)[0])
            
            # Extract pipeline pieces for confidence calculation
            preprocessor = model_pipeline.named_steps['preprocessor']
            regressor = model_pipeline.named_steps['regressor']
            confidence = calculate_confidence(preprocessor, regressor, features_df, predicted_days)
            is_simulated = False
        except Exception as e:
            print(f"Inference error, running rule fallback: {e}")

    if is_simulated:
        # Fallback Heuristics
        base_days = {'Meat': 2, 'Dairy': 5, 'Vegetable': 5, 'Fruit': 6, 'Bakery': 3, 'Cooked Food': 4, 'Beverage': 10}.get(category, 4)
        storage_mult = {'Freezer': 15, 'Refrigerator': 3.5, 'Room Temperature': 1}.get(storage_method, 1)
        pack_mult = {'Vacuum Packed': 2.0, 'Sealed': 1.3, 'Open': 1.0}.get(packaging, 1)
        fresh_mult = freshness_score / 6.0
        predicted_days = base_days * storage_mult * pack_mult * fresh_mult
        confidence = 0.70

    # Minimum limit check
    predicted_days = max(0.5, round(predicted_days, 1))

    # 3) Derive outputs
    estimated_expiry_date = donation_date + timedelta(days=predicted_days)
    freshness_percentage = int(freshness_score * 10)
    
    # Calculate Spoilage Risk
    if predicted_days <= 1.5:
        spoilage_risk = 'High'
    elif predicted_days <= 4.0:
        spoilage_risk = 'Medium'
    else:
        spoilage_risk = 'Low'

    # Determine Recommendation
    if spoilage_risk == 'High':
        recommendation = 'Discard'
    elif predicted_days <= 2.0:
        recommendation = 'Consume Immediately'
    elif predicted_days <= 4.0:
        recommendation = 'Donate Within 24 Hours'
    else:
        recommendation = 'Safe to Donate'

    return jsonify({
        'status': 'success',
        'isMock': is_simulated,
        'data': {
            'predictedShelfLifeDays': predicted_days,
            'estimatedExpiryDate': estimated_expiry_date.isoformat(),
            'freshnessPercentage': freshness_percentage,
            'spoilageRisk': spoilage_risk,
            'recommendation': recommendation,
            'confidenceScore': confidence
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
