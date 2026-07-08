import os
import pandas as pd
import numpy as np

# Seed for reproducibility
np.random.seed(42)

def generate_spoilage_dataset(num_records=1000):
    categories = ['Vegetable', 'Fruit', 'Dairy', 'Bakery', 'Cooked Food', 'Meat', 'Beverage']
    storage_methods = ['Room Temperature', 'Refrigerator', 'Freezer']
    packaging_types = ['Open', 'Sealed', 'Vacuum Packed']
    
    # Food names map
    food_names_map = {
        'Vegetable': ['Spinach', 'Tomato', 'Carrot', 'Lettuce', 'Potato'],
        'Fruit': ['Apple', 'Banana', 'Orange', 'Strawberry', 'Grapes'],
        'Dairy': ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream'],
        'Bakery': ['Bread', 'Croissant', 'Muffin', 'Cake', 'Bagel'],
        'Cooked Food': ['Pasta', 'Rice Pilaf', 'Chicken Curry', 'Lentil Soup', 'Lasagna'],
        'Meat': ['Beef Steak', 'Chicken Breast', 'Pork Chops', 'Minced Meat', 'Fish Fillet'],
        'Beverage': ['Fruit Juice', 'Soda', 'Iced Tea', 'Milkshake', 'Coconut Water']
    }

    records = []
    
    for _ in range(num_records):
        cat = np.random.choice(categories)
        name = np.random.choice(food_names_map[cat])
        
        # Decide storage method logically based on category
        if cat in ['Meat', 'Dairy']:
            storage = np.random.choice(['Refrigerator', 'Freezer'], p=[0.7, 0.3])
        elif cat == 'Cooked Food':
            storage = np.random.choice(['Refrigerator', 'Room Temperature'], p=[0.8, 0.2])
        else:
            storage = np.random.choice(storage_methods)
            
        # Assign temperature based on storage method
        if storage == 'Freezer':
            temp = np.random.uniform(-20, -10)
            humidity = np.random.uniform(30, 50)
        elif storage == 'Refrigerator':
            temp = np.random.uniform(1, 5)
            humidity = np.random.uniform(70, 90)
        else: # Room Temp
            temp = np.random.uniform(18, 30)
            humidity = np.random.uniform(40, 60)
            
        packaging = np.random.choice(packaging_types)
        freshness_score = np.random.randint(1, 11) # 1 to 10
        
        # --- Logical Shelf Life Estimation Formula ---
        # Base days by category
        base_days = {
            'Vegetable': 5,
            'Fruit': 6,
            'Dairy': 7,
            'Bakery': 3,
            'Cooked Food': 4,
            'Meat': 2,
            'Beverage': 10
        }[cat]
        
        # Storage method multipliers
        storage_mult = 1.0
        if storage == 'Refrigerator':
            storage_mult = 3.0
        elif storage == 'Freezer':
            storage_mult = 20.0
            
        # Packaging multipliers
        pack_mult = 1.0
        if packaging == 'Sealed':
            pack_mult = 1.5
        elif packaging == 'Vacuum Packed':
            pack_mult = 2.5
            
        # Freshness multiplier (higher freshness = longer life)
        fresh_mult = freshness_score / 5.0 # scale factor
        
        # Temperature penalty (higher temp reduces shelf life)
        temp_penalty = 1.0
        if storage == 'Room Temperature' and temp > 25:
            temp_penalty = 0.7
            
        # Calculate Target Days
        shelf_life_days = base_days * storage_mult * pack_mult * fresh_mult * temp_penalty
        
        # Add random noise
        shelf_life_days += np.random.normal(0, shelf_life_days * 0.1)
        shelf_life_days = max(0.5, round(shelf_life_days, 1)) // 1 # Minimum 0.5 days, floor/rounded
        
        records.append({
            'Food Name': name,
            'Category': cat,
            'Storage Method': storage,
            'Temperature': round(temp, 1),
            'Humidity': round(humidity, 1),
            'Packaging': packaging,
            'Freshness Score': freshness_score,
            'Shelf Life Days': shelf_life_days
        })
        
    df = pd.DataFrame(records)
    
    # Ensure data folder exists
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/spoilage_records.csv', index=False)
    print(f"✓ Synthetic dataset successfully generated: data/spoilage_records.csv ({num_records} rows)")

if __name__ == '__main__':
    generate_spoilage_dataset()
