import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { OpenMeteoClient } from '../../src/datasources/OpenMeteoClient';

// We need to intercept the axios instances created inside the class.
// The cleanest way without refactoring the client is to mock the axios.create factory.
const mockInstances: MockAdapter[] = [];

const originalCreate = axios.create.bind(axios);
jest.spyOn(axios, 'create').mockImplementation((config) => {
  const instance = originalCreate(config);
  const mock = new MockAdapter(instance);
  mockInstances.push(mock);
  return instance;
});

describe('OpenMeteoClient', () => {
  let client: OpenMeteoClient;
  let geocodingMock: MockAdapter;
  let forecastMock: MockAdapter;

  beforeEach(() => {
    mockInstances.length = 0;
    client = new OpenMeteoClient();
    // First axios.create call = geocoding, second = forecast
    [geocodingMock, forecastMock] = mockInstances;
  });

  afterEach(() => {
    mockInstances.forEach(m => m.reset());
  });

  describe('searchCities', () => {
    it('calls the geocoding endpoint with correct params', async () => {
      geocodingMock.onGet('/search').reply(200, { results: [], generationtime_ms: 1 });

      await client.searchCities('London', 5);

      const history = geocodingMock.history.get;
      expect(history).toHaveLength(1);
      expect(history[0].params).toMatchObject({
        name: 'London',
        count: 5,
        language: 'en',
        format: 'json',
      });
    });

    it('returns the raw API response', async () => {
      const mockData = {
        results: [{ id: 1, name: 'London', latitude: 51.5, longitude: -0.12 }],
        generationtime_ms: 0.5,
      };
      geocodingMock.onGet('/search').reply(200, mockData);

      const result = await client.searchCities('London');

      expect(result).toEqual(mockData);
    });

    it('throws a normalised error on 4xx responses', async () => {
      geocodingMock.onGet('/search').reply(400, { reason: 'Bad request' });

      await expect(client.searchCities('x')).rejects.toThrow('Geocoding search failed');
    });

    it('throws a normalised error on network failure', async () => {
      geocodingMock.onGet('/search').networkError();

      await expect(client.searchCities('x')).rejects.toThrow('Geocoding search failed');
    });
  });

  describe('getWeatherForecast', () => {
    it('calls the forecast endpoint with required weather variables', async () => {
      forecastMock.onGet('/forecast').reply(200, {
        latitude: 51.5,
        longitude: -0.12,
        timezone: 'Europe/London',
        current_units: {},
        current: { time: '', temperature_2m: 15, windspeed_10m: 10, precipitation: 0, weathercode: 1 },
        hourly_units: {},
        hourly: { time: [], temperature_2m: [], windspeed_10m: [], precipitation: [], weathercode: [] },
        daily_units: {},
        daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], windspeed_10m_max: [], weathercode: [] },
      });

      await client.getWeatherForecast(51.5, -0.12, 'Europe/London');

      const history = forecastMock.history.get;
      expect(history).toHaveLength(1);
      const { params } = history[0];
      expect(params.latitude).toBe(51.5);
      expect(params.longitude).toBe(-0.12);
      expect(params.timezone).toBe('Europe/London');
      expect(params.current).toContain('temperature_2m');
      expect(params.hourly).toContain('snow_depth');
      expect(params.daily).toContain('temperature_2m_max');
    });

    it('throws a normalised error on failure', async () => {
      forecastMock.onGet('/forecast').reply(500, { reason: 'Server error' });

      await expect(client.getWeatherForecast(0, 0, 'UTC')).rejects.toThrow(
        'Weather forecast fetch failed',
      );
    });
  });
});
