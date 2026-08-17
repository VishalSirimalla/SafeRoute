import { CircleX, Navigation, ShieldCheck, LocateFixed, Search, RefreshCw, AlertTriangle, Play, Square, Loader2, Gauge, Compass } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { planRoutes } from '../services/apiClient';
import { searchLocationSuggestions } from '../services/mapService';
import NavigationMap from '../components/NavigationMap';

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

export default function NavigationScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract route state passed from RoutesScreen
  const passedRoute = location.state?.selectedRoute || null;
  const passedStart = location.state?.start || null;
  const passedDest = location.state?.destination || null;

  // Initialize destinationPoint from passed state or route geometry
  const initialDestPoint = useMemo(() => {
    if (passedDest && Number.isFinite(passedDest.lat)) {
      return {
        lat: Number(passedDest.lat),
        lon: Number(passedDest.lon ?? passedDest.lng),
        name: passedDest.display_name || passedDest.title || passedRoute?.title || 'Destination',
      };
    }
    if (passedRoute && Array.isArray(passedRoute.geometry) && passedRoute.geometry.length > 0) {
      const last = passedRoute.geometry[passedRoute.geometry.length - 1];
      return {
        lat: last[0],
        lon: last[1],
        name: passedRoute.title || 'Destination',
      };
    }
    return null;
  }, [passedDest, passedRoute]);

  // Real browser geolocation state
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');

  // Destination & Start search inputs
  const [startInput, setStartInput] = useState(
    passedStart?.display_name || (passedStart ? `${passedStart.lat}, ${passedStart.lon}` : '')
  );
  const [destinationInput, setDestinationInput] = useState(
    initialDestPoint?.name || ''
  );
  const [destinationPoint, setDestinationPoint] = useState(initialDestPoint);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destMessage, setDestMessage] = useState('');

  // Route calculation state
  const [calculatedRoute, setCalculatedRoute] = useState(passedRoute);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState('');

  // Live Navigation tracking state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStatus, setNavStatus] = useState('IDLE');
  const [recenterTrigger, setRecenterTrigger] = useState(Date.now());
  const [remainingKm, setRemainingKm] = useState(null);

  const watchIdRef = useRef(null);

  // Acquire current GPS position
  const requestCurrentPosition = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(coords);
        if (!startInput) {
          setStartInput(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        }
        setLocationLoading(false);
      },
      (err) => {
        let msg = 'Unable to acquire current GPS position.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. GPS location is required for live navigation.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable. Please check location settings.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS request timed out. Click refresh to retry.';
        }
        setLocationError(msg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    requestCurrentPosition();

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Destination autocomplete search debouncer
  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = destinationInput.trim();
      if (!query || query.length < 2) {
        setDestSuggestions([]);
        setDestMessage('');
        return;
      }

      const results = await searchLocationSuggestions(query, userLocation);
      setDestSuggestions(results.suggestions || []);
      setDestMessage(results.message || '');
    }, 300);

    return () => clearTimeout(timer);
  }, [destinationInput, userLocation]);

  const handleSelectDestSuggestion = (suggestion) => {
    setDestinationInput(suggestion.display_name || suggestion.title);
    const destObj = {
      lat: suggestion.lat,
      lon: suggestion.lon,
      name: suggestion.title,
      address: suggestion.subtitle || suggestion.display_name,
    };
    setDestinationPoint(destObj);
    setDestSuggestions([]);
    setDestMessage('');

    triggerRouteCalculation(destObj);
  };

  const triggerRouteCalculation = async (targetDest) => {
    let startQuery = startInput.trim();
    if (!startQuery && userLocation) {
      startQuery = `${userLocation.latitude}, ${userLocation.longitude}`;
    }

    if (!startQuery) {
      setRouteError('Start location is required. Click "Use My GPS" to set current position.');
      return;
    }

    const destQuery = targetDest
      ? `${targetDest.lat}, ${targetDest.lon}`
      : destinationInput.trim();

    if (!destQuery) {
      setRouteError('Please select or enter a destination.');
      return;
    }

    setCalculatingRoute(true);
    setRouteError('');

    try {
      const data = await planRoutes(startQuery, destQuery);

      if (!data || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error(data?.message || 'No route alternatives were found for these locations.');
      }

      const selected = data.routes.find((r) => r.recommended) || data.routes[0];
      setCalculatedRoute(selected);

      if (data.destination) {
        setDestinationPoint({
          lat: data.destination.lat,
          lon: data.destination.lon ?? data.destination.lng,
          name: data.destination.display_name || destinationInput,
        });
      }
    } catch (err) {
      setRouteError(err?.message || 'Failed to calculate route to destination.');
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Live Navigation: Start watchPosition
  const handleStartNavigation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setNavStatus('NAVIGATING');
    setIsNavigating(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const updatedCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(updatedCoords);

        if (destinationPoint) {
          const dist = haversineDistanceKm(
            updatedCoords.latitude,
            updatedCoords.longitude,
            destinationPoint.lat,
            destinationPoint.lon
          );
          setRemainingKm(dist);
        }
      },
      (err) => {
        console.warn('WatchPosition error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    watchIdRef.current = watchId;
  };

  const handleStopNavigation = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsNavigating(false);
    setNavStatus('STOPPED');
  };

  const handleRecenter = () => {
    setRecenterTrigger(Date.now());
  };

  const displayDistance = useMemo(() => {
    if (isNavigating && remainingKm !== null) {
      return `${remainingKm.toFixed(1)} km remaining`;
    }
    if (calculatedRoute && typeof calculatedRoute.distance === 'number') {
      return `${calculatedRoute.distance.toFixed(1)} km`;
    }
    return null;
  }, [isNavigating, remainingKm, calculatedRoute]);

  const riskScore = calculatedRoute && typeof calculatedRoute.risk_score === 'number'
    ? Math.round(calculatedRoute.risk_score * 100)
    : 15;
  const riskCategory = calculatedRoute ? calculatedRoute.risk_category || 'Low Risk' : 'Low Risk';

  const isNoRouteState = !calculatedRoute && !destinationPoint;

  return (
    <div className="surface-grid">
      {/* Status Header Banner */}
      <div className="panel border-rose-200/80 bg-gradient-to-r from-rose-50/60 via-white to-purple-50/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white transition ${
              isNavigating ? 'bg-rose-600 shadow-md animate-pulse' : 'bg-rose-500'
            }`}>
              <Navigation className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="muted-label text-slate-500">Live Navigation & Base Map</p>
                <span className={`badge-pill ${
                  navStatus === 'NAVIGATING' ? 'rose' : navStatus === 'STOPPED' ? 'warning' : 'success'
                }`}>
                  {navStatus === 'NAVIGATING' ? 'Live GPS Active' : navStatus === 'STOPPED' ? 'Navigation Stopped' : 'Ready'}
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                {destinationPoint ? destinationPoint.name : calculatedRoute ? calculatedRoute.title : 'Live Navigation'}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {displayDistance ? `${displayDistance} • ${calculatedRoute?.duration || '--'} min ETA` : 'Select a route from the Route Planner or search destination below.'}
              </p>
            </div>
          </div>

          {calculatedRoute && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Safety Score</span>
                <span className="text-xs text-rose-600 font-bold">{riskCategory}</span>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-rose-600 text-lg font-black text-rose-700 bg-rose-50">
                {100 - riskScore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fallback Banner for direct navigation access */}
      {isNoRouteState && (
        <div className="panel border-amber-200 bg-amber-50/60 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base font-bold text-amber-900">No active route selected for navigation</h3>
            <p className="text-xs text-amber-700">
              Please plan a route first on the Route Planner page or search a destination below to start turn-by-turn navigation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/routes')}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition shadow-sm shrink-0"
          >
            <Compass className="h-4 w-4" />
            <span>Select Route in Planner</span>
          </button>
        </div>
      )}

      {/* Search Input Controls */}
      <div className="panel space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <div className="text-xs font-semibold text-slate-500 mb-1">Start Location</div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <LocateFixed className="h-4 w-4 text-rose-600 shrink-0" />
                <input
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  placeholder="Starting location or current GPS..."
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="relative">
              <div className="text-xs font-semibold text-slate-500 mb-1">Destination Search</div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <Search className="h-4 w-4 text-rose-600 shrink-0" />
                <input
                  value={destinationInput}
                  onChange={(e) => {
                    setDestinationInput(e.target.value);
                    setDestinationPoint(null);
                  }}
                  placeholder="Search places, colleges, stations, streets, localities..."
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {destSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.title}-${suggestion.lat}-${suggestion.lon}`}
                      type="button"
                      onClick={() => handleSelectDestSuggestion(suggestion)}
                      className="block w-full rounded-xl px-3.5 py-2.5 text-left transition hover:bg-rose-50/60"
                    >
                      <div className="font-semibold text-slate-900 text-sm">{suggestion.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{suggestion.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}

              {destMessage && <div className="mt-1 text-xs text-amber-700">{destMessage}</div>}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={requestCurrentPosition}
              disabled={locationLoading}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${locationLoading ? 'animate-spin text-rose-600' : ''}`} />
              <span>Use My GPS</span>
            </button>

            <button
              type="button"
              onClick={() => triggerRouteCalculation(destinationPoint)}
              disabled={calculatingRoute}
              className="rounded-full bg-rose-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-60 shadow-sm"
            >
              {calculatingRoute ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Finding Route...</span>
                </>
              ) : (
                <>
                  <Compass className="h-3.5 w-3.5" />
                  <span>Find Route</span>
                </>
              )}
            </button>
          </div>
        </div>

        {routeError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{routeError}</span>
          </div>
        )}
      </div>

      {/* Main Map Panel */}
      <div className="panel space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Navigation Map</h3>
          <button
            type="button"
            onClick={handleRecenter}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <LocateFixed className="h-3.5 w-3.5 text-rose-600" />
            <span>Recenter GPS</span>
          </button>
        </div>

        <div className="h-[500px] w-full rounded-[20px] overflow-hidden border border-slate-200 relative shadow-inner">
          <NavigationMap
            userLocation={userLocation}
            destination={destinationPoint}
            geometry={calculatedRoute?.geometry || []}
            isLoading={locationLoading}
            error={locationError}
            recenterTrigger={recenterTrigger}
            isNavigating={isNavigating}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        {!isNavigating ? (
          <button
            type="button"
            onClick={handleStartNavigation}
            disabled={!calculatedRoute && !destinationPoint}
            className="flex items-center justify-center gap-3 rounded-[20px] bg-rose-600 px-5 py-4 text-lg font-bold text-white hover:bg-rose-700 transition disabled:opacity-50 shadow-md"
          >
            <Play className="h-5 w-5 fill-current" /> Start Live Navigation
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopNavigation}
            className="flex items-center justify-center gap-3 rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-lg font-bold text-rose-700 hover:bg-rose-100 transition shadow-sm"
          >
            <Square className="h-5 w-5 fill-current" /> Stop Navigation
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/routes')}
          className="flex items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-lg font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <CircleX className="h-5 w-5 text-slate-400" /> Plan Alternate Routes
        </button>
      </div>
    </div>
  );
}
