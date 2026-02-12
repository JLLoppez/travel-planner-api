import { GeocodingService } from '../../services/GeocodingService';
import { WeatherService } from '../../services/WeatherService';
import { ActivityService } from '../../services/ActivityService';
import { City, WeatherForecast } from '../../types';

interface Services {
  geocodingService: GeocodingService;
  weatherService: WeatherService;
  activityService: ActivityService;
}

interface CityArgs {
  latitude: number;
  longitude: number;
  timezone: string;
}

export function buildResolvers(services: Services) {
  const { geocodingService, weatherService, activityService } = services;

  return {
    Query: {
      /**
       * City suggestions — returns [] for empty/too-short queries instead of throwing.
       */
      citySuggestions: async (
        _: unknown,
        { query, count }: { query: string; count?: number },
      ): Promise<City[]> => {
        const limit = Math.min(count ?? 10, 20);
        return geocodingService.searchCities(query, limit);
      },

      /**
       * Weather forecast — returns full 7-day forecast for given coordinates.
       */
      weatherForecast: async (
        _: unknown,
        { latitude, longitude, timezone }: CityArgs,
      ): Promise<WeatherForecast> => {
        // Build a lightweight city object from coords for the service layer
        const city = buildCityFromCoords(latitude, longitude, timezone);
        return weatherService.getForecast(city);
      },

      /**
       * Activity ranking — the primary composite query.
       * Fetches forecast then scores all 4 activities in one call.
       */
      activityRanking: async (
        _: unknown,
        { latitude, longitude, timezone }: CityArgs,
      ) => {
        // Build city object first so we can pass it around consistently
        const city = buildCityFromCoords(latitude, longitude, timezone);
        const forecast = await weatherService.getForecast(city);
        const activities = activityService.rankActivities(forecast);

        return {
          city,
          forecast,
          activities,
          rankedAt: new Date().toISOString(),
        };
      },
    },
  };
}

/**
 * Constructs a minimal City object from raw coordinates.
 * Used when the caller provides lat/lon directly rather than searching first.
 */
function buildCityFromCoords(latitude: number, longitude: number, timezone: string): City {
  return {
    id: 0,
    name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    country: 'Unknown',
    countryCode: '',
    latitude,
    longitude,
    timezone,
  };
}
