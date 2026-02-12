import { WeatherService } from '../../src/services/WeatherService';
import { OpenMeteoClient } from '../../src/datasources/OpenMeteoClient';
import { City, OpenMeteoForecastResponse } from '../../src/types';

jest.mock('../../src/datasources/OpenMeteoClient');

const mockClient = new OpenMeteoClient() as jest.Mocked<OpenMeteoClient>;

const testCity: City = {
  id: 1,
  name: 'Cape Town',
  country: 'South Africa',
  countryCode: 'ZA',
  latitude: -33.9258,
  longitude: 18.4232,
  timezone: 'Africa/Johannesburg',
};

const mockForecastResponse: OpenMeteoForecastResponse = {
  latitude: -33.9258,
  longitude: 18.4232,
  timezone: 'Africa/Johannesburg',
  current_units: { temperature_2m: '°C', windspeed_10m: 'km/h' },
  current: {
    time: '2026-02-11T14:00',
    temperature_2m: 24.5,
    windspeed_10m: 18.2,
    precipitation: 0.0,
    weathercode: 1,
  },
  hourly_units: { temperature_2m: '°C' },
  hourly: {
    time: ['2026-02-11T00:00', '2026-02-11T01:00'],
    temperature_2m: [22.1, 21.8],
    windspeed_10m: [15.0, 16.5],
    precipitation: [0.0, 0.0],
    weathercode: [1, 1],
    snow_depth: [0.0, 0.0],
  },
  daily_units: { temperature_2m_max: '°C' },
  daily: {
    time: ['2026-02-11', '2026-02-12'],
    temperature_2m_max: [26.0, 25.5],
    temperature_2m_min: [18.0, 17.5],
    precipitation_sum: [0.0, 1.2],
    windspeed_10m_max: [22.0, 28.0],
    weathercode: [1, 3],
  },
};

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WeatherService(mockClient);
    mockClient.getWeatherForecast.mockResolvedValue(mockForecastResponse);
  });

  describe('getForecast', () => {
    it('calls client with correct coordinates and timezone', async () => {
      await service.getForecast(testCity);

      expect(mockClient.getWeatherForecast).toHaveBeenCalledWith(
        testCity.latitude,
        testCity.longitude,
        testCity.timezone,
      );
    });

    it('maps current conditions correctly', async () => {
      const forecast = await service.getForecast(testCity);

      expect(forecast.current).toMatchObject({
        time: '2026-02-11T14:00',
        temperature2m: 24.5,
        windspeed10m: 18.2,
        precipitation: 0.0,
        weathercode: 1,
      });
    });

    it('maps hourly data array correctly', async () => {
      const forecast = await service.getForecast(testCity);

      expect(forecast.hourly).toHaveLength(2);
      expect(forecast.hourly[0]).toMatchObject({
        time: '2026-02-11T00:00',
        temperature2m: 22.1,
        windspeed10m: 15.0,
        precipitation: 0.0,
        weathercode: 1,
        snowDepth: 0.0,
      });
    });

    it('maps daily data array correctly', async () => {
      const forecast = await service.getForecast(testCity);

      expect(forecast.daily).toHaveLength(2);
      expect(forecast.daily[0]).toMatchObject({
        date: '2026-02-11',
        temperatureMax: 26.0,
        temperatureMin: 18.0,
        precipitationSum: 0.0,
        windspeedMax: 22.0,
        weathercode: 1,
      });
    });

    it('attaches the city object to the forecast', async () => {
      const forecast = await service.getForecast(testCity);

      expect(forecast.city).toEqual(testCity);
    });

    it('preserves the timezone from the API response', async () => {
      const forecast = await service.getForecast(testCity);

      expect(forecast.timezone).toBe('Africa/Johannesburg');
    });

    it('handles missing snow_depth gracefully', async () => {
      const noSnowResponse = {
        ...mockForecastResponse,
        hourly: { ...mockForecastResponse.hourly, snow_depth: undefined },
      };
      mockClient.getWeatherForecast.mockResolvedValue(noSnowResponse);

      const forecast = await service.getForecast(testCity);

      expect(forecast.hourly[0].snowDepth).toBeUndefined();
    });

    it('propagates client errors', async () => {
      mockClient.getWeatherForecast.mockRejectedValue(new Error('Timeout'));

      await expect(service.getForecast(testCity)).rejects.toThrow('Timeout');
    });
  });
});
