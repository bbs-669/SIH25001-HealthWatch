/**
 * API Service for SIH25001 FastAPI backend.
 * Base URL: http://127.0.0.1:8000
 */

const BASE_URL = 'http://127.0.0.1:8000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to generic message
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (err) {
    console.error(`API Error on ${options.method || 'GET'} ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // 1. Health check
  checkHealth: () => request('/health'),

  // 2. Villages
  getVillages: () => request('/villages'),
  getVillageByCode: (code) => request(`/villages/${code}`),

  // 3. Symptom reports
  submitSymptomReport: (data) =>
    request('/reports/symptom', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSymptomReports: () => request('/reports/symptom'),

  // 4. Water quality logs
  submitWaterLog: (data) =>
    request('/reports/water', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWaterQualityLogs: () => request('/reports/water'),

  // 5. SMS Webhook
  sendSmsWebhook: (senderPhone, messageBody) =>
    request('/webhooks/sms', {
      method: 'POST',
      body: JSON.stringify({
        sender_phone: senderPhone || '+919876543210',
        message_body: messageBody,
      }),
    }),

  // 6. Medical resources & dispatch
  getResources: () => request('/resources'),
  dispatchResources: (dispatchData) =>
    request('/resources/dispatch', {
      method: 'POST',
      body: JSON.stringify(dispatchData),
    }),

  // 7. ML & Explainable AI Outbreak Risk Analysis
  getVillageRiskAnalysis: (code) => request(`/villages/${code}/risk-analysis`),
  recalculateAllRisk: () =>
    request('/ml/recalculate-all', {
      method: 'POST',
    }),
  getMlStatus: () => request('/ml/status'),
};
