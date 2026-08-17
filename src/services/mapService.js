let isTomTomDisabled = false;

export function getMapTileConfig() {
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
  if (apiKey) {
    return {
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`,
      fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 20,
    };
  }
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  };
}

export const mapConfig = {
  defaultZoom: 14,
  defaultCenter: [19.076, 72.8777],
  get tileLayerUrl() {
    return getMapTileConfig().url;
  },
  get tileLayerAttribution() {
    return getMapTileConfig().attribution;
  },
};

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function extractItemDetails(item) {
  if (item.source === 'nominatim') {
    return {
      placeName: item.placeName || 'Location',
      locality: item.locality || '',
      city: item.city || '',
      state: item.state || '',
      country: item.country || 'India',
      lat: Number(item.lat),
      lon: Number(item.lon),
      raw: item,
    };
  }

  if (item.source === 'tomtom' || item.poi || item.address?.freeformAddress) {
    const poiName = item.poi?.name;
    const freeform = item.address?.freeformAddress || '';
    const street = item.address?.streetName || '';

    const placeName = poiName || freeform.split(',')[0] || street || 'Location';
    const locality = item.address?.municipalitySubdivision || item.address?.neighborhood || '';
    const city = item.address?.municipality || item.address?.city || item.address?.countrySecondarySubdivision || '';
    const state = item.address?.countrySubdivision || item.address?.state || '';
    const country = item.address?.country || 'India';
    const lat = Number(item.position?.lat ?? item.lat);
    const lon = Number(item.position?.lon ?? item.lon);

    return { placeName, locality, city, state, country, lat, lon, raw: item };
  }

  // Geoapify structure
  const props = item?.properties || item || {};
  const placeName = props.name || props.address_line1 || props.street || props.formatted?.split(',')[0] || 'Location';
  const locality = props.suburb || props.neighbourhood || props.district || props.quarter || props.residential || '';
  const city = props.city || props.municipality || props.county || props.town || props.village || '';
  const state = props.state || props.state_code || '';
  const country = props.country || 'India';
  const lat = Number(props.lat ?? item?.lat ?? NaN);
  const lon = Number(props.lon ?? item?.lon ?? NaN);

  return { placeName, locality, city, state, country, lat, lon, raw: item };
}

function calculateRelevanceScore(details, query, userLoc) {
  let score = 100;
  const qLower = query.toLowerCase();
  const qTokens = qLower.split(/[\s,]+/).filter((t) => t.length > 1);

  const fullText = [
    details.placeName,
    details.locality,
    details.city,
    details.state,
    details.country,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  qTokens.forEach((token) => {
    if (fullText.includes(token)) {
      score += 40;
    }
    if (details.locality.toLowerCase().includes(token) || details.city.toLowerCase().includes(token)) {
      score += 120;
    }
  });

  const stateLower = (details.state || '').toLowerCase();
  if (stateLower.includes('maharashtra') || stateLower.includes('mh')) {
    score += 180;
  } else if (!qLower.includes(stateLower)) {
    score -= 250;
  }

  if (userLoc && Number.isFinite(userLoc.latitude) && Number.isFinite(userLoc.longitude) && Number.isFinite(details.lat) && Number.isFinite(details.lon)) {
    const distKm = haversineDistanceKm(userLoc.latitude, userLoc.longitude, details.lat, details.lon);
    if (distKm <= 15) {
      score += 250;
    } else if (distKm <= 50) {
      score += 150;
    } else if (distKm <= 150) {
      score += 50;
    } else if (distKm > 400) {
      score -= 300;
    }
  }

  return score;
}

function formatSuggestion(details) {
  const primaryTitle = details.placeName || 'Location';

  // Address Hierarchy: Locality -> City -> State -> Country
  const rawParts = [
    details.locality,
    details.city,
    details.state,
    details.country || 'India',
  ];

  const cleanParts = [];
  const seenLower = new Set();
  const titleLower = primaryTitle.toLowerCase().trim();

  for (const part of rawParts) {
    if (!part || typeof part !== 'string') continue;
    const trimmed = part.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (seenLower.has(lower)) continue;
    if (lower === titleLower) continue;

    seenLower.add(lower);
    cleanParts.push(trimmed);
  }

  const subtitle = cleanParts.join(', ');

  return {
    title: primaryTitle,
    subtitle: subtitle,
    lat: details.lat,
    lon: details.lon,
    display_name: `${primaryTitle}${subtitle ? ', ' + subtitle : ''}`,
  };
}

export async function searchLocationSuggestions(query, userLoc = null) {
  const cleanedQuery = String(query || '').trim();
  if (cleanedQuery.length < 2) {
    return { suggestions: [], message: '' };
  }

  const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;
  const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

  let rawItems = [];

  // 1. Attempt TomTom Search API if key exists and TomTom has not returned 401/403 errors
  if (tomtomKey && !isTomTomDisabled) {
    try {
      const url = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(cleanedQuery)}.json`);
      url.searchParams.set('key', tomtomKey);
      url.searchParams.set('typeahead', 'true');
      url.searchParams.set('countrySet', 'IN');
      url.searchParams.set('limit', '10');

      if (userLoc && Number.isFinite(userLoc.latitude) && Number.isFinite(userLoc.longitude)) {
        url.searchParams.set('lat', String(userLoc.latitude));
        url.searchParams.set('lon', String(userLoc.longitude));
      }

      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          rawItems = data.results.map((r) => ({ ...r, source: 'tomtom' }));
        }
      } else if (response.status === 401 || response.status === 403 || response.status === 429) {
        // Disable TomTom for remainder of session upon authorization failure
        isTomTomDisabled = true;
      }
    } catch (err) {
      isTomTomDisabled = true;
    }
  }

  // 2. Fallback / supplementary Geoapify search
  if (rawItems.length === 0 && geoapifyKey) {
    try {
      const geoUrl = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
      geoUrl.searchParams.set('text', cleanedQuery);
      geoUrl.searchParams.set('format', 'json');
      geoUrl.searchParams.set('limit', '10');
      geoUrl.searchParams.set('filter', 'countrycode:in');
      geoUrl.searchParams.set('apiKey', geoapifyKey);

      if (userLoc && Number.isFinite(userLoc.latitude) && Number.isFinite(userLoc.longitude)) {
        geoUrl.searchParams.set('bias', `proximity:${userLoc.longitude},${userLoc.latitude}`);
      }

      const geoResponse = await fetch(geoUrl, { headers: { Accept: 'application/json' } });
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        const items = Array.isArray(geoData?.results)
          ? geoData.results
          : Array.isArray(geoData?.features)
          ? geoData.features
          : [];
        rawItems = items.map((g) => ({ ...g, source: 'geoapify' }));
      }
    } catch (geoErr) {
      // Graceful error handle
    }
  }

  // 3. Fallback to Nominatim OpenStreetMap if TomTom and Geoapify yield no results
  if (rawItems.length === 0) {
    try {
      const nomUrl = new URL('https://nominatim.openstreetmap.org/search');
      nomUrl.searchParams.set('q', cleanedQuery);
      nomUrl.searchParams.set('format', 'json');
      nomUrl.searchParams.set('countrycodes', 'in');
      nomUrl.searchParams.set('limit', '10');

      const nomResponse = await fetch(nomUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SaarthiWomenSafetyApp/1.0',
        },
      });

      if (nomResponse.ok) {
        const nomData = await nomResponse.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          rawItems = nomData.map((n) => ({
            placeName: n.display_name?.split(',')[0] || n.name || 'Location',
            locality: n.address?.suburb || n.address?.neighbourhood || '',
            city: n.address?.city || n.address?.town || n.address?.municipality || '',
            state: n.address?.state || '',
            country: n.address?.country || 'India',
            lat: parseFloat(n.lat),
            lon: parseFloat(n.lon),
            source: 'nominatim',
          }));
        }
      }
    } catch (nomErr) {
      // Graceful error handle
    }
  }

  if (rawItems.length === 0) {
    return { suggestions: [], message: 'No matching locations found.' };
  }

  // Extract, score, and rank items deterministically
  const scoredItems = rawItems
    .map((item) => {
      const details = extractItemDetails(item);
      const score = calculateRelevanceScore(details, cleanedQuery, userLoc);
      return { details, score };
    })
    .filter((item) => Number.isFinite(item.details.lat) && Number.isFinite(item.details.lon));

  scoredItems.sort((a, b) => b.score - a.score);

  const topSuggestions = scoredItems
    .slice(0, 5)
    .map((item) => formatSuggestion(item.details));

  if (topSuggestions.length === 0) {
    return { suggestions: [], message: 'No matching locations found.' };
  }

  return { suggestions: topSuggestions, message: '' };
}
