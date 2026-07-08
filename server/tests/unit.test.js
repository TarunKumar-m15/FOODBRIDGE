import test from 'node:test';
import assert from 'node:assert';

import { classifyFoodImage, predictShelfLifeJS } from '../services/aiPredictor.js';
import { calculateHaversineDistance } from '../services/mapsService.js';
import { verifyQRCodeSecret } from '../services/qrService.js';

test('AI Predictor Service Tests', async (t) => {
  await t.test('classifyFoodImage categorizes keywords correctly', () => {
    const res1 = classifyFoodImage('fresh apple salad');
    assert.strictEqual(res1.classification, 'veg');
    assert.ok(res1.confidence > 0.9);

    const res2 = classifyFoodImage('roasted beef steaks');
    assert.strictEqual(res2.classification, 'non-veg');
  });

  await t.test('predictShelfLifeJS calculates expected ranges', () => {
    const prediction = predictShelfLifeJS({
      category: 'Meat',
      storageMethod: 'Refrigerator',
      freshnessScore: 8,
      packagingType: 'Sealed',
    });

    assert.ok(prediction.predictedShelfLifeDays > 0);
    assert.strictEqual(prediction.spoilageRisk, 'Low');
    assert.strictEqual(prediction.recommendation, 'Safe to Donate');
  });
});

test('Geospatial Maps Service Tests', () => {
  // Distance from SF center to nearby point
  const sfCenter = [ -122.4194, 37.7749 ];
  const sfNearby = [ -122.4094, 37.7649 ];
  
  const distance = calculateHaversineDistance(sfCenter, sfNearby);
  assert.ok(distance > 0);
  assert.ok(distance < 5); // Should be less than 5km
});

test('QR Code Verification Tests', () => {
  const secret = 'test-token-12345';
  assert.strictEqual(verifyQRCodeSecret('test-token-12345', secret), true);
  assert.strictEqual(verifyQRCodeSecret('wrong-token', secret), false);
});
