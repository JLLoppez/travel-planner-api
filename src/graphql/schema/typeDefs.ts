export const typeDefs = /* GraphQL */ `
  """
  A city returned from geocoding search.
  """
  type City {
    id: ID!
    name: String!
    country: String!
    countryCode: String!
    latitude: Float!
    longitude: Float!
    timezone: String!
    population: Int
    "State or province, if available"
    admin1: String
  }

  """
  Weather data for a single hourly time slot.
  """
  type HourlyWeather {
    time: String!
    "Temperature at 2 m above ground in °C"
    temperature2m: Float!
    "Wind speed at 10 m above ground in km/h"
    windspeed10m: Float!
    "Precipitation in mm"
    precipitation: Float!
    "WMO weather interpretation code"
    weathercode: Int!
    "Snow depth in metres (when available)"
    snowDepth: Float
  }

  """
  Aggregated daily weather summary.
  """
  type DailyWeather {
    date: String!
    temperatureMax: Float!
    temperatureMin: Float!
    "Total precipitation for the day in mm"
    precipitationSum: Float!
    windspeedMax: Float!
    weathercode: Int!
  }

  """
  Full weather forecast for a city.
  """
  type WeatherForecast {
    city: City!
    "Current conditions"
    current: HourlyWeather!
    "Hourly data for the next 7 days"
    hourly: [HourlyWeather!]!
    "Daily summaries for the next 7 days"
    daily: [DailyWeather!]!
    timezone: String!
  }

  """
  The available activity types for ranking.
  """
  enum ActivityType {
    SKIING
    SURFING
    INDOOR_SIGHTSEEING
    OUTDOOR_SIGHTSEEING
  }

  """
  A scored, ranked activity recommendation.
  """
  type Activity {
    type: ActivityType!
    name: String!
    "Score from 0 (unsuitable) to 100 (perfect conditions)"
    score: Int!
    "True when score >= 60"
    suitable: Boolean!
    "Human-readable explanation of the score"
    reason: String!
  }

  """
  Activity rankings with full forecast context.
  """
  type ActivityRanking {
    city: City!
    forecast: WeatherForecast!
    "Activities sorted by score descending"
    activities: [Activity!]!
    "ISO timestamp of when the ranking was generated"
    rankedAt: String!
  }

  type Query {
    """
    Suggest cities matching a partial or complete query string.
    Returns up to \`count\` results (default 10, max 20).
    """
    citySuggestions(query: String!, count: Int): [City!]!

    """
    Retrieve a 7-day weather forecast for the specified city coordinates.
    """
    weatherForecast(latitude: Float!, longitude: Float!, timezone: String!): WeatherForecast!

    """
    Fetch the weather forecast for a city and rank all activities by suitability.
    This is the primary composite query for the travel planner.
    """
    activityRanking(latitude: Float!, longitude: Float!, timezone: String!): ActivityRanking!
  }
`;
