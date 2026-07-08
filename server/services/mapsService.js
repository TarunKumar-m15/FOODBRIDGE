import axios from 'axios';

// Haversine formula to compute distance in km
export const calculateHaversineDistance = (coords1, coords2) => {
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Calculates distance and estimated duration between origin and destination
 * Falls back to Haversine calculations if mock key or API failure
 */
export const getDistanceMatrix = async (origin, destination) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'mock_google_maps_key') {
    // Math-based simulation: 1 km takes ~3 minutes by motor vehicle
    const distanceKm = calculateHaversineDistance(origin, destination);
    const durationMinutes = Math.round(distanceKm * 3);
    return {
      distance: { text: `${distanceKm.toFixed(1)} km`, value: Math.round(distanceKm * 1000) },
      duration: { text: `${durationMinutes} mins`, value: durationMinutes * 60 },
      isMock: true,
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin[1]},${origin[0]}&destinations=${destination[1]},${destination[0]}&key=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance,
        duration: element.duration,
        isMock: false,
      };
    }
    throw new Error('Invalid response from Google Maps Matrix API');
  } catch (error) {
    // Fail-safe to local math computation
    const distanceKm = calculateHaversineDistance(origin, destination);
    const durationMinutes = Math.round(distanceKm * 3);
    return {
      distance: { text: `${distanceKm.toFixed(1)} km`, value: Math.round(distanceKm * 1000) },
      duration: { text: `${durationMinutes} mins`, value: durationMinutes * 60 },
      isMock: true,
      error: error.message,
    };
  }
};

/**
 * Greedy Traveling Salesperson (TSP) route optimization
 * Sorts waypoints by nearest-neighbor distance starting from the initial location
 * @param {Array<Number>} startCoords - [longitude, latitude]
 * @param {Array<Object>} waypoints - Array of objects with coordinate fields { _id, coordinates: [lng, lat] }
 * @returns {Array<Object>} Optimized ordered list of waypoints
 */
export const optimizeRouteWaypoints = (startCoords, waypoints) => {
  if (waypoints.length <= 1) return waypoints;

  const remaining = [...waypoints];
  const optimized = [];
  let currentCoords = startCoords;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let shortestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateHaversineDistance(currentCoords, remaining[i].coordinates);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestIndex = i;
      }
    }

    const nextNode = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nextNode);
    currentCoords = nextNode.coordinates;
  }

  return optimized;
};
