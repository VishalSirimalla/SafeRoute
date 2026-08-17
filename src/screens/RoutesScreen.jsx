import { Gauge, ShieldCheck, MapPin, Search, Compass, ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RouteMap from '../components/RouteMap';
import { planRoutes } from '../services/apiClient';
import { searchLocationSuggestions } from '../services/mapService';

function getToneFromRisk(riskScore) {
  if (typeof riskScore !== 'number') return 'success';
  if (riskScore < 0.33) return 'success';
  if (riskScore < 0.66) return 'warning';
  return 'danger';
}

function formatRiskScore(score) {
  if (typeof score !== 'number') return '0.00';
  return Number(score).toFixed(2);
}

function getRouteBadgeLabel(route) {
  if (route.recommended && route.fastest) return 'Fastest + Safest';
  if (route.recommended) return 'Recommended';
  if (route.fastest) return 'Fastest Route';
  return route.title || route.label || 'Alternative Route';
}

export default function RoutesScreen() {
  const navigate = useNavigate();
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [startLocationObj, setStartLocationObj] = useState(null);
  const [destLocationObj, setDestLocationObj] = useState(null);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [startMessage, setStartMessage] = useState('');
  const [destMessage, setDestMessage] = useState('');
  const [routes, setRoutes] = useState([]);
  const [mapPoints, setMapPoints] = useState({ start: null, destination: null });
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLoc, setUserLoc] = useState(null);

  // Acquire user GPS position for search proximity bias
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {},
        { timeout: 8000 }
      );
    }
  }, []);

  // Debounced search for Start input
  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = start.trim();
      if (!query || startLocationObj) {
        setStartSuggestions([]);
        setStartMessage('');
        setIsSearchingStart(false);
        return;
      }

      setIsSearchingStart(true);
      setStartMessage('Searching locations...');

      const results = await searchLocationSuggestions(query, userLoc);
      setStartSuggestions(results.suggestions || []);
      setStartMessage(results.message || (results.suggestions.length ? '' : 'No matching locations found.'));
      setIsSearchingStart(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [start, startLocationObj, userLoc]);

  // Debounced search for Destination input
  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = destination.trim();
      if (!query || destLocationObj) {
        setDestinationSuggestions([]);
        setDestMessage('');
        setIsSearchingDest(false);
        return;
      }

      setIsSearchingDest(true);
      setDestMessage('Searching locations...');

      const results = await searchLocationSuggestions(query, userLoc);
      setDestinationSuggestions(results.suggestions || []);
      setDestMessage(results.message || (results.suggestions.length ? '' : 'No matching locations found.'));
      setIsSearchingDest(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [destination, destLocationObj, userLoc]);

  const activeRoute = useMemo(
    () => routes.find((route) => route.id === selectedId) ?? routes[0] ?? null,
    [routes, selectedId],
  );

  const recommendedRoute = useMemo(
    () => routes.find((route) => route.recommended) ?? null,
    [routes],
  );

  const fastestRoute = useMemo(
    () => routes.find((route) => route.fastest) ?? null,
    [routes],
  );

  const highestRiskSegment = useMemo(() => {
    if (!activeRoute || !Array.isArray(activeRoute.segments) || activeRoute.segments.length === 0) {
      return null;
    }

    return activeRoute.segments.reduce((highest, segment) =>
      (Number(segment.risk_score) > Number(highest.risk_score) ? segment : highest),
      activeRoute.segments[0],
    );
  }, [activeRoute]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser. Please enter a location manually.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locObj = { label: 'My Current Location', lat: latitude, lon: longitude };
        setStart('My Current Location');
        setStartLocationObj(locObj);
        setStartSuggestions([]);
        setRoutes([]);
        setError('');
      },
      (err) => {
        let msg = 'We could not access your current location. Please enter a location manually.';
        if (err.code === err.PERMISSION_DENIED) msg = 'Location permission denied.';
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSelectSuggestion = (field, suggestion) => {
    const safeSuggestion = suggestion || {};
    const lat = Number(safeSuggestion.lat);
    const lon = Number(safeSuggestion.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    const locObj = {
      label: safeSuggestion.display_name || safeSuggestion.title,
      lat,
      lon,
    };

    if (field === 'start') {
      setStart(safeSuggestion.display_name || safeSuggestion.title);
      setStartLocationObj(locObj);
      setStartSuggestions([]);
      setStartMessage('');
    } else {
      setDestination(safeSuggestion.display_name || safeSuggestion.title);
      setDestLocationObj(locObj);
      setDestinationSuggestions([]);
      setDestMessage('');
    }

    setRoutes([]);
    setError('');
  };

  const handlePlanRoutes = async () => {
    let startQuery = '';
    let destQuery = '';

    if (startLocationObj && Number.isFinite(startLocationObj.lat) && Number.isFinite(startLocationObj.lon)) {
      startQuery = `${startLocationObj.lat}, ${startLocationObj.lon}`;
    } else if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(start.trim())) {
      startQuery = start.trim();
    }

    if (destLocationObj && Number.isFinite(destLocationObj.lat) && Number.isFinite(destLocationObj.lon)) {
      destQuery = `${destLocationObj.lat}, ${destLocationObj.lon}`;
    } else if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(destination.trim())) {
      destQuery = destination.trim();
    }

    if (!startQuery) {
      setError('Please select a starting location from the suggestions dropdown.');
      return;
    }

    if (!destQuery) {
      setError('Please select a destination from the suggestions dropdown.');
      return;
    }

    if (startQuery === destQuery) {
      setError('The start and destination must be different locations.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await planRoutes(startQuery, destQuery);

      if (!data || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error(data?.message || 'No route alternatives were returned for this trip.');
      }

      setRoutes(data.routes);
      setMapPoints({
        start: data.start || startLocationObj || null,
        destination: data.destination || destLocationObj || null,
      });
      setSelectedId(data.recommendedRouteId || data.routes[0].id);
    } catch (requestError) {
      setRoutes([]);
      setMapPoints({ start: null, destination: null });
      setSelectedId('');
      setError(requestError.message || 'Unable to find routes for this trip. Please check the inputs and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface-grid">
      {/* Trip Planner Header Panel */}
      <div className="panel">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1">
            <p className="muted-label text-rose-800">Trip Planner</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {destLocationObj ? destLocationObj.label : 'Plan a Safer Route'}
            </h2>
          </div>

          <div className="flex w-full max-w-3xl flex-col gap-2 lg:flex-row">
            {/* Start Location Input */}
            <div className="relative w-full">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus-within:border-rose-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/20 transition">
                <MapPin className="h-4 w-4 text-rose-600 shrink-0" />
                <input
                  aria-label="Start location"
                  value={start}
                  onChange={(event) => {
                    setStart(event.target.value);
                    setStartLocationObj(null);
                    setRoutes([]);
                    setError('');
                  }}
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                  placeholder="Enter starting location..."
                />
              </div>

              {startSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {startSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.title}-${suggestion.lat}-${suggestion.lon}`}
                      type="button"
                      onClick={() => handleSelectSuggestion('start', suggestion)}
                      className="block w-full rounded-xl px-3.5 py-2.5 text-left transition hover:bg-rose-50/60"
                    >
                      <div className="font-semibold text-slate-900 text-sm">{suggestion.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{suggestion.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}

              {isSearchingStart && <div className="mt-1.5 text-xs text-slate-400">Searching locations...</div>}
              {startMessage && !isSearchingStart && <div className="mt-1.5 text-xs text-amber-700">{startMessage}</div>}
            </div>

            {/* Destination Input */}
            <div className="relative w-full">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus-within:border-rose-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/20 transition">
                <Search className="h-4 w-4 text-rose-600 shrink-0" />
                <input
                  aria-label="Destination"
                  value={destination}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setDestLocationObj(null);
                    setRoutes([]);
                    setError('');
                  }}
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                  placeholder="Enter destination..."
                />
              </div>

              {destinationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {destinationSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.title}-${suggestion.lat}-${suggestion.lon}`}
                      type="button"
                      onClick={() => handleSelectSuggestion('destination', suggestion)}
                      className="block w-full rounded-xl px-3.5 py-2.5 text-left transition hover:bg-rose-50/60"
                    >
                      <div className="font-semibold text-slate-900 text-sm">{suggestion.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{suggestion.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}

              {isSearchingDest && <div className="mt-1.5 text-xs text-slate-400">Searching locations...</div>}
              {destMessage && !isSearchingDest && <div className="mt-1.5 text-xs text-amber-700">{destMessage}</div>}
            </div>

            <button
              type="button"
              onClick={handleUseMyLocation}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shrink-0 shadow-sm"
            >
              Use my location
            </button>

            <button
              type="button"
              onClick={handlePlanRoutes}
              disabled={isLoading}
              className="rounded-full bg-rose-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60 shrink-0 hover:bg-rose-700 transition shadow-sm"
            >
              {isLoading ? 'Finding routes...' : 'Find routes'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
      </div>

      {/* Main Map & Route Card Layout */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.95fr]">
        <div className="panel">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="muted-label">Live Map</p>
              <h3 className="mt-0.5 text-xl font-bold text-slate-900">Route Overview</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Low Risk</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Moderate</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />High Risk</span>
            </div>
          </div>

          {routes.length > 0 && mapPoints.start && mapPoints.destination ? (
            <RouteMap
              routes={routes}
              recommendedRouteId={routes.find((route) => route.recommended)?.id || ''}
              selectedRouteId={selectedId}
              start={mapPoints.start}
              destination={mapPoints.destination}
              center={[mapPoints.start.lat, mapPoints.start.lon ?? mapPoints.start.lng]}
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
              Enter start and destination to view the live map.
            </div>
          )}
        </div>

        <div className="space-y-4">
          {routes.length > 0 ? (
            routes.map((route) => {
              const tone = getToneFromRisk(route.risk_score);
              const isSelected = route.id === selectedId;
              const badgeLabel = getRouteBadgeLabel(route);

              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setSelectedId(route.id)}
                  className={`w-full rounded-[20px] p-4 text-left transition border ${
                    isSelected ? 'bg-rose-50/60 border-rose-300 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        tone === 'success' ? 'bg-emerald-100 text-emerald-700' : tone === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tone === 'success' ? <ShieldCheck className="h-5 w-5" /> : <Gauge className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase tracking-wider text-slate-900">{badgeLabel}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{route.risk_category}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-rose-700">{route.duration}<span className="text-sm text-slate-600"> min</span></div>
                      <div className="text-xs text-slate-500">{Number(route.distance || 0).toFixed(1)} km</div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="panel flex min-h-[220px] items-center justify-center text-slate-500 text-center p-6">
              Select start and destination from suggestions to display available routes.
            </div>
          )}
        </div>
      </div>

      {/* Clean Single Route Summary & Strict Backend Explainability */}
      {activeRoute && (
        <div className="panel space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-pill rose">
                  {getRouteBadgeLabel(activeRoute)}
                </span>
              </div>

              <h3 className="mt-2 text-2xl font-black text-slate-900">
                {Number(activeRoute.distance || 0).toFixed(1)} km · {activeRoute.duration} min · {activeRoute.risk_category} · {formatRiskScore(activeRoute.risk_score)}
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/navigation', {
                  state: {
                    selectedRoute: activeRoute,
                    start: mapPoints.start,
                    destination: mapPoints.destination,
                  },
                })
              }
              className="rounded-full bg-rose-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition shadow-sm"
            >
              Start safest route
            </button>
          </div>

          {/* Why This Route? — Backend Data Only */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">Why This Route?</h4>
            <div className="mt-3 grid gap-3 grid-cols-2 md:grid-cols-4">
              <div className="metric-card">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Risk Score</div>
                <div className="mt-1 text-xl font-black text-slate-900">{formatRiskScore(activeRoute.risk_score)}</div>
              </div>

              <div className="metric-card">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Risk Category</div>
                <div className="mt-1 text-xl font-black text-slate-900">{activeRoute.risk_category}</div>
              </div>

              <div className="metric-card">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Analyzed Segments</div>
                <div className="mt-1 text-xl font-black text-slate-900">{activeRoute.segments?.length || 0}</div>
              </div>

              <div className="metric-card">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Highest-Risk Segment</div>
                <div className="mt-1 text-xl font-black text-slate-900">
                  {highestRiskSegment ? formatRiskScore(highestRiskSegment.risk_score) : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* Safety Vs Time Comparison */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Safety vs Time</h4>

            {routes.length > 1 && recommendedRoute && fastestRoute ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div>
                  <strong className="text-rose-700">Recommended:</strong> {recommendedRoute.duration} min · Risk {formatRiskScore(recommendedRoute.risk_score)}
                </div>
                <div>
                  <strong className="text-amber-700">Fastest:</strong> {fastestRoute.duration} min · Risk {formatRiskScore(fastestRoute.risk_score)}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500 italic">
                Only one viable route was found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
