export const appData = {
  user: {
    name: 'Vishal',
  },
  destination: {
    title: 'Thakur College (TCET)',
    eta: '09:15 AM',
    safeRoute: { label: 'Safe Route', duration: '18 min', distance: '2.4 km', score: 92, status: 'Recommended', wellLit: true, policeNearby: true },
    fastestRoute: { label: 'Fastest Route', duration: '14 min', distance: '2.1 km', score: 71, status: 'Poor lighting' },
  },
  communityReports: [
    { id: 1, type: 'Streetlight outage', detail: 'Multiple lights out along Oak Street path.', distance: '0.2 mi', time: '10m ago', severity: 'Medium', tag: 'Medium', icon: 'bulb', tone: 'emerald' },
    { id: 2, type: 'Community Patrol', detail: 'Volunteer group currently walking the downtown sector.', distance: '0.5 mi', time: 'Active', severity: 'Low', tag: 'Safe Zone', icon: 'shield', tone: 'emerald' },
    { id: 3, type: 'Sidewalk Blocked', detail: 'Construction debris forcing pedestrians onto the road.', distance: '1h ago', time: '1h ago', severity: 'High', tag: 'High', icon: 'alert', tone: 'rose' },
  ],
  safePlaces: [
    { id: 1, name: 'Police Station', distance: '0.8 mi away', type: 'police', status: 'Open', accent: 'primary' },
    { id: 2, name: 'City Hospital', distance: '1.2 mi away', type: 'hospital', status: 'Open 24/7', accent: 'primary' },
    { id: 3, name: 'Community Shelter', distance: '0.8 miles away', type: 'shelter', status: 'Closed', accent: 'muted' },
  ],
  safetyAlerts: [
    { id: 1, label: 'Streetlight Outage', detail: 'Reported on 5th Ave & Main St. Proceed with caution.', time: '12 mins ago', tone: 'alert' },
    { id: 2, label: 'Incident Nearby', detail: 'Minor disturbance reported 2 blocks north. Route adjusted.', time: '45 mins ago', tone: 'warning' },
  ],
  quickContacts: [
    { id: 1, title: 'Mom', subtitle: 'Primary Emergency Contact', type: 'person', accent: 'person' },
    { id: 2, title: 'Local Authorities', subtitle: '911 Dispatch', type: 'authority', accent: 'authority' },
  ],
  navigation: {
    direction: 'Continue straight',
    distance: '350 meters',
    street: 'Elm Street',
    eta: '12 min • 1.2 km • 11:45 PM',
    score: 92,
  },
  emergency: {
    currentLocation: '40.7128° N, 74.0060° W',
    address: '120 Broadway, Financial District',
    accuracy: '± 5 meters',
  },
};
