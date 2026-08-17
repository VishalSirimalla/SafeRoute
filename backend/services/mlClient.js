const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';

async function predictRisk(features) {
  const response = await fetch(`${ML_SERVICE_URL}/predict-risk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(features),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ML service error: ${response.status} ${errorText || 'unknown error'}`);
  }

  const payload = await response.json();

  if (!payload || typeof payload.risk_score !== 'number') {
    throw new Error('ML service returned an invalid risk score');
  }

  return payload;
}

module.exports = { predictRisk };
