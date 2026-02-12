import { OpenMeteoClient } from '../datasources/OpenMeteoClient';
import { City, IGeocodingService, OpenMeteoGeocodingResult } from '../types';

export class GeocodingService implements IGeocodingService {
  constructor(private readonly client: OpenMeteoClient) {}

  async searchCities(query: string, count = 10): Promise<City[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await this.client.searchCities(query.trim(), count);

    if (!response.results?.length) {
      return [];
    }

    return response.results.map(this.mapToCity);
  }

  async getCityByCoordinates(lat: number, lon: number): Promise<City | null> {
    // Open-Meteo geocoding supports reverse lookup via name=lat,lon format
    // For simplicity we search by stringified coords and take the nearest result
    const query = `${lat},${lon}`;
    const response = await this.client.searchCities(query, 1);

    if (!response.results?.length) return null;

    return this.mapToCity(response.results[0]);
  }

  private mapToCity(raw: OpenMeteoGeocodingResult): City {
    return {
      id: raw.id,
      name: raw.name,
      country: raw.country,
      countryCode: raw.country_code,
      latitude: raw.latitude,
      longitude: raw.longitude,
      timezone: raw.timezone,
      population: raw.population,
      admin1: raw.admin1,
    };
  }
}
