import { OpenMeteoClient } from '../datasources/OpenMeteoClient';
import {
  City,
  WeatherForecast,
  HourlyWeather,
  DailyWeather,
  IWeatherService,
  OpenMeteoForecastResponse,
} from '../types';

export class WeatherService implements IWeatherService {
  constructor(private readonly client: OpenMeteoClient) {}

  async getForecast(city: City): Promise<WeatherForecast> {
    const raw = await this.client.getWeatherForecast(
      city.latitude,
      city.longitude,
      city.timezone,
    );

    return this.mapToForecast(city, raw);
  }

  private mapToForecast(city: City, raw: OpenMeteoForecastResponse): WeatherForecast {
    const current: HourlyWeather = {
      time: raw.current.time,
      temperature2m: raw.current.temperature_2m,
      windspeed10m: raw.current.windspeed_10m,
      precipitation: raw.current.precipitation,
      weathercode: raw.current.weathercode,
    };

    const hourly: HourlyWeather[] = raw.hourly.time.map((time, i) => ({
      time,
      temperature2m: raw.hourly.temperature_2m[i],
      windspeed10m: raw.hourly.windspeed_10m[i],
      precipitation: raw.hourly.precipitation[i],
      weathercode: raw.hourly.weathercode[i],
      snowDepth: raw.hourly.snow_depth?.[i],
    }));

    const daily: DailyWeather[] = raw.daily.time.map((date, i) => ({
      date,
      temperatureMax: raw.daily.temperature_2m_max[i],
      temperatureMin: raw.daily.temperature_2m_min[i],
      precipitationSum: raw.daily.precipitation_sum[i],
      windspeedMax: raw.daily.windspeed_10m_max[i],
      weathercode: raw.daily.weathercode[i],
    }));

    return {
      city,
      current,
      hourly,
      daily,
      timezone: raw.timezone,
    };
  }
}
