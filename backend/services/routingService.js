const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const OSRM_BASE_URL = 'https://router.project-osrm.org';
let lastNominatimRequestAt = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function waitForNominatimRateLimit() {
  const now = Date.now();
  const elapsed = now - lastNominatimRequestAt;
  if (elapsed < 1000) {
    const waitMs = 1000 - elapsed;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastNominatimRequestAt = Date.now();
}

function haversineDistanceKm(pointA, pointB) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLng = toRadians(pointB.lng - pointA.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function buildNominatimHeaders() {
  const email = process.env.NOMINATIM_EMAIL || 'your-email@example.com';
  return {
    Accept: 'application/json',
    'Accept-Language': 'en',
    'User-Agent': `Saarthi-Smart-Safety-Platform/1.0 (contact: ${email})`,
  };
}

async function geocodeLocation(query) {
  const cleanedQuery = String(query || '').trim();
  if (!cleanedQuery) {
    throw new Error('Please provide a valid start or destination.');
  }

  const isCoordinatePair = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(cleanedQuery);
  if (isCoordinatePair) {
    const [rawLat, rawLng] = cleanedQuery.split(',').map((value) => Number.parseFloat(value.trim()));
    if (!Number.isNaN(rawLat) && !Number.isNaN(rawLng)) {
      return {
        lat: clamp(rawLat, -90, 90),
        lon: clamp(rawLng, -180, 180),
        display_name: `${rawLat}, ${rawLng}`,
      };
    }
  }

  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('q', cleanedQuery);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'in');

  try {
    await waitForNominatimRateLimit();
    console.log('[Nominatim] request URL:', url.toString());

    const response = await fetch(url, {
      method: 'GET',
      headers: buildNominatimHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    console.log('[Nominatim] response status:', response.status);

    if (!response.ok) {
      const body = await response.text();
      console.log('[Nominatim] error body:', body);
      throw new Error(`Nominatim request failed with status ${response.status}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error(`No location matches were found for "${cleanedQuery}". Please enter a more specific address.`);
    }

    const [match] = results;
    return {
      lat: Number.parseFloat(match.lat),
      lon: Number.parseFloat(match.lon),
      display_name: match.display_name,
    };
  } catch (error) {
    if (error && error.name === 'TimeoutError') {
      throw new Error(`Location lookup timed out for "${cleanedQuery}". Please try again.`);
    }
    throw error;
  }
}

async function reverseGeocode(lat, lon) {
  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', '18');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildNominatimHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (!result || !result.address) {
      return null;
    }

    return {
      display_name: result.display_name,
      address: result.address,
    };
  } catch (error) {
    return null;
  }
}

async function getRouteAlternatives(startInput, destinationInput) {
  let start;
  let destination;

  try {
    start = await geocodeLocation(startInput);
  } catch (error) {
    return {
      success: false,
      error: error.message || `Unable to resolve the start location: "${startInput}". Please enter a valid location.`,
    };
  }

  try {
    destination = await geocodeLocation(destinationInput);
  } catch (error) {
    return {
      success: false,
      error: error.message || `Unable to resolve the destination: "${destinationInput}". Please enter a valid location.`,
    };
  }

  const routeUrl = new URL(`${OSRM_BASE_URL}/route/v1/driving/${start.lon},${start.lat};${destination.lon},${destination.lat}`);
  routeUrl.searchParams.set('alternatives', 'true');
  routeUrl.searchParams.set('geometries', 'geojson');
  routeUrl.searchParams.set('overview', 'full');
  routeUrl.searchParams.set('steps', 'false');

  try {
    const response = await fetch(routeUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`OSRM request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const routes = Array.isArray(payload.routes) ? payload.routes : [];

    if (!routes.length) {
      return {
        success: false,
        error: 'No routes were returned for these locations. Please try different start or destination points.',
      };
    }

    return {
      success: true,
      source: 'osrm',
      fallback: false,
      start,
      destination,
      routes: routes.map((route, index) => ({
        id: `route-${index + 1}`,
        label: index === 0 ? 'Fastest route' : `Alternative route ${index + 1}`,
        source: 'osrm',
        fallback: false,
        geometry: Array.isArray(route.geometry?.coordinates) ? route.geometry.coordinates.map(([lng, lat]) => [lat, lng]) : [],
        distance: Number((route.distance / 1000).toFixed(1)),
        duration: Math.max(5, Math.round(route.duration / 60)),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: 'Unable to calculate routes for these locations. Please check the inputs and try again.',
    };
  }
}

module.exports = {
  getRouteAlternatives,
  reverseGeocode,
  haversineDistanceKm,
};
