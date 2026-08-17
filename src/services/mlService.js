export async function predictRiskSignals(payload = {}) {
  return {
    riskLevel: 'medium',
    confidence: 0.86,
    payload,
    model: 'ml-risk-model-v1',
    generatedAt: new Date().toISOString(),
  };
}

export async function recommendRoute(routeCandidates = []) {
  return routeCandidates.map((route, index) => ({
    ...route,
    recommended: index === 0,
    mlScore: route.score ?? 92,
  }));
}

export async function classifyReportSeverity(reportType, intensity = 50) {
  if (!reportType) {
    return 'unknown';
  }

  if (intensity >= 70) return 'high';
  if (intensity >= 35) return 'medium';
  return 'low';
}
