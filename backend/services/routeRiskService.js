const { getRouteAlternatives, reverseGeocode, haversineDistanceKm } = require('./routingService');
const { predictRisk } = require('./mlClient');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDayName(date) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
}

function classifyRisk(score) {
  if (score < 0.33) return 'Low Risk';
  if (score < 0.66) return 'Moderate Risk';
  return 'High Risk';
}

function buildPrototypeDefaults() {
  return {
    city: 'Mumbai',
    state: 'Maharashtra',
    road_type: 'urban',
    weather: 'clear',
    visibility: 5.4,
    traffic_density: 'medium',
    cause: 'weather',
    temperature: 29,
  };
}

async function getRouteContext(point) {
  const defaults = buildPrototypeDefaults();

  try {
    const reverse = await reverseGeocode(point.lat, point.lng);
    if (reverse && reverse.address) {
      return {
        city: reverse.address.city || reverse.address.town || reverse.address.village || defaults.city,
        state: reverse.address.state || reverse.address.state_district || defaults.state,
        road_type: 'urban',
        weather: defaults.weather,
        visibility: defaults.visibility,
        traffic_density: defaults.traffic_density,
        cause: defaults.cause,
        temperature: defaults.temperature,
        source: 'real-geocoder',
      };
    }
  } catch (error) {
    // fall through to safe prototype defaults below
  }

  return {
    ...defaults,
    source: 'prototype-defaults',
  };
}

function buildSegments(geometry, maxSegments = 8) {
  if (!Array.isArray(geometry) || geometry.length < 2) {
    return [{ point: { lat: geometry[0][0], lng: geometry[0][1] }, distance: 0.2 }];
  }

  const sampledPoints = [];
  const totalDistance = geometry.slice(1).reduce((sum, current, index) => {
    const previous = geometry[index];
    return sum + haversineDistanceKm({ lat: previous[0], lng: previous[1] }, { lat: current[0], lng: current[1] });
  }, 0);

  const segmentTarget = Math.min(Math.max(5, Math.round(totalDistance / 1.5)), maxSegments);
  const bucketSize = totalDistance / segmentTarget;

  for (let i = 0; i < segmentTarget; i += 1) {
    const targetDistance = (i + 1) * bucketSize;
    let cumulative = 0;
    let selected = geometry[0];

    for (let j = 1; j < geometry.length; j += 1) {
      const previous = geometry[j - 1];
      const current = geometry[j];
      const segmentDistance = haversineDistanceKm(
        { lat: previous[0], lng: previous[1] },
        { lat: current[0], lng: current[1] },
      );

      if (cumulative + segmentDistance >= targetDistance) {
        const ratio = segmentDistance === 0 ? 0 : (targetDistance - cumulative) / segmentDistance;
        selected = [
          previous[0] + (current[0] - previous[0]) * ratio,
          previous[1] + (current[1] - previous[1]) * ratio,
        ];
        break;
      }

      cumulative += segmentDistance;
      selected = current;
    }

    sampledPoints.push({
      point: { lat: selected[0], lng: selected[1] },
      distance: Number((bucketSize / 1.2).toFixed(2)),
    });
  }

  return sampledPoints;
}

function buildMlFeature(point, context, routeMeta = {}) {
  const now = new Date();
  const defaultWeather = context.weather || 'clear';

  return {
    city: context.city || 'Mumbai',
    state: context.state || 'Maharashtra',
    latitude: Number(point.lat),
    longitude: Number(point.lng),
    road_type: context.road_type || routeMeta.roadType || 'urban',
    weather: defaultWeather,
    visibility: Number(context.visibility ?? 5.4),
    traffic_density: context.traffic_density || routeMeta.trafficDensity || 'medium',
    cause: context.cause || 'weather',
    hour: Number(routeMeta.hour ?? now.getHours()),
    day_of_week: routeMeta.dayOfWeek || getDayName(now),
    is_weekend: Boolean(routeMeta.isWeekend ?? [0, 6].includes(now.getDay())),
    is_peak_hour: Boolean(routeMeta.isPeakHour ?? [7, 8, 9, 17, 18, 19].includes(now.getHours())),
    vehicles_involved: Number(routeMeta.vehiclesInvolved ?? 2),
    casualties: Number(routeMeta.casualties ?? 1),
    temperature: Number(context.temperature ?? 29),
    month: Number(routeMeta.month ?? now.getMonth() + 1),
    year: Number(routeMeta.year ?? now.getFullYear()),
  };
}

function estimateFallbackRisk(route) {
  const durationFactor = (route.duration || 20) / 60;
  const distanceFactor = (route.distance || 8) / 12;
  const baseRisk = 0.22 + durationFactor * 0.12 + distanceFactor * 0.18;
  return clamp(baseRisk, 0.14, 0.88);
}

function buildExplanation(route, bestRiskRoute) {
  const explanations = [];

  if (route.recommended) {
    explanations.push('Lower predicted accident risk');
  }

  if (route.risk_score <= 0.45) {
    explanations.push('Lower traffic risk profile');
  }

  if (route.segments && route.segments.some((segment) => segment.risk_score < 0.5)) {
    explanations.push('More stable segment conditions');
  }

  if (!explanations.length) {
    explanations.push('Predicted safety is comparable to the other route options');
  }

  if (bestRiskRoute && route.id !== bestRiskRoute.id && route.risk_score > bestRiskRoute.risk_score) {
    explanations.push('Higher cumulative risk than the recommended alternative');
  }

  return explanations;
}

async function scoreRoute(route, comparisonContext = {}) {
  const segments = buildSegments(route.geometry, 8);
  const segmentResults = [];
  let weightedRisk = 0;
  let totalDistance = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const context = await getRouteContext(segment.point);
    const features = buildMlFeature(segment.point, context, {
      hour: new Date().getHours(),
      dayOfWeek: getDayName(new Date()),
      isWeekend: [0, 6].includes(new Date().getDay()),
      isPeakHour: [7, 8, 9, 17, 18, 19].includes(new Date().getHours()),
      vehiclesInvolved: 2,
      casualties: 1,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });

    let riskScore = 0;
    let source = 'prototype-estimate';

    try {
      const prediction = await predictRisk(features);
      riskScore = Number(prediction.risk_score);
      source = 'ml-service';
    } catch (error) {
      riskScore = estimateFallbackRisk(route);
    }

    const segmentDistance = Number(segment.distance || 0.4);
    weightedRisk += riskScore * segmentDistance;
    totalDistance += segmentDistance;

    segmentResults.push({
      index: index + 1,
      distance: segmentDistance,
      risk_score: Number(riskScore.toFixed(4)),
      risk_category: classifyRisk(riskScore),
      source,
      point: segment.point,
    });
  }

  const aggregateRisk = totalDistance > 0 ? weightedRisk / totalDistance : estimateFallbackRisk(route);
  const category = classifyRisk(aggregateRisk);

  return {
    id: route.id,
    title: route.label || route.id,
    geometry: route.geometry,
    distance: Number(route.distance || 0),
    duration: Number(route.duration || 0),
    risk_score: Number(aggregateRisk.toFixed(4)),
    risk_category: category,
    recommended: false,
    prototype: Boolean(route.fallback),
    source: route.source || 'prototype-fallback',
    fallback: Boolean(route.fallback),
    segments: segmentResults,
    explanation: [],
  };
}

async function scoreRouteAlternatives(startInput, destinationInput) {
  const routeData = await getRouteAlternatives(startInput, destinationInput);
  if (!routeData.success) {
    return {
      success: false,
      routes: [],
      message: routeData.error || 'Unable to calculate routes for these inputs.',
    };
  }

  const scoredRoutes = await Promise.all(
    routeData.routes.map(async (route) => scoreRoute(route, { startInput, destinationInput })),
  );

  if (!scoredRoutes.length) {
    return {
      success: false,
      routes: [],
      message: 'No route alternatives could be generated.',
    };
  }

  const fastestRoute = scoredRoutes.reduce((best, current) => (current.duration < best.duration ? current : best));
  const recommendedRoute = scoredRoutes.reduce((best, current) =>
    current.risk_score < best.risk_score ? current : best,
  );

  const rankedRoutes = scoredRoutes.map((route) => {
    const explanation = buildExplanation(route, recommendedRoute);
    return {
      ...route,
      recommended: route.id === recommendedRoute.id,
      fastest: route.id === fastestRoute.id,
      explanation,
    };
  });

  return {
    success: true,
    source: routeData.source,
    fallback: false,
    status: 'Live route data',
    recommendedRouteId: recommendedRoute.id,
    fastestRouteId: fastestRoute.id,
    start: routeData.start,
    destination: routeData.destination,
    routes: rankedRoutes,
    reason: 'Route alternatives prepared successfully.',
  };
}

module.exports = { scoreRouteAlternatives };
