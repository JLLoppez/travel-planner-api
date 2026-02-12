import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../src/graphql/schema/typeDefs';
import { buildResolvers } from '../../src/graphql/resolvers';
import { GeocodingService } from '../../src/services/GeocodingService';
import { WeatherService } from '../../src/services/WeatherService';
import { ActivityService } from '../../src/services/ActivityService';
import { City, WeatherForecast } from '../../src/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/GeocodingService');
jest.mock('../../src/services/WeatherService');

const mockGeocodingService = new GeocodingService(null as any) as jest.Mocked<GeocodingService>;
const mockWeatherService = new WeatherService(null as any) as jest.Mocked<WeatherService>;
const activityService = new ActivityService(); // real — no deps

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const capeTown: City = {
  id: 2193733,
  name: 'Cape Town',
  country: 'South Africa',
  countryCode: 'ZA',
  latitude: -33.9258,
  longitude: 18.4232,
  timezone: 'Africa/Johannesburg',
  population: 3433441,
};

const makeHour = (i: number) => ({
  time: `2026-02-11T${String(i).padStart(2, '0')}:00`,
  temperature2m: 22,
  windspeed10m: 12,
  precipitation: 0,
  weathercode: 1,
  snowDepth: 0,
});

const mockForecast: WeatherForecast = {
  city: capeTown,
  timezone: 'Africa/Johannesburg',
  current: makeHour(14),
  hourly: Array.from({ length: 24 }, (_, i) => makeHour(i)),
  daily: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-02-${String(11 + i).padStart(2, '0')}`,
    temperatureMax: 26,
    temperatureMin: 18,
    precipitationSum: 0,
    windspeedMax: 20,
    weathercode: 1,
  })),
};

// ─── Server setup ─────────────────────────────────────────────────────────────

let server: ApolloServer;

beforeAll(async () => {
  const resolvers = buildResolvers({
    geocodingService: mockGeocodingService,
    weatherService: mockWeatherService,
    activityService,
  });

  server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGeocodingService.searchCities.mockResolvedValue([capeTown]);
  mockWeatherService.getForecast.mockResolvedValue(mockForecast);
});

// ─── Query helpers ────────────────────────────────────────────────────────────

const execute = (query: string, variables?: Record<string, unknown>) =>
  server.executeOperation({ query, variables });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GraphQL Integration — citySuggestions', () => {
  const QUERY = /* GraphQL */ `
    query CitySuggestions($query: String!, $count: Int) {
      citySuggestions(query: $query, count: $count) {
        id
        name
        country
        countryCode
        latitude
        longitude
        timezone
        population
        admin1
      }
    }
  `;

  it('returns city suggestions for a valid query', async () => {
    const res = await execute(QUERY, { query: 'Cape' });
    expect(res.body.kind).toBe('single');
    if (res.body.kind !== 'single') return;

    expect(res.body.singleResult.errors).toBeUndefined();
    const cities = res.body.singleResult.data?.citySuggestions as City[];
    expect(cities).toHaveLength(1);
    expect(cities[0].name).toBe('Cape Town');
    expect(cities[0].countryCode).toBe('ZA');
  });

  it('respects the count argument', async () => {
    await execute(QUERY, { query: 'Cape', count: 5 });
    expect(mockGeocodingService.searchCities).toHaveBeenCalledWith('Cape', 5);
  });

  it('returns empty array for a short query', async () => {
    mockGeocodingService.searchCities.mockResolvedValue([]);
    const res = await execute(QUERY, { query: 'C' });
    if (res.body.kind !== 'single') return;

    const cities = res.body.singleResult.data?.citySuggestions;
    expect(cities).toEqual([]);
  });

  it('returns a GraphQL error when the service throws', async () => {
    mockGeocodingService.searchCities.mockRejectedValue(new Error('Network error'));
    const res = await execute(QUERY, { query: 'Paris' });
    if (res.body.kind !== 'single') return;

    expect(res.body.singleResult.errors).toBeDefined();
    expect(res.body.singleResult.errors![0].message).toMatch(/Network error/);
  });
});

describe('GraphQL Integration — weatherForecast', () => {
  const QUERY = /* GraphQL */ `
    query WeatherForecast($latitude: Float!, $longitude: Float!, $timezone: String!) {
      weatherForecast(latitude: $latitude, longitude: $longitude, timezone: $timezone) {
        timezone
        current {
          temperature2m
          windspeed10m
          precipitation
          weathercode
        }
        hourly {
          time
          temperature2m
        }
        daily {
          date
          temperatureMax
          temperatureMin
        }
      }
    }
  `;

  const vars = { latitude: -33.9258, longitude: 18.4232, timezone: 'Africa/Johannesburg' };

  it('returns a valid forecast with current, hourly, and daily data', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    expect(res.body.singleResult.errors).toBeUndefined();
    const forecast = res.body.singleResult.data?.weatherForecast as any;
    expect(forecast.timezone).toBe('Africa/Johannesburg');
    expect(forecast.current.temperature2m).toBe(22);
    expect(forecast.hourly).toHaveLength(24);
    expect(forecast.daily).toHaveLength(7);
  });

  it('passes correct coords to the weather service', async () => {
    await execute(QUERY, vars);
    expect(mockWeatherService.getForecast).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -33.9258, longitude: 18.4232 }),
    );
  });
});

describe('GraphQL Integration — activityRanking', () => {
  const QUERY = /* GraphQL */ `
    query ActivityRanking($latitude: Float!, $longitude: Float!, $timezone: String!) {
      activityRanking(latitude: $latitude, longitude: $longitude, timezone: $timezone) {
        rankedAt
        city {
          latitude
          longitude
        }
        activities {
          type
          name
          score
          suitable
          reason
        }
        forecast {
          current {
            temperature2m
          }
        }
      }
    }
  `;

  const vars = { latitude: -33.9258, longitude: 18.4232, timezone: 'Africa/Johannesburg' };

  it('returns 4 ranked activities', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    expect(res.body.singleResult.errors).toBeUndefined();
    const ranking = res.body.singleResult.data?.activityRanking as any;
    expect(ranking.activities).toHaveLength(4);
  });

  it('activities are sorted by score descending', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    const activities = (res.body.singleResult.data?.activityRanking as any).activities;
    for (let i = 0; i < activities.length - 1; i++) {
      expect(activities[i].score).toBeGreaterThanOrEqual(activities[i + 1].score);
    }
  });

  it('includes all four activity types', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    const types = (res.body.singleResult.data?.activityRanking as any).activities.map(
      (a: any) => a.type,
    );
    expect(types).toContain('SKIING');
    expect(types).toContain('SURFING');
    expect(types).toContain('INDOOR_SIGHTSEEING');
    expect(types).toContain('OUTDOOR_SIGHTSEEING');
  });

  it('includes an ISO rankedAt timestamp', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    const rankedAt = (res.body.singleResult.data?.activityRanking as any).rankedAt;
    expect(() => new Date(rankedAt)).not.toThrow();
    expect(new Date(rankedAt).toISOString()).toBe(rankedAt);
  });

  it('embeds the forecast in the ranking response', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    const ranking = res.body.singleResult.data?.activityRanking as any;
    expect(ranking.forecast.current.temperature2m).toBe(22);
  });

  it('each activity has a non-empty reason', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    const activities = (res.body.singleResult.data?.activityRanking as any).activities;
    activities.forEach((a: any) => {
      expect(a.reason.trim().length).toBeGreaterThan(0);
    });
  });

  it('scores are in range 0–100', async () => {
    const res = await execute(QUERY, vars);
    if (res.body.kind !== 'single') return;

    const activities = (res.body.singleResult.data?.activityRanking as any).activities;
    activities.forEach((a: any) => {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
    });
  });
});
