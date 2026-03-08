export const APP_NAME = 'Candle Rolling Engine';
export const INTERVALS = ['3m', '5m', '15m'] as const;
export const MODES = ['MOCK', 'API', 'EXCEL'] as const;

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
  rawApiBaseUrl && rawApiBaseUrl !== 'undefined'
    ? rawApiBaseUrl.replace(/\/+$/, '')
    : 'http://localhost:4000';
