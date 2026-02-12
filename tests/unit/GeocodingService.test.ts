import { GeocodingService } from '../../src/services/GeocodingService';
import { OpenMeteoClient } from '../../src/datasources/OpenMeteoClient';
import { OpenMeteoGeocodingResponse } from '../../src/types';

jest.mock('../../src/datasources/OpenMeteoClient');

const mockClient = new OpenMeteoClient() as jest.Mocked<OpenMeteoClient>;

const sampleResult = {
  id: 2193733,
  name: 'Cape Town',
  latitude: -33.9258,
  longitude: 18.4232,
  country: 'South Africa',
  country_code: 'ZA',
  timezone: 'Africa/Johannesburg',
  population: 3433441,
  admin1: 'Western Cape',
};

const sampleResponse: OpenMeteoGeocodingResponse = {
  results: [sampleResult],
  generationtime_ms: 1.2,
};

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GeocodingService(mockClient);
  });

  describe('searchCities', () => {
    it('returns mapped City objects from API results', async () => {
      mockClient.searchCities.mockResolvedValue(sampleResponse);

      const cities = await service.searchCities('Cape');

      expect(cities).toHaveLength(1);
      expect(cities[0]).toMatchObject({
        id: 2193733,
        name: 'Cape Town',
        country: 'South Africa',
        countryCode: 'ZA',
        latitude: -33.9258,
        longitude: 18.4232,
        timezone: 'Africa/Johannesburg',
        population: 3433441,
        admin1: 'Western Cape',
      });
    });

    it('passes query and count to the client', async () => {
      mockClient.searchCities.mockResolvedValue(sampleResponse);

      await service.searchCities('Berlin', 5);

      expect(mockClient.searchCities).toHaveBeenCalledWith('Berlin', 5);
    });

    it('returns empty array when API returns no results', async () => {
      mockClient.searchCities.mockResolvedValue({ generationtime_ms: 0.5 });

      const result = await service.searchCities('zzzzunknown');

      expect(result).toEqual([]);
    });

    it('returns empty array for empty query without calling API', async () => {
      const result = await service.searchCities('');

      expect(result).toEqual([]);
      expect(mockClient.searchCities).not.toHaveBeenCalled();
    });

    it('returns empty array for single-character query without calling API', async () => {
      const result = await service.searchCities('A');

      expect(result).toEqual([]);
      expect(mockClient.searchCities).not.toHaveBeenCalled();
    });

    it('trims whitespace before searching', async () => {
      mockClient.searchCities.mockResolvedValue(sampleResponse);

      await service.searchCities('  London  ');

      expect(mockClient.searchCities).toHaveBeenCalledWith('London', expect.any(Number));
    });

    it('maps multiple results correctly', async () => {
      mockClient.searchCities.mockResolvedValue({
        results: [
          sampleResult,
          { ...sampleResult, id: 999, name: 'Cape Breton', country: 'Canada', country_code: 'CA' },
        ],
        generationtime_ms: 1.0,
      });

      const cities = await service.searchCities('Cape');

      expect(cities).toHaveLength(2);
      expect(cities[1].name).toBe('Cape Breton');
      expect(cities[1].countryCode).toBe('CA');
    });

    it('propagates errors from the client', async () => {
      mockClient.searchCities.mockRejectedValue(new Error('Network failure'));

      await expect(service.searchCities('Paris')).rejects.toThrow('Network failure');
    });
  });
});
