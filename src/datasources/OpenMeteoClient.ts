import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import {
  OpenMeteoGeocodingResponse,
  OpenMeteoForecastResponse,
} from '../types';

/**
 * Thin HTTP wrapper around Open-Meteo APIs.
 * Contains no business logic — just fetch & return raw API shapes.
 */
export class OpenMeteoClient {
  private geocoding: AxiosInstance;
  private forecast: AxiosInstance;

  constructor() {
    const axiosDefaults = {
      timeout: config.openMeteo.timeoutMs,
      headers: { 'Accept': 'application/json' },
    };

    this.geocoding = axios.create({
      ...axiosDefaults,
      baseURL: config.openMeteo.geocodingUrl,
    });

    this.forecast = axios.create({
      ...axiosDefaults,
      baseURL: config.openMeteo.forecastUrl,
    });
  }

  async searchCities(
    query: string,
    count = 10,
    language = 'en',
  ): Promise<OpenMeteoGeocodingResponse> {
    try {
      const { data } = await this.geocoding.get<OpenMeteoGeocodingResponse>('/search', {
        params: { name: query, count, language, format: 'json' },
      });
      return data;
    } catch (error) {
      throw this.normaliseError('Geocoding search failed', error);
    }
  }

  async getWeatherForecast(
    latitude: number,
    longitude: number,
    timezone: string,
  ): Promise<OpenMeteoForecastResponse> {
    try {
      const { data } = await this.forecast.get<OpenMeteoForecastResponse>('/forecast', {
        params: {
          latitude,
          longitude,
          timezone,
          current: [
            'temperature_2m',
            'windspeed_10m',
            'precipitation',
            'weathercode',
          ].join(','),
          hourly: [
            'temperature_2m',
            'windspeed_10m',
            'precipitation',
            'weathercode',
            'snow_depth',
          ].join(','),
          daily: [
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'windspeed_10m_max',
            'weathercode',
          ].join(','),
          forecast_days: 7,
          format: 'json',
        },
      });
      return data;
    } catch (error) {
      throw this.normaliseError('Weather forecast fetch failed', error);
    }
  }

  /** Converts AxiosError into a clean Error with a meaningful message */
  private normaliseError(context: string, error: unknown): Error {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const detail = error.response?.data?.reason || error.message;
      return new Error(`${context}: [${status}] ${detail}`);
    }
    // Shouldn't hit this but TypeScript makes us handle it
    if (error instanceof Error) return error;
    return new Error(`${context}: Unknown error`);
  }
}
