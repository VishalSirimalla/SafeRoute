const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function getOrInitAuthToken(forceRefresh = false) {
  if (forceRefresh) {
    localStorage.removeItem('saferoute_auth_token');
  }

  let token = localStorage.getItem('saferoute_admin_token') || localStorage.getItem('saferoute_auth_token');
  if (token && !forceRefresh) return token;

  try {
    const res = await fetch(`${API_BASE_URL}/profile/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@saferoute.app',
        name: 'Saarthi User',
        phone: '+919876543210',
      }),
    });
    const data = await res.json();
    if (data?.success && data?.token) {
      token = data.token;
      localStorage.setItem('saferoute_auth_token', token);
      return token;
    }
  } catch (err) {
    console.error('Auth token initialization error:', err);
  }
  return null;
}

export const apiClient = {
  async request(endpoint, { method = 'GET', body, headers = {}, timeoutMs = 20000, skipAuth = false, _isRetry = false } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (!skipAuth) {
      const token = await getOrInitAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 401 && !skipAuth && !_isRetry) {
        const freshToken = await getOrInitAuthToken(true);
        if (freshToken) {
          return apiClient.request(endpoint, {
            method,
            body,
            headers,
            timeoutMs,
            skipAuth,
            _isRetry: true,
          });
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },

  async get(endpoint, options = {}) {
    return apiClient.request(endpoint, { ...options, method: 'GET' });
  },

  async post(endpoint, body, options = {}) {
    return apiClient.request(endpoint, { ...options, method: 'POST', body });
  },

  async delete(endpoint, options = {}) {
    return apiClient.request(endpoint, { ...options, method: 'DELETE' });
  },

  async patch(endpoint, body, options = {}) {
    return apiClient.request(endpoint, { ...options, method: 'PATCH', body });
  },
};

export function adminLogin(email, password) {
  return apiClient.post('/profile/admin-login', { email, password }, { skipAuth: true }).then((res) => {
    if (res?.token) {
      localStorage.setItem('saferoute_admin_token', res.token);
      localStorage.setItem('saferoute_auth_token', res.token);
    }
    return res;
  });
}

export function getProfile() {
  return apiClient.get('/profile');
}

export function getAllUsers() {
  return apiClient.get('/profile/users');
}

export function updateProfile(profileData) {
  return apiClient.patch('/profile', profileData);
}

export function getReports() {
  return apiClient.get('/reports');
}

export function getCommunityReports() {
  return apiClient.get('/reports/community');
}

export function getReportStats() {
  return apiClient.get('/reports/stats');
}

export function getReport(reportId) {
  return apiClient.get(`/reports/${reportId}`);
}

export function updateReportStatus(reportId, status) {
  return apiClient.patch(`/reports/${reportId}/status`, { status });
}

export function submitSafetyReport(payload) {
  return apiClient.post('/reports', payload);
}

export function uploadReportEvidence(imageDataUrl, fileName) {
  return apiClient.post('/reports/upload', { image: imageDataUrl, fileName }, { timeoutMs: 30000 });
}

export function submitIncident(payload) {
  return apiClient.post('/incidents', payload, { timeoutMs: 30000 });
}

export function getIncident(incidentId) {
  return apiClient.get(`/incidents/${incidentId}`);
}

export function getIncidents() {
  return apiClient.get('/incidents');
}

export function getSharedIncident(shareToken) {
  return apiClient.get(`/incidents/share/${shareToken}`, { skipAuth: true });
}

export function updateIncidentStatus(incidentId, status) {
  return apiClient.patch(`/incidents/${incidentId}/status`, { status });
}

export function updateIncidentLocation(incidentId, location) {
  return apiClient.patch(`/incidents/${incidentId}/location`, location);
}

export function getTrustedContacts() {
  return apiClient.get('/contacts');
}

export function addTrustedContact(contactData) {
  return apiClient.post('/contacts', contactData);
}

export function deleteTrustedContact(contactId) {
  return apiClient.delete(`/contacts/${contactId}`);
}

export function planRoutes(start, destination) {
  return apiClient.post('/routes/plan', { start, destination }, { timeoutMs: 30000 });
}
