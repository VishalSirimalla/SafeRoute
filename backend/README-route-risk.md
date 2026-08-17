# SafeRoute Route Risk Flow

## Routing provider

The prototype uses OpenStreetMap Nominatim for lookup and OSRM for route generation. This keeps the workflow free and avoids paid API keys. If the routing service is unavailable or returns no alternatives, the backend falls back to a clearly labelled prototype route dataset instead of failing.

## Route segmentation strategy

Each route geometry is sampled into roughly 5–8 representative segment points. The backend calculates approximate cumulative distances along the route and chooses sample points at evenly spaced intervals. This avoids thousands of ML requests while still producing a useful per-segment risk profile.

## ML feature generation

The ML model expects these fields:

- city
- state
- latitude
- longitude
- road_type
- weather
- visibility
- traffic_density
- cause
- hour
- day_of_week
- is_weekend
- is_peak_hour
- vehicles_involved
- casualties
- temperature
- month
- year

When a value can be resolved from a live geocoder or current environment, it is used. When it cannot, the service falls back to explicit prototype defaults and labels the source as prototype-defaults. No fake accident history is claimed as live data.

## Risk aggregation

Segment risk scores are weighted by segment distance, then combined into a route-level score:

weightedRisk = sum(segmentRisk * segmentDistance) / sum(segmentDistance)

This produces a route score that stays interpretable and emphasizes longer, riskier segments rather than plain averaging.

## Recommendation logic

The system ranks routes primarily by safety and then surfaces the fastest and safest trade-offs to the user. A route is recommended when it has the lowest aggregated risk score, while fastest-route information is still shown for comparison.
