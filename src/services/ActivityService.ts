import { WeatherForecast, Activity, ActivityType, IActivityService } from '../types';

/**
 * Ranks activities based on weather conditions.
 * Pure business logic — no external dependencies, fully unit-testable.
 *
 * Scoring methodology:
 * Each activity uses the NEXT 24 HOURS of hourly data for scoring
 * so the result is actionable (not a 7-day average).
 * Score range: 0–100. Suitable threshold: >= 60.
 */
export class ActivityService implements IActivityService {
  rankActivities(forecast: WeatherForecast): Activity[] {
    const next24h = forecast.hourly.slice(0, 24);

    const activities: Activity[] = [
      this.scoreSkiing(next24h),
      this.scoreSurfing(next24h),
      this.scoreIndoorSightseeing(next24h),
      this.scoreOutdoorSightseeing(next24h),
    ];

    // Sort descending by score
    return activities.sort((a, b) => b.score - a.score);
  }

  // ─── Individual scorers ──────────────────────────────────────────────────────

  private scoreSkiing(hours: WeatherForecast['hourly']): Activity {
    const avgTemp = this.average(hours.map(h => h.temperature2m));
    const avgWind = this.average(hours.map(h => h.windspeed10m));
    const avgSnow = this.average(hours.map(h => h.snowDepth ?? 0));
    const totalPrecip = this.average(hours.map(h => h.precipitation));

    let score = 0;
    const reasons: string[] = [];

    // Note: These thresholds came from researching ski resort operating conditions
    // Most resorts need 30cm base, close lifts above 60km/h winds

    // Temperature: ideal −15°C to −2°C, acceptable −20°C to 2°C
    if (avgTemp >= -20 && avgTemp <= 2) {
      const tempScore = avgTemp <= -2 ? 35 : 20;
      score += tempScore;
      reasons.push(`temperature ${avgTemp.toFixed(1)}°C is ${avgTemp <= -2 ? 'ideal' : 'marginal'} for snow`);
    } else {
      reasons.push(`temperature ${avgTemp.toFixed(1)}°C is too ${avgTemp > 2 ? 'warm' : 'extreme'} for skiing`);
    }

    // Snow depth: ideal > 30 cm
    if (avgSnow >= 30) {
      score += 40;
      reasons.push(`good snow depth (${avgSnow.toFixed(0)} cm)`);
    } else if (avgSnow >= 10) {
      score += 20;
      reasons.push(`moderate snow depth (${avgSnow.toFixed(0)} cm)`);
    } else {
      reasons.push('insufficient snow depth');
    }

    // Wind: dangerous > 60 km/h
    if (avgWind > 60) {
      score = Math.max(0, score - 30);
      reasons.push(`high winds (${avgWind.toFixed(0)} km/h) are dangerous`);
    } else if (avgWind <= 30) {
      score += 15;
      reasons.push('calm winds');
    }

    // Light snowfall is good (fresh powder)
    if (totalPrecip > 0 && totalPrecip <= 2 && avgTemp < 0) {
      score += 10;
      reasons.push('light snowfall expected (fresh powder)');
    }

    score = Math.min(100, Math.max(0, score));

    return {
      type: 'SKIING',
      name: 'Skiing',
      score,
      suitable: score >= 60,
      reason: reasons.join('; '),
    };
  }

  private scoreSurfing(hours: WeatherForecast['hourly']): Activity {
    const avgTemp = this.average(hours.map(h => h.temperature2m));
    const avgWind = this.average(hours.map(h => h.windspeed10m));
    const avgPrecip = this.average(hours.map(h => h.precipitation));

    let score = 0;
    const reasons: string[] = [];

    // TODO: Wave height data would make this much more accurate
    // Open-Meteo has wave_height but only for marine forecasts

    // Temperature: ideal 18–32°C (warm coastal weather)
    if (avgTemp >= 18 && avgTemp <= 32) {
      score += 30;
      reasons.push(`comfortable air temperature (${avgTemp.toFixed(1)}°C)`);
    } else if (avgTemp >= 12) {
      score += 15;
      reasons.push(`cool but manageable temperature (${avgTemp.toFixed(1)}°C)`);
    } else {
      // I surf in Cape Town - can confirm anything below 12°C is brutal without a thick wetsuit
      reasons.push(`cold temperature (${avgTemp.toFixed(1)}°C) makes surfing uncomfortable`);
    }

    // Wind: offshore winds (10–30 km/h) = perfect; too strong = dangerous
    if (avgWind >= 10 && avgWind <= 30) {
      score += 40;
      reasons.push(`ideal wind speed (${avgWind.toFixed(0)} km/h) for waves`);
    } else if (avgWind > 30 && avgWind <= 50) {
      score += 15;
      reasons.push(`strong winds (${avgWind.toFixed(0)} km/h) — experienced surfers only`);
    } else if (avgWind < 10) {
      score += 20;
      reasons.push(`light winds (${avgWind.toFixed(0)} km/h) — flat water likely`);
    } else {
      score = Math.max(0, score - 20);
      reasons.push(`dangerous winds (${avgWind.toFixed(0)} km/h)`);
    }

    // No heavy rain
    if (avgPrecip < 1) {
      score += 20;
      reasons.push('dry conditions');
    } else if (avgPrecip < 5) {
      score += 10;
      reasons.push('light rain expected');
    } else {
      score -= 10;
      reasons.push('heavy rain expected');
    }

    // Clear/cloudy weather bonus
    // weathercode <= 3 means clear to partly cloudy
    // (WMO code interpretation - had to look this up)
    const clearHours = hours.filter(h => h.weathercode <= 3).length;
    if (clearHours / hours.length >= 0.6) {
      score += 10;
      reasons.push('mostly clear skies');
    }

    score = Math.min(100, Math.max(0, score));

    return {
      type: 'SURFING',
      name: 'Surfing',
      score,
      suitable: score >= 60,
      reason: reasons.join('; '),
    };
  }

  private scoreIndoorSightseeing(hours: WeatherForecast['hourly']): Activity {
    const avgPrecip = this.average(hours.map(h => h.precipitation));
    const avgTemp = this.average(hours.map(h => h.temperature2m));
    const avgWind = this.average(hours.map(h => h.windspeed10m));

    let score = 50; // Indoor activities start with a neutral baseline
    const reasons: string[] = [];

    // This used to be 0 but that didn't make sense - museums are always open!
    // Changed to 50 after testing with Cape Town summer data

    // Bad outdoor weather BOOSTS indoor score
    if (avgPrecip >= 5) {
      score += 30;
      reasons.push(`heavy rain (${avgPrecip.toFixed(1)} mm/h) makes indoors appealing`);
    } else if (avgPrecip >= 2) {
      score += 15;
      reasons.push('moderate rain expected');
    }

    // Could argue that 35°C isn't "extreme" in some places
    // but I'm optimizing for general comfort level

    if (avgTemp < 0) {
      score += 20;
      reasons.push(`freezing temperatures (${avgTemp.toFixed(1)}°C) favour indoor activities`);
    } else if (avgTemp > 35) {
      score += 15;
      reasons.push(`extreme heat (${avgTemp.toFixed(1)}°C) — air-conditioned venues recommended`);
    }

    if (avgWind > 60) {
      score += 15;
      reasons.push('strong winds make outdoor activities unsafe');
    }

    // Great outdoor weather slightly reduces indoor appeal
    if (avgPrecip < 1 && avgTemp >= 18 && avgTemp <= 28 && avgWind < 20) {
      score -= 15;
      reasons.push('beautiful outdoor conditions — consider going outside!');
    }

    // Edge case: if literally nothing qualified above, give generic message
    if (reasons.length === 0) {
      reasons.push('moderate conditions — both indoor and outdoor activities viable');
    }

    score = Math.min(100, Math.max(0, score));

    return {
      type: 'INDOOR_SIGHTSEEING',
      name: 'Indoor Sightseeing',
      score,
      suitable: score >= 60,
      reason: reasons.join('; '),
    };
  }

  private scoreOutdoorSightseeing(hours: WeatherForecast['hourly']): Activity {
    const avgTemp = this.average(hours.map(h => h.temperature2m));
    const avgWind = this.average(hours.map(h => h.windspeed10m));
    const avgPrecip = this.average(hours.map(h => h.precipitation));
    const clearHours = hours.filter(h => h.weathercode <= 3).length;
    const clearRatio = clearHours / Math.max(hours.length, 1);

    let score = 0;
    const reasons: string[] = [];

    // Temperature: ideal 15–28°C
    if (avgTemp >= 15 && avgTemp <= 28) {
      score += 35;
      reasons.push(`pleasant temperature (${avgTemp.toFixed(1)}°C)`);
    } else if (avgTemp >= 5 && avgTemp < 15) {
      score += 20;
      reasons.push(`cool but walkable (${avgTemp.toFixed(1)}°C) — bring a jacket`);
    } else if (avgTemp > 28 && avgTemp <= 35) {
      score += 15;
      reasons.push(`warm (${avgTemp.toFixed(1)}°C) — stay hydrated`);
    } else {
      reasons.push(`temperature (${avgTemp.toFixed(1)}°C) is not ideal for outdoor sightseeing`);
    }

    // Clear/partly cloudy weather
    if (clearRatio >= 0.7) {
      score += 30;
      reasons.push('mostly clear skies');
    } else if (clearRatio >= 0.4) {
      score += 15;
      reasons.push('partly cloudy');
    } else {
      reasons.push('overcast conditions');
    }

    // Precipitation
    if (avgPrecip < 0.5) {
      score += 25;
      reasons.push('dry conditions');
    } else if (avgPrecip < 2) {
      score += 10;
      reasons.push('light rain possible — bring an umbrella');
    } else {
      score -= 15;
      reasons.push(`rain expected (${avgPrecip.toFixed(1)} mm/h)`);
    }

    // Wind
    if (avgWind > 50) {
      score -= 20;
      reasons.push(`strong winds (${avgWind.toFixed(0)} km/h)`);
    } else if (avgWind < 20) {
      score += 10;
      reasons.push('calm winds');
    }

    score = Math.min(100, Math.max(0, score));

    return {
      type: 'OUTDOOR_SIGHTSEEING',
      name: 'Outdoor Sightseeing',
      score,
      suitable: score >= 60,
      reason: reasons.join('; '),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}
