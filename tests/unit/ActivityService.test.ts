import { ActivityService } from '../../src/services/ActivityService';
import { WeatherForecast, HourlyWeather, DailyWeather } from '../../src/types';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const makeCity = () => ({
  id: 1,
  name: 'Test City',
  country: 'Test Country',
  countryCode: 'TC',
  latitude: 0,
  longitude: 0,
  timezone: 'UTC',
});

const makeHour = (overrides: Partial<HourlyWeather> = {}): HourlyWeather => ({
  time: '2026-01-01T00:00',
  temperature2m: 20,
  windspeed10m: 15,
  precipitation: 0,
  weathercode: 1,
  snowDepth: 0,
  ...overrides,
});

const makeHours = (overrides: Partial<HourlyWeather> = {}, count = 24): HourlyWeather[] =>
  Array.from({ length: count }, (_, i) =>
    makeHour({ ...overrides, time: `2026-01-01T${String(i).padStart(2, '0')}:00` }),
  );

const makeDaily = (overrides = {}): DailyWeather => ({
  date: '2026-01-01',
  temperatureMax: 22,
  temperatureMin: 15,
  precipitationSum: 0,
  windspeedMax: 20,
  weathercode: 1,
  ...overrides,
});

const makeForecast = (hourlyOverrides: Partial<HourlyWeather> = {}): WeatherForecast => ({
  city: makeCity(),
  current: makeHour(hourlyOverrides),
  hourly: makeHours(hourlyOverrides),
  daily: Array.from({ length: 7 }, () => makeDaily()),
  timezone: 'UTC',
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(() => {
    service = new ActivityService();
  });

  describe('rankActivities', () => {
    it('returns exactly 4 activities', () => {
      const result = service.rankActivities(makeForecast());
      expect(result).toHaveLength(4);
    });

    it('returns activities sorted by score descending', () => {
      const result = service.rankActivities(makeForecast());
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
      }
    });

    it('includes all four activity types', () => {
      const result = service.rankActivities(makeForecast());
      const types = result.map(a => a.type);
      expect(types).toContain('SKIING');
      expect(types).toContain('SURFING');
      expect(types).toContain('INDOOR_SIGHTSEEING');
      expect(types).toContain('OUTDOOR_SIGHTSEEING');
    });

    it('all scores are in range 0–100', () => {
      const result = service.rankActivities(makeForecast());
      result.forEach(a => {
        expect(a.score).toBeGreaterThanOrEqual(0);
        expect(a.score).toBeLessThanOrEqual(100);
      });
    });

    it('sets suitable=true when score >= 60', () => {
      // Ideal outdoor sightseeing conditions
      const forecast = makeForecast({ temperature2m: 22, windspeed10m: 10, precipitation: 0, weathercode: 1 });
      const result = service.rankActivities(forecast);
      const outdoor = result.find(a => a.type === 'OUTDOOR_SIGHTSEEING')!;
      expect(outdoor.suitable).toBe(outdoor.score >= 60);
    });
  });

  // ─── Skiing ──────────────────────────────────────────────────────────────────

  describe('Skiing', () => {
    it('scores high in ideal ski conditions', () => {
      const forecast = makeForecast({
        temperature2m: -8,
        windspeed10m: 20,
        precipitation: 0.5,
        snowDepth: 50,
      });
      const skiing = service.rankActivities(forecast).find(a => a.type === 'SKIING')!;
      expect(skiing.score).toBeGreaterThanOrEqual(70);
      expect(skiing.suitable).toBe(true);
    });

    it('scores low when temperature is above 0°C and no snow', () => {
      const forecast = makeForecast({
        temperature2m: 15,
        snowDepth: 0,
        precipitation: 0,
      });
      const skiing = service.rankActivities(forecast).find(a => a.type === 'SKIING')!;
      expect(skiing.score).toBeLessThan(40);
      expect(skiing.suitable).toBe(false);
    });

    it('penalises dangerous wind speeds', () => {
      const calmForecast = makeForecast({ temperature2m: -5, snowDepth: 40, windspeed10m: 15 });
      const windyForecast = makeForecast({ temperature2m: -5, snowDepth: 40, windspeed10m: 80 });
      const calmScore = service.rankActivities(calmForecast).find(a => a.type === 'SKIING')!.score;
      const windyScore = service.rankActivities(windyForecast).find(a => a.type === 'SKIING')!.score;
      expect(calmScore).toBeGreaterThan(windyScore);
    });

    it('includes snow depth in the reason string', () => {
      const forecast = makeForecast({ temperature2m: -5, snowDepth: 45 });
      const skiing = service.rankActivities(forecast).find(a => a.type === 'SKIING')!;
      expect(skiing.reason.toLowerCase()).toMatch(/snow/);
    });
  });

  // ─── Surfing ─────────────────────────────────────────────────────────────────

  describe('Surfing', () => {
    it('scores high with warm temperature and moderate wind', () => {
      const forecast = makeForecast({
        temperature2m: 25,
        windspeed10m: 18,
        precipitation: 0,
        weathercode: 1,
      });
      const surfing = service.rankActivities(forecast).find(a => a.type === 'SURFING')!;
      expect(surfing.score).toBeGreaterThanOrEqual(70);
      expect(surfing.suitable).toBe(true);
    });

    it('scores lower in cold, rainy, high-wind conditions', () => {
      const forecast = makeForecast({
        temperature2m: 5,
        windspeed10m: 70,
        precipitation: 10,
      });
      const surfing = service.rankActivities(forecast).find(a => a.type === 'SURFING')!;
      expect(surfing.score).toBeLessThan(40);
    });

    it('scores lower in freezing temperatures', () => {
      const cold = makeForecast({ temperature2m: -5, windspeed10m: 15, precipitation: 0 });
      const warm = makeForecast({ temperature2m: 25, windspeed10m: 15, precipitation: 0 });
      const coldScore = service.rankActivities(cold).find(a => a.type === 'SURFING')!.score;
      const warmScore = service.rankActivities(warm).find(a => a.type === 'SURFING')!.score;
      expect(warmScore).toBeGreaterThan(coldScore);
    });
  });

  // ─── Indoor Sightseeing ───────────────────────────────────────────────────────

  describe('Indoor Sightseeing', () => {
    it('scores high during heavy rain', () => {
      const forecast = makeForecast({ precipitation: 10, temperature2m: 12 });
      const indoor = service.rankActivities(forecast).find(a => a.type === 'INDOOR_SIGHTSEEING')!;
      expect(indoor.score).toBeGreaterThanOrEqual(60);
      expect(indoor.suitable).toBe(true);
    });

    it('scores high during freezing temperatures', () => {
      const forecast = makeForecast({ temperature2m: -10, precipitation: 0, windspeed10m: 10 });
      const indoor = service.rankActivities(forecast).find(a => a.type === 'INDOOR_SIGHTSEEING')!;
      expect(indoor.score).toBeGreaterThanOrEqual(60);
    });

    it('scores lower in perfect outdoor weather', () => {
      const perfect = makeForecast({
        temperature2m: 22,
        precipitation: 0,
        windspeed10m: 10,
        weathercode: 1,
      });
      const rainy = makeForecast({ precipitation: 8, temperature2m: 12 });
      const perfectScore = service.rankActivities(perfect).find(a => a.type === 'INDOOR_SIGHTSEEING')!.score;
      const rainyScore = service.rankActivities(rainy).find(a => a.type === 'INDOOR_SIGHTSEEING')!.score;
      expect(rainyScore).toBeGreaterThan(perfectScore);
    });
  });

  // ─── Outdoor Sightseeing ──────────────────────────────────────────────────────

  describe('Outdoor Sightseeing', () => {
    it('scores high in ideal outdoor conditions', () => {
      const forecast = makeForecast({
        temperature2m: 22,
        windspeed10m: 10,
        precipitation: 0,
        weathercode: 1,
      });
      const outdoor = service.rankActivities(forecast).find(a => a.type === 'OUTDOOR_SIGHTSEEING')!;
      expect(outdoor.score).toBeGreaterThanOrEqual(70);
      expect(outdoor.suitable).toBe(true);
    });

    it('scores low in heavy rain and high wind', () => {
      const forecast = makeForecast({
        precipitation: 8,
        windspeed10m: 65,
        weathercode: 65,
      });
      const outdoor = service.rankActivities(forecast).find(a => a.type === 'OUTDOOR_SIGHTSEEING')!;
      expect(outdoor.score).toBeLessThan(40);
      expect(outdoor.suitable).toBe(false);
    });

    it('outdoor scores higher than indoor in perfect weather', () => {
      const forecast = makeForecast({
        temperature2m: 22,
        windspeed10m: 10,
        precipitation: 0,
        weathercode: 1,
      });
      const results = service.rankActivities(forecast);
      const outdoor = results.find(a => a.type === 'OUTDOOR_SIGHTSEEING')!.score;
      const indoor = results.find(a => a.type === 'INDOOR_SIGHTSEEING')!.score;
      expect(outdoor).toBeGreaterThan(indoor);
    });

    it('indoor scores higher than outdoor in heavy rain', () => {
      const forecast = makeForecast({ precipitation: 10, temperature2m: 12, windspeed10m: 15 });
      const results = service.rankActivities(forecast);
      const outdoor = results.find(a => a.type === 'OUTDOOR_SIGHTSEEING')!.score;
      const indoor = results.find(a => a.type === 'INDOOR_SIGHTSEEING')!.score;
      expect(indoor).toBeGreaterThan(outdoor);
      // This test exists because I initially had indoor baseline at 0
      // and it was scoring lower than outdoor even in torrential rain!
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles empty hourly array gracefully', () => {
      const forecast: WeatherForecast = {
        ...makeForecast(),
        hourly: [],
      };
      expect(() => service.rankActivities(forecast)).not.toThrow();
    });

    it('handles missing snowDepth (undefined) without crashing', () => {
      const forecast = makeForecast({ snowDepth: undefined });
      expect(() => service.rankActivities(forecast)).not.toThrow();
    });

    it('all activities have non-empty reason strings', () => {
      const result = service.rankActivities(makeForecast());
      result.forEach(a => {
        expect(a.reason.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
