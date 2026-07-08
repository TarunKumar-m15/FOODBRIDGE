import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

def train_shelf_life_model():
    dataset_path = 'data/spoilage_records.csv'
    if not os.path.exists(dataset_path):
        print("❌ Dataset not found. Generating default dataset first...")
        from generate_dataset import generate_spoilage_dataset
        generate_spoilage_dataset()
        
    df = pd.read_csv(dataset_path)
    
    # Define features and label
    X = df[['Category', 'Storage Method', 'Temperature', 'Humidity', 'Packaging', 'Freshness Score']]
    y = df['Shelf Life Days']
    
    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Preprocessing pipelines for both numerical and categorical data
    numerical_cols = ['Temperature', 'Humidity', 'Freshness Score']
    categorical_cols = ['Category', 'Storage Method', 'Packaging']
    
    numerical_transformer = StandardScaler()
    categorical_transformer = OneHotEncoder(handle_unknown='ignore')
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, numerical_cols),
            ('cat', categorical_transformer, categorical_cols)
        ]
    )
    
    # Define model pipeline
    model_pipeline = Pipeline(
        steps=[
            ('preprocessor', preprocessor),
            ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
        ]
    )
    
    # Train model
    print("Training Random Forest Regressor model...")
    model_pipeline.fit(X_train, y_train)
    
    # Evaluate model
    predictions = model_pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print("\n--- Model Training & Evaluation Metrics ---")
    print(f"✓ Mean Absolute Error (MAE): {mae:.2f} Days")
    print(f"✓ R-squared (R2) Score:      {r2:.4f}")
    print("-------------------------------------------\n")
    
    # Save/Dump model pipeline
    joblib.dump(model_pipeline, 'shelf_life_model.joblib')
    print("✓ Model pipeline successfully exported: shelf_life_model.joblib")

if __name__ == '__main__':
    train_shelf_life_model()
