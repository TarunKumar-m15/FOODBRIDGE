/**
 * AI Module Service
 * Simulates machine learning inference pipeline for image classification,
 * shelf-life estimation, and demand tracking.
 */

/**
 * Classifies food item type based on image file names or descriptions
 * @param {string} textContext - E.g. "Chicken Lasagna", "Fresh apples"
 * @returns {Object} { classification: string, confidence: number }
 */
export const classifyFoodImage = (textContext = '') => {
  const text = textContext.toLowerCase();

  let classification = 'mixed';
  let confidence = 0.88;

  if (text.includes('apple') || text.includes('banana') || text.includes('salad') || text.includes('vegetable') || text.includes('fruit')) {
    classification = 'veg';
    confidence = 0.95;
  } else if (text.includes('chicken') || text.includes('beef') || text.includes('pork') || text.includes('meat') || text.includes('fish')) {
    classification = 'non-veg';
    confidence = 0.92;
  } else if (text.includes('vegan') || text.includes('tofu')) {
    classification = 'vegan';
    confidence = 0.97;
  }

  return { classification, confidence };
};

/**
 * Predicts shelf-life in hours based on food type, cook time, and mock temperature settings
 * @param {string} foodType - 'veg', 'non-veg', 'vegan', 'mixed'
 * @param {Date} cookedAt
 * @param {number} ambientTemperatureCelsius - defaults to 25
 * @returns {number} estimated remaining shelf-life hours
 */
export const predictShelfLifeHours = (foodType, cookedAt, ambientTemperatureCelsius = 25) => {
  // Base shelf lives (hours) under standard 20C temperature
  let baseShelfLife = 24;

  switch (foodType) {
    case 'non-veg':
      baseShelfLife = 12;
      break;
    case 'vegan':
      baseShelfLife = 36;
      break;
    case 'veg':
      baseShelfLife = 24;
      break;
    default:
      baseShelfLife = 18;
  }

  const cookedDate = new Date(cookedAt);
  const hoursSinceCooked = (new Date() - cookedDate) / (1000 * 60 * 60);

  // Temperature acceleration coefficient (Arrhenius-like multiplier)
  // Higher temp reduces remaining shelf-life faster
  const tempFactor = ambientTemperatureCelsius > 25 ? (ambientTemperatureCelsius - 25) * 0.1 : 0;
  const remainingLife = Math.max(0, baseShelfLife * (1 - tempFactor) - hoursSinceCooked);

  return Math.round(remainingLife * 10) / 10;
};

/**
 * Detects if food is highly likely to be spoiled
 * @param {number} predictedShelfLife - remaining shelf-life hours
 * @returns {boolean}
 */
export const detectSpoilage = (predictedShelfLife) => {
  return predictedShelfLife <= 2.0; // Spoilage danger threshold set at 2 hours remaining
};

/**
 * Predicts food demand intensity for a specific location based on active matching indexes
 * @param {Array<Number>} coordinates - [longitude, latitude]
 * @param {number} radiusKm - search query boundary
 * @returns {string} demandLevel - 'HIGH', 'MEDIUM', 'LOW'
 */
export const predictDemandLevel = (coordinates, radiusKm = 5) => {
  // Simulates forecasting using geospatial density variables
  const [lng, lat] = coordinates;
  const factor = Math.abs(lng + lat) % 1;

  if (factor > 0.6) return 'HIGH';
  if (factor > 0.3) return 'MEDIUM';
  return 'LOW';
};

/**
 * Javascript Fallback Rule Engine for Shelf Life Prediction
 * Matches the output interface of the Python Random Forest model
 */
export const predictShelfLifeJS = (features = {}) => {
  const category = features.category || 'Cooked Food';
  const storageMethod = features.storageMethod || 'Room Temperature';
  const freshnessScore = parseInt(features.freshnessScore || 7);
  const packagingType = features.packagingType || 'Open';
  const donationDate = features.donationDate ? new Date(features.donationDate) : new Date();

  // Base shelf lives (Days)
  const baseDays = {
    'Meat': 2,
    'Dairy': 5,
    'Vegetable': 5,
    'Fruit': 6,
    'Bakery': 3,
    'Cooked Food': 4,
    'Beverage': 10
  }[category] || 4;

  // Storage method multiplier
  const storageMult = {
    'Freezer': 15,
    'Refrigerator': 3.5,
    'Room Temperature': 1
  }[storageMethod] || 1;

  // Packaging type multiplier
  const packMult = {
    'Vacuum Packed': 2.0,
    'Sealed': 1.3,
    'Open': 1.0
  }[packagingType] || 1.0;

  // Freshness score multiplier
  const freshMult = freshnessScore / 6.0;

  // Calculate predicted days
  const resolvedFreshMult = isNaN(freshMult) ? 1.0 : freshMult;
  let predictedDays = baseDays * storageMult * packMult * resolvedFreshMult;
  predictedDays = Math.max(0.5, Math.round(predictedDays * 10) / 10);

  // Expiry Date
  const expiryDate = new Date(donationDate.getTime() + predictedDays * 24 * 60 * 60 * 1000);

  // Freshness Percentage
  const freshnessPercentage = freshnessScore * 10;

  // Spoilage Risk
  let spoilageRisk = 'Low';
  if (predictedDays <= 1.5) {
    spoilageRisk = 'High';
  } else if (predictedDays <= 4.0) {
    spoilageRisk = 'Medium';
  }

  // Recommendation
  let recommendation = 'Safe to Donate';
  if (spoilageRisk === 'High') {
    recommendation = 'Discard';
  } else if (predictedDays <= 2.0) {
    recommendation = 'Consume Immediately';
  } else if (predictedDays <= 4.0) {
    recommendation = 'Donate Within 24 Hours';
  }

  return {
    predictedShelfLifeDays: predictedDays,
    estimatedExpiryDate: expiryDate.toISOString(),
    freshnessPercentage,
    spoilageRisk,
    recommendation,
    confidenceScore: 0.70
  };
};
