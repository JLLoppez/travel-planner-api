import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  openMeteo: {
    geocodingUrl: process.env.OPEN_METEO_GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1',
    forecastUrl: process.env.OPEN_METEO_FORECAST_URL || 'https://api.open-meteo.com/v1',
    timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10),
  },
} as const;
