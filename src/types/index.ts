// ─── City & Geocoding ────────────────────────────────────────────────────────

export interface City {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
  admin1?: string; // State / Province
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface HourlyWeather {
  time: string;
  temperature2m: number;
  windspeed10m: number;
  precipitation: number;
  weathercode: number;
  snowDepth?: number;
  waveHeight?: number;
}

export interface DailyWeather {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  windspeedMax: number;
  weathercode: number;
}

export interface WeatherForecast {
  city: City;
  current: HourlyWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  timezone: string;
}

// ─── Activities ───────────────────────────────────────────────────────────────

export type ActivityType = 'SKIING' | 'SURFING' | 'INDOOR_SIGHTSEEING' | 'OUTDOOR_SIGHTSEEING';

export interface Activity {
  type: ActivityType;
  name: string;
  score: number;          // 0–100
  suitable: boolean;      // score >= 60
  reason: string;         // human-readable explanation
}

export interface ActivityRanking {
  city: City;
  forecast: WeatherForecast;
  activities: Activity[];
  rankedAt: string;       // ISO timestamp
}

// ─── Open-Meteo API response shapes ──────────────────────────────────────────

export interface OpenMeteoGeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  timezone: string;
  population?: number;
  admin1?: string;
}

export interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
  generationtime_ms: number;
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current_units: Record<string, string>;
  current: {
    time: string;
    temperature_2m: number;
    windspeed_10m: number;
    precipitation: number;
    weathercode: number;
  };
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    windspeed_10m: number[];
    precipitation: number[];
    weathercode: number[];
    snow_depth?: number[];
    wave_height?: number[];
  };
  daily_units: Record<string, string>;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
    weathercode: number[];
  };
}

// ─── Service interfaces (for dependency injection / testability) ──────────────

export interface IGeocodingService {
  searchCities(query: string, count?: number): Promise<City[]>;
  getCityByCoordinates(lat: number, lon: number): Promise<City | null>;
}

export interface IWeatherService {
  getForecast(city: City): Promise<WeatherForecast>;
}

export interface IActivityService {
  rankActivities(forecast: WeatherForecast): Activity[];
}
